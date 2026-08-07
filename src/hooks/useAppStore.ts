import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getDailySeed } from '../lib/identity';
import { Direction, DEFAULT_DIRECTION } from '../lib/theme';
import { Lang } from '../lib/copy';
import { IdentityKind } from '../lib/identity';
import { ensureAnonAuth, upsertUser, updateUser, subscribeToUser, claimDailyRewardServer, spendWicks } from '../lib/db';
import { isGuest } from '../lib/auth';
import { safeWicks } from '../lib/num';
import { FREE_IDENTITY_KINDS, VIGIL_IDENTITY_KINDS } from '../lib/identityStyles';
import { localProductDayKey, localProductWeekKey } from '../lib/timeBuckets';
import { connectionPolicy } from '../lib/personaPolicy';

let _deviceId: string | null = null;
async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  const stored = await AsyncStorage.getItem('device_id');
  if (stored) { _deviceId = stored; return stored; }
  // Full-entropy id: the seed digest broadcast to others is only as strong as
  // this preimage, and Math.random()+timestamp (~57 bits) is GPU-guessable.
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem('device_id', id);
  _deviceId = id;
  return id;
}

export type Gender = 'female' | 'male';

/** Accept only values that still exist in the profile UI and product policy. */
export function normalizeGender(value: unknown): Gender | null {
  return value === 'female' || value === 'male' ? value : null;
}

interface AppState {
  deviceId: string;
  userId: string;
  seed: string;
  direction: Direction;
  lang: Lang;
  identityKind: IdentityKind;
  onboardingDone: boolean;
  setupDone: boolean;
  dbSynced: boolean;
  wicks: number;
  vigil: boolean;
  isBanned: boolean;
  banReason: string | null;
  banExpiresAt: number | null;
  lastRewardDate: string | null;
  rewardPending: boolean;
  gender: Gender | null;
  ageBracket: string | null;
  relationshipStatus: string | null;
  relationshipShape: string | null;
  seeking: string[];
  boundary: string | null;
  freeTimes: string[];
  region: string | null;
  quote: string | null;
  loftVisible: boolean;
  autoFilter: boolean;
  slowMode: boolean;
  conversationsToday: number;
  peopleTodayCount: number;
  /** Free connections used today (random matches + room invites), resets daily. */
  connectionsToday: number;
  /** Free rooms (火盆) opened today, resets daily. */
  roomsToday: number;
  freeMatchesUsed: number;
  loftFreeUsed: number;
  /** Local Monday (03:00 boundary) when the free weekly Loft entry was used. */
  loftFreeWeek: string | null;
  /** @deprecated Legacy marker from the old guest taste-match flow. */
  guestMatchUsed: boolean;
}

/**
 * Free registered users get this many free "connections" PER DAY, shared across
 * random matches AND room invites (tapping someone in a brazier to chat). Beyond
 * the daily quota, each connection costs MATCH_WICK_COST. Tracked locally per day
 * (resets at local 03:00 via _resetDailyCountersIfNeeded) so it doesn't fight
 * the increase-only Firestore rule that the old lifetime counter needed.
 */
export const FREE_DAILY_CONNECTIONS = 10;
export const MATCH_WICK_COST = 1;
/** Free users get this many free room-opens (火盆) per day; beyond that costs wicks. */
export const FREE_DAILY_ROOMS = 1;
/** Free users pay this to open a room; Vigil opens rooms for free. */
export const ROOM_CREATE_COST = 2;
/** @deprecated Legacy constant — the live Loft gate is a WEEKLY free entry
 *  (see canEnterLoft / loftFreeWeek), not a lifetime count. Kept only to avoid
 *  churn; no code reads it. */
export const FREE_LOFT_ALLOWANCE = 1;

let _state: AppState = {
  deviceId: '', userId: '', seed: 'default', direction: DEFAULT_DIRECTION,
  lang: 'zh', identityKind: 'sigil', onboardingDone: false, setupDone: false,
  dbSynced: false, wicks: 3, vigil: false, isBanned: false, banReason: null,
  banExpiresAt: null, lastRewardDate: null, rewardPending: false,
  gender: null, ageBracket: null, relationshipStatus: null, relationshipShape: null, seeking: [],
  boundary: null, freeTimes: [], region: null, quote: null, loftVisible: true,
  autoFilter: false, slowMode: false, conversationsToday: 0, peopleTodayCount: 0,
  connectionsToday: 0, roomsToday: 0, freeMatchesUsed: 0, loftFreeUsed: 0, loftFreeWeek: null,
  guestMatchUsed: false,
};

const _listeners = new Set<() => void>();
function notify() { _listeners.forEach(fn => fn()); }

export async function initStore() {
  const deviceId = await getDeviceId();
  const seed = await getDailySeed(deviceId);
  const [storedDir, storedDone, storedSetup, storedWicks, storedVigil, storedLang, storedGender, storedAge, storedRelation, storedShape, storedSeeking, storedBoundary, storedFreeTimes, storedRegion, storedQuote, storedLoftVisible, storedAutoFilter, storedSlowMode, storedConvToday, storedPeopleToday, storedIdentityKind, storedFreeMatches, storedLoftFree, storedConnToday, storedRoomsToday, storedLoftFreeWeek, storedGuestMatchUsed] = await Promise.all([
    AsyncStorage.getItem('direction') as Promise<Direction | null>,
    AsyncStorage.getItem('onboarding_done'),
    AsyncStorage.getItem('setup_done'),
    AsyncStorage.getItem('wicks'),
    AsyncStorage.getItem('vigil'),
    AsyncStorage.getItem('lang') as Promise<Lang | null>,
    AsyncStorage.getItem('gender'),
    AsyncStorage.getItem('ageBracket'),
    AsyncStorage.getItem('relationshipStatus'),
    AsyncStorage.getItem('relationshipShape'),
    AsyncStorage.getItem('seeking'),
    AsyncStorage.getItem('boundary'),
    AsyncStorage.getItem('freeTimes'),
    AsyncStorage.getItem('region'),
    AsyncStorage.getItem('quote'),
    AsyncStorage.getItem('loftVisible'),
    AsyncStorage.getItem('autoFilter'),
    AsyncStorage.getItem('slowMode'),
    AsyncStorage.getItem('conversationsToday'),
    AsyncStorage.getItem('peopleTodayCount'),
    AsyncStorage.getItem('identityKind') as Promise<IdentityKind | null>,
    AsyncStorage.getItem('freeMatchesUsed'),
    AsyncStorage.getItem('loftFreeUsed'),
    AsyncStorage.getItem('connectionsToday'),
    AsyncStorage.getItem('roomsToday'),
    AsyncStorage.getItem('loftFreeWeek'),
    AsyncStorage.getItem('guestMatchUsed'),
  ]);
  const normalizedStoredGender = normalizeGender(storedGender);
  if (storedGender != null && normalizedStoredGender === null) {
    await Promise.all([
      AsyncStorage.removeItem('gender'),
      AsyncStorage.setItem('setup_done', '0'),
    ]);
  }
  _state = {
    ..._state, deviceId, seed,
    direction: storedDir || DEFAULT_DIRECTION, lang: storedLang || 'zh',
    onboardingDone: storedDone === '1', setupDone: storedSetup === '1' && normalizedStoredGender !== null,
    wicks: storedWicks != null ? safeWicks(storedWicks) : 3, vigil: storedVigil === '1',
    gender: normalizedStoredGender, ageBracket: storedAge, relationshipStatus: storedRelation,
    relationshipShape: storedShape,
    seeking: storedSeeking ? JSON.parse(storedSeeking) : [],
    boundary: storedBoundary,
    freeTimes: storedFreeTimes ? JSON.parse(storedFreeTimes) : [],
    region: storedRegion, quote: storedQuote,
    loftVisible: storedLoftVisible !== '0',
    identityKind: storedIdentityKind || 'sigil',
    // Opt-in: the filter is OFF unless the user explicitly turned it on. (It used
    // to default on and silently blocked ordinary venting — see filter.ts note.)
    autoFilter: storedAutoFilter === '1',
    slowMode: storedSlowMode === '1',
    conversationsToday: storedConvToday ? parseInt(storedConvToday, 10) : 0,
    peopleTodayCount: storedPeopleToday ? parseInt(storedPeopleToday, 10) : 0,
    connectionsToday: storedConnToday ? parseInt(storedConnToday, 10) : 0,
    roomsToday: storedRoomsToday ? parseInt(storedRoomsToday, 10) : 0,
    freeMatchesUsed: storedFreeMatches ? parseInt(storedFreeMatches, 10) : 0,
    loftFreeUsed: storedLoftFree ? parseInt(storedLoftFree, 10) : 0,
    loftFreeWeek: storedLoftFreeWeek ?? null,
    guestMatchUsed: storedGuestMatchUsed === '1',
  };
  notify();
  _resetDailyCountersIfNeeded();
  _syncWithFirebase(deviceId, seed);
}

let _userUnsubscribe: (() => void) | null = null;

// Cold-start weak-network self-heal. If the first anonymous sign-in / sync fails
// (a momentary blip the instant the app opens), a new user would otherwise sit
// on a working-looking UI with no uid — matching and posting fail silently until
// they manually relaunch. So we retry the background sync with exponential
// backoff. Monotonic cap (no infinite loop on a truly offline device); a live
// dbSynced guard skips the retry if some other path already recovered.
let _syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
let _syncRetryCount = 0;
const MAX_SYNC_RETRIES = 3;

function _scheduleFirebaseRetry(
  deviceId: string,
  seed: string,
  options: { preserveLocalSetup?: boolean },
) {
  if (_syncRetryTimer || _syncRetryCount >= MAX_SYNC_RETRIES) return;
  const delay = 2000 * Math.pow(2, _syncRetryCount); // 2s → 4s → 8s
  _syncRetryCount++;
  _syncRetryTimer = setTimeout(() => {
    _syncRetryTimer = null;
    if (!_state.dbSynced) _syncWithFirebase(deviceId, seed, options);
  }, delay);
}

async function _syncWithFirebase(
  deviceId: string,
  seed: string,
  options: { preserveLocalSetup?: boolean } = {},
) {
  try {
    const userId = await ensureAnonAuth();
    const dbUser = await upsertUser({ userId, deviceId, seed, lang: _state.lang, direction: _state.direction });
    if (dbUser) {
      const today = new Date().toISOString().slice(0, 10);
      const lastReward = (dbUser as any).lastRewardDate ?? null;
      const serverDirection: Direction =
        dbUser.direction === 'mist' || dbUser.direction === 'nocturne' || dbUser.direction === 'ink'
          ? dbUser.direction
          : _state.direction;
      const serverLang: Lang = dbUser.lang === 'en' ? 'en' : 'zh';
      const clearMissingAccountField = options.preserveLocalSetup === false;
      const hasServerField = (key: string) => Object.prototype.hasOwnProperty.call(dbUser, key);
      const serverNullable = (key: string, local: string | null): string | null =>
        hasServerField(key) ? ((dbUser as any)[key] ?? null) : local;
      const persistNullable = (key: string, value: string | null | undefined) => {
        if (value != null && value !== '') return AsyncStorage.setItem(key, value);
        // Explicit null means the user cleared the field. A truly absent field
        // is only preserved for a legacy document during normal startup.
        if (hasServerField(key) || clearMissingAccountField) return AsyncStorage.removeItem(key);
        return Promise.resolve();
      };
      const rawServerGender = serverNullable('gender', _state.gender);
      const serverGender = normalizeGender(rawServerGender);
      const serverSetupDone = options.preserveLocalSetup === false
        ? dbUser.setupDone
        : dbUser.setupDone || _state.setupDone;
      const setupDone = serverSetupDone && serverGender !== null;
      _state = {
        // wicks: coerce through safeWicks so a missing/corrupt ("undefined"/NaN)
        // field can never surface as NaN in the UI or get re-persisted.
        ..._state, userId, dbSynced: true, direction: serverDirection, lang: serverLang,
        wicks: safeWicks(dbUser.wicks), vigil: dbUser.vigil,
        // setupDone is sticky: once finished locally, a fresh/incomplete server
        // doc must never force the user to fill in their profile again.
        setupDone,
        isBanned: dbUser.isBanned, banReason: dbUser.banReason,
        banExpiresAt: (dbUser as any).banExpiresAt?.toMillis?.() ?? null,
        lastRewardDate: lastReward, rewardPending: lastReward !== today,
        gender: serverGender,
        ageBracket: serverNullable('ageBracket', _state.ageBracket),
        relationshipStatus: serverNullable('relationshipStatus', _state.relationshipStatus),
        relationshipShape: serverNullable('relationshipShape', _state.relationshipShape),
        seeking: dbUser.seeking,
        boundary: serverNullable('boundary', _state.boundary),
        freeTimes: (dbUser as any).freeTimes ?? _state.freeTimes,
        region: serverNullable('region', _state.region),
        quote: serverNullable('quote', _state.quote),
        loftVisible: (dbUser as any).loftVisible !== false,
        // OFF unless explicitly turned on — `?? true` here silently re-enabled
        // the filter for every user whose doc predates the field, undoing the
        // opt-in fix (normal venting got blocked again).
        autoFilter: (dbUser as any).autoFilter === true,
        slowMode: (dbUser as any).slowMode ?? false,
        freeMatchesUsed: (dbUser as any).freeMatchesUsed ?? 0,
        loftFreeUsed: (dbUser as any).loftFreeUsed ?? _state.loftFreeUsed,
      };
      await Promise.all([
        AsyncStorage.setItem('wicks', String(safeWicks(dbUser.wicks))),
        AsyncStorage.setItem('vigil', dbUser.vigil ? '1' : '0'),
        AsyncStorage.setItem('setup_done', setupDone ? '1' : '0'),
        AsyncStorage.setItem('direction', serverDirection),
        AsyncStorage.setItem('lang', serverLang),
        persistNullable('gender', serverGender),
        persistNullable('ageBracket', dbUser.ageBracket),
        persistNullable('relationshipStatus', dbUser.relationshipStatus),
        persistNullable('relationshipShape', (dbUser as any).relationshipShape),
        AsyncStorage.setItem('seeking', JSON.stringify(dbUser.seeking ?? [])),
        persistNullable('boundary', dbUser.boundary),
        AsyncStorage.setItem('freeTimes', JSON.stringify((dbUser as any).freeTimes ?? [])),
        persistNullable('region', dbUser.region),
        persistNullable('quote', dbUser.quote),
        AsyncStorage.setItem('loftVisible', (dbUser as any).loftVisible !== false ? '1' : '0'),
        AsyncStorage.setItem('autoFilter', (dbUser as any).autoFilter === true ? '1' : '0'),
        AsyncStorage.setItem('slowMode', (dbUser as any).slowMode ? '1' : '0'),
      ]);
      // One-time migration for legacy docs created before autoFilter existed:
      // stamp the field to false so its state is explicit going forward. Only
      // when the field is entirely ABSENT — never overwrite a real user choice
      // (true or false), and never for docs that already carry it.
      if (!('autoFilter' in (dbUser as any))) {
        updateUser({ autoFilter: false } as any).catch(() => {});
      }
      // Retire any old/unknown stored value without assigning a new identity on
      // the user's behalf. They will return to setup and choose explicitly.
      if (rawServerGender != null && serverGender === null) {
        updateUser({ gender: null, setupDone: false }).catch(() => {});
      }
    } else {
      _state = { ..._state, userId, dbSynced: true };
    }
    notify();
    if (_userUnsubscribe) _userUnsubscribe();
    _userUnsubscribe = subscribeToUser(userId, updated => {
      const today = new Date().toISOString().slice(0, 10);
      const lastReward = (updated as any).lastRewardDate ?? null;
      const hasUpdatedField = (key: string) => Object.prototype.hasOwnProperty.call(updated, key);
      const updatedNullable = (key: string, local: string | null): string | null =>
        hasUpdatedField(key) ? ((updated as any)[key] ?? null) : local;
      const updatedGender = normalizeGender(updatedNullable('gender', _state.gender));
      const updatedSetupDone = updated.setupDone && updatedGender !== null;
      _state = {
        ..._state, wicks: safeWicks(updated.wicks), vigil: updated.vigil,
        isBanned: updated.isBanned, banReason: updated.banReason,
        banExpiresAt: (updated as any).banExpiresAt?.toMillis?.() ?? null,
        lastRewardDate: lastReward, rewardPending: lastReward !== today,
        setupDone: updatedSetupDone,
        gender: updatedGender,
        ageBracket: updatedNullable('ageBracket', _state.ageBracket),
        relationshipStatus: updatedNullable('relationshipStatus', _state.relationshipStatus),
        relationshipShape: updatedNullable('relationshipShape', _state.relationshipShape),
        seeking: updated.seeking,
        boundary: updatedNullable('boundary', _state.boundary),
        freeTimes: (updated as any).freeTimes ?? _state.freeTimes,
        region: updatedNullable('region', _state.region),
        quote: updatedNullable('quote', _state.quote),
        loftVisible: (updated as any).loftVisible !== false,
        autoFilter: (updated as any).autoFilter === true, // opt-in, see above
        slowMode: (updated as any).slowMode ?? false,
        freeMatchesUsed: (updated as any).freeMatchesUsed ?? _state.freeMatchesUsed,
        loftFreeUsed: (updated as any).loftFreeUsed ?? _state.loftFreeUsed,
      };
      // Persist a guaranteed-finite balance (safeWicks) so a cold start never
      // reads back the string "undefined" → NaN.
      AsyncStorage.setItem('wicks', String(safeWicks(updated.wicks)));
      AsyncStorage.setItem('setup_done', updatedSetupDone ? '1' : '0');
      if (updatedGender) AsyncStorage.setItem('gender', updatedGender);
      else AsyncStorage.removeItem('gender');
      notify();
    });
  } catch (e) {
    console.warn('[store] Firebase sync failed, running offline:', e);
    _state = { ..._state, dbSynced: false };
    notify();
    // Weak-network self-heal: keep trying in the background so a new user isn't
    // stranded uid-less. Bails after MAX_SYNC_RETRIES (see _scheduleFirebaseRetry).
    _scheduleFirebaseRetry(deviceId, seed, options);
  }
}

/**
 * Refresh every account-bound field after Firebase changes identity.
 *
 * Normal startup keeps a locally-completed setup sticky while an older server
 * document catches up. An explicit login/logout transition is different: the
 * new account must win, otherwise the previous guest/account profile, balance,
 * or setup state can leak into the next session until the app restarts.
 */
export async function syncAfterAuth(): Promise<void> {
  if (!_state.deviceId || !_state.seed) return;
  await _syncWithFirebase(_state.deviceId, _state.seed, { preserveLocalSetup: false });
}

export async function checkAndClaimDailyReward(): Promise<{ rewarded: boolean; amount?: number; balance?: number }> {
  const result = await claimDailyRewardServer();
  if (result.ok && result.rewarded && result.balance !== undefined) {
    _state = { ..._state, wicks: result.balance, rewardPending: false };
    AsyncStorage.setItem('wicks', String(result.balance));
    notify();
  } else if (result.ok) {
    _state = { ..._state, rewardPending: false };
    notify();
  }
  return { rewarded: result.rewarded, amount: result.amount, balance: result.balance };
}

export function getState() { return _state; }

export async function setDirection(d: Direction) {
  _state = { ..._state, direction: d };
  await AsyncStorage.setItem('direction', d);
  notify();
  if (_state.userId) updateUser({ direction: d });
}

export async function setLang(l: Lang) {
  _state = { ..._state, lang: l };
  await AsyncStorage.setItem('lang', l);
  notify();
  if (_state.userId) updateUser({ lang: l });
}

export async function setOnboardingDone() {
  _state = { ..._state, onboardingDone: true };
  await AsyncStorage.setItem('onboarding_done', '1');
  notify();
}

export async function setSetupDone() {
  _state = { ..._state, setupDone: true };
  await AsyncStorage.setItem('setup_done', '1');
  notify();
  if (_state.userId) await updateUser({ setupDone: true });
}

export async function setWicks(n: number) {
  _state = { ..._state, wicks: n };
  await AsyncStorage.setItem('wicks', String(n));
  notify();
}

export async function setVigil(on: boolean) {
  _state = { ..._state, vigil: on };
  await AsyncStorage.setItem('vigil', on ? '1' : '0');
  notify();
  if (_state.userId) updateUser({ vigil: on });
}

export async function setProfileFields(fields: {
  gender: Gender; ageBracket: string; relationshipStatus: string;
  relationshipShape: string | null; seeking: string[]; boundary: string;
  freeTimes: string[]; region: string | null; quote: string | null;
}) {
  _state = { ..._state, ...fields };
  notify();
  const stores: [string, string][] = [
    ['gender', fields.gender],
    ['ageBracket', fields.ageBracket],
    ['relationshipStatus', fields.relationshipStatus],
    ['seeking', JSON.stringify(fields.seeking)],
    ['boundary', fields.boundary],
    ['freeTimes', JSON.stringify(fields.freeTimes)],
  ];
  if (fields.relationshipShape) stores.push(['relationshipShape', fields.relationshipShape]);
  if (fields.region) stores.push(['region', fields.region]);
  if (fields.quote) stores.push(['quote', fields.quote]);
  await AsyncStorage.multiSet(stores);
  await AsyncStorage.multiRemove(
    [
      !fields.relationshipShape ? 'relationshipShape' : null,
      !fields.region ? 'region' : null,
      !fields.quote ? 'quote' : null,
    ].filter((key): key is string => key !== null),
  );
  if (_state.userId) await updateUser({ ...fields });
}

export async function setLoftVisible(on: boolean) {
  _state = { ..._state, loftVisible: on };
  await AsyncStorage.setItem('loftVisible', on ? '1' : '0');
  notify();
  if (_state.userId) updateUser({ loftVisible: on });
}

export async function setAutoFilter(on: boolean) {
  _state = { ..._state, autoFilter: on };
  await AsyncStorage.setItem('autoFilter', on ? '1' : '0');
  notify();
  if (_state.userId) updateUser({ autoFilter: on });
}

export async function setSlowMode(on: boolean) {
  _state = { ..._state, slowMode: on };
  await AsyncStorage.setItem('slowMode', on ? '1' : '0');
  notify();
  if (_state.userId) updateUser({ slowMode: on });
}

export async function setIdentityKind(kind: IdentityKind) {
  _state = { ..._state, identityKind: kind };
  await AsyncStorage.setItem('identityKind', kind);
  notify();
}

let _countedConversations: Set<string> = new Set();

export async function trackConversation(conversationId?: string) {
  await _resetDailyCountersIfNeeded();
  // Prevent duplicate counting for same conversation
  if (conversationId && _countedConversations.has(conversationId)) return;
  if (conversationId) _countedConversations.add(conversationId);

  const convs = _state.conversationsToday + 1;
  const today = localProductDayKey();
  _state = { ..._state, conversationsToday: convs };
  await AsyncStorage.setItem('conversationsToday', String(convs));
  await AsyncStorage.setItem('countersDate', today);
  notify();
}

export async function trackPerson() {
  await _resetDailyCountersIfNeeded();
  const people = _state.peopleTodayCount + 1;
  const today = localProductDayKey();
  _state = { ..._state, peopleTodayCount: people };
  await AsyncStorage.setItem('peopleTodayCount', String(people));
  await AsyncStorage.setItem('countersDate', today);
  notify();
}

// (The old canStartConversation 5-per-day cap was dead code that only lived on
// in the Settings screen as a rule we never actually enforced — the one real
// limit is FREE_DAILY_CONNECTIONS below.)

// ── Tiers & capabilities ──────────────────────────────────
export type Tier = 'guest' | 'free' | 'vigil';

/** Guest = anonymous, Vigil = subscriber, otherwise Free. */
export function getTier(): Tier {
  if (isGuest()) return 'guest';
  return _state.vigil ? 'vigil' : 'free';
}

/**
 * A "connection" = starting a 1:1 chat, whether via random match or a room
 * invite. Vigil is unlimited. Women match free and unlimited — they are the
 * scarce side of this marketplace, and every barrier on them starves the whole
 * app. Guests browse only. Free men get FREE_DAILY_CONNECTIONS
 * per day, then each costs MATCH_WICK_COST wicks.
 */
export function canMatch(): boolean {
  return connectionPolicy({
    guest: getTier() === 'guest',
    vigil: getTier() === 'vigil',
    gender: _state.gender,
    connectionsToday: _state.connectionsToday,
    wicks: _state.wicks,
    dailyAllowance: FREE_DAILY_CONNECTIONS,
    wickCost: MATCH_WICK_COST,
  }).canConnect;
}

/** True once a free user has used today's free connections and must pay wicks. */
export function matchCostsWick(): boolean {
  return connectionPolicy({
    guest: getTier() === 'guest',
    vigil: getTier() === 'vigil',
    gender: _state.gender,
    connectionsToday: _state.connectionsToday,
    wicks: _state.wicks,
    dailyAllowance: FREE_DAILY_CONNECTIONS,
    wickCost: MATCH_WICK_COST,
  }).costsWick;
}

/** Remaining free connections (matches + room invites) for a free user today. */
export function freeConnectionsRemaining(): number {
  return connectionPolicy({
    guest: getTier() === 'guest',
    vigil: getTier() === 'vigil',
    gender: _state.gender,
    connectionsToday: _state.connectionsToday,
    wicks: _state.wicks,
    dailyAllowance: FREE_DAILY_CONNECTIONS,
    wickCost: MATCH_WICK_COST,
  }).freeRemaining;
}

/**
 * Record a confirmed connection (random match OR room invite) for the current
 * user. Free users consume one of today's free connections or pay a wick;
 * vigil/guest are no-ops. Call when the chat actually starts (e.g. first message
 * sent), so entering an empty chat never costs.
 *
 * Returns true once settled (no charge needed, a free connection was consumed,
 * or a wick was successfully spent); false if a required wick charge failed, so
 * the caller can avoid marking the connection as already charged.
 */
export async function recordMatch(): Promise<boolean> {
  if (getTier() === 'guest') {
    // Guests are browse-only. Keep this guard here as defence in depth even
    // though every current screen routes them to registration before matching.
    return false;
  }
  if (_state.gender === null) return false;
  if (getTier() !== 'free') return true;
  if (_state.gender === 'female') return true; // women never consume quota or wicks
  await _resetDailyCountersIfNeeded();
  if (_state.connectionsToday < FREE_DAILY_CONNECTIONS) {
    const used = _state.connectionsToday + 1;
    const today = localProductDayKey();
    _state = { ..._state, connectionsToday: used };
    await AsyncStorage.setItem('connectionsToday', String(used));
    await AsyncStorage.setItem('countersDate', today);
    notify();
    return true;
  }
  // Beyond today's free quota — spend a wick (subscribeToUser syncs balance).
  const result = await spendWicks(MATCH_WICK_COST, 'match');
  return result.ok;
}

/**
 * The Loft is a Vigil space, but a free user gets ONE free entry PER WEEK to
 * taste it before being asked to upgrade. Guests never enter. Tracked locally by
 * week bucket (loftFreeWeek) so it resets weekly without fighting Firestore rules.
 */
export function canEnterLoft(): boolean {
  const t = getTier();
  if (t === 'vigil') return true;
  if (t === 'free') return _state.loftFreeWeek !== localProductWeekKey();
  return false;
}

/** Remaining free Loft entries this week for a free user (1 or 0). */
export function loftFreeRemaining(): number {
  if (getTier() !== 'free') return 0;
  return _state.loftFreeWeek === localProductWeekKey() ? 0 : 1;
}

/** True if this Loft entry would consume the free user's weekly free entry. */
export function loftEntryIsFreeTrial(): boolean {
  return getTier() === 'free' && _state.loftFreeWeek !== localProductWeekKey();
}

/**
 * Record an actual Loft entry. Consumes a free user's weekly free entry (local).
 * Vigil/guest are no-ops. Call only once the user truly enters, not on a blocked
 * attempt.
 */
export async function recordLoftEntry() {
  if (getTier() !== 'free') return;
  const week = localProductWeekKey();
  if (_state.loftFreeWeek === week) return;
  _state = { ..._state, loftFreeWeek: week };
  await AsyncStorage.setItem('loftFreeWeek', String(week));
  notify();
}

/** Opening a room: guests can't; free gets FREE_DAILY_ROOMS/day then pays wicks; vigil free. */
export function canCreateRoom(): boolean {
  return getTier() !== 'guest';
}

/** True if opening a room now would cost wicks (free user who used today's free room). */
export function roomCreateCostsWick(): boolean {
  return getTier() === 'free' && _state.roomsToday >= FREE_DAILY_ROOMS;
}

/** Record using the daily FREE room-open. Call after a free room is created. */
export async function recordRoomCreated() {
  if (getTier() !== 'free') return;
  await _resetDailyCountersIfNeeded();
  const used = _state.roomsToday + 1;
  const today = localProductDayKey();
  _state = { ..._state, roomsToday: used };
  await AsyncStorage.setItem('roomsToday', String(used));
  await AsyncStorage.setItem('countersDate', today);
  notify();
}

// The catalogue (src/lib/identityStyles.ts) is the single source of truth for
// which styles exist and how they're gated — add a style there and it flows
// through here and the picker automatically.
export function getAvailableIdentityKinds(): IdentityKind[] {
  return _state.vigil ? VIGIL_IDENTITY_KINDS : FREE_IDENTITY_KINDS;
}

async function _resetDailyCountersIfNeeded() {
  const stored = await AsyncStorage.getItem('countersDate');
  const today = localProductDayKey();
  if (stored !== today) {
    _state = { ..._state, conversationsToday: 0, peopleTodayCount: 0, connectionsToday: 0, roomsToday: 0 };
    await AsyncStorage.setItem('conversationsToday', '0');
    await AsyncStorage.setItem('peopleTodayCount', '0');
    await AsyncStorage.setItem('connectionsToday', '0');
    await AsyncStorage.setItem('roomsToday', '0');
    await AsyncStorage.setItem('countersDate', today);
    notify();
  }
}

export function useAppStore(): AppState;
export function useAppStore<T>(selector: (state: AppState) => T): T;
export function useAppStore<T>(selector?: (state: AppState) => T): T | AppState {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const selected = selector ? selector(_state) : _state;
  const [s, setS] = useState(selected);
  const prevRef = useRef(selected);

  useEffect(() => {
    const update = () => {
      const next = selectorRef.current ? selectorRef.current(_state) : _state;
      if (!Object.is(prevRef.current, next)) {
        prevRef.current = next;
        setS(next);
      }
    };
    _listeners.add(update);
    return () => { _listeners.delete(update); };
  }, []);

  return s;
}
