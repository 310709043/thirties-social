import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailySeed } from '../lib/identity';
import { Direction, DEFAULT_DIRECTION } from '../lib/theme';
import { Lang } from '../lib/copy';
import { IdentityKind } from '../lib/identity';
import { ensureAnonAuth, upsertUser, updateUser, subscribeToUser, claimDailyRewardServer, spendWicks } from '../lib/db';
import { isGuest } from '../lib/auth';

let _deviceId: string | null = null;
async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  const stored = await AsyncStorage.getItem('device_id');
  if (stored) { _deviceId = stored; return stored; }
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  await AsyncStorage.setItem('device_id', id);
  _deviceId = id;
  return id;
}

export type Gender = 'female' | 'male' | 'nonbinary';

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
  freeMatchesUsed: number;
  loftFreeUsed: number;
}

/** Free registered users get this many free matches before each costs a wick. */
export const FREE_MATCH_ALLOWANCE = 10;
export const MATCH_WICK_COST = 1;
/** Free users pay this to open a room; Vigil opens rooms for free. */
export const ROOM_CREATE_COST = 2;
/** A free user gets this many lifetime free Loft entries, then must go Vigil. */
export const FREE_LOFT_ALLOWANCE = 1;

let _state: AppState = {
  deviceId: '', userId: '', seed: 'default', direction: DEFAULT_DIRECTION,
  lang: 'zh', identityKind: 'sigil', onboardingDone: false, setupDone: false,
  dbSynced: false, wicks: 3, vigil: false, isBanned: false, banReason: null,
  banExpiresAt: null, lastRewardDate: null, rewardPending: false,
  gender: null, ageBracket: null, relationshipStatus: null, relationshipShape: null, seeking: [],
  boundary: null, freeTimes: [], region: null, quote: null, loftVisible: true,
  autoFilter: true, slowMode: false, conversationsToday: 0, peopleTodayCount: 0,
  freeMatchesUsed: 0, loftFreeUsed: 0,
};

const _listeners = new Set<() => void>();
function notify() { _listeners.forEach(fn => fn()); }

export async function initStore() {
  const deviceId = await getDeviceId();
  const seed = getDailySeed(deviceId);
  const [storedDir, storedDone, storedSetup, storedWicks, storedVigil, storedLang, storedGender, storedAge, storedRelation, storedShape, storedSeeking, storedBoundary, storedFreeTimes, storedRegion, storedQuote, storedLoftVisible, storedAutoFilter, storedSlowMode, storedConvToday, storedPeopleToday, storedIdentityKind, storedFreeMatches, storedLoftFree] = await Promise.all([
    AsyncStorage.getItem('direction') as Promise<Direction | null>,
    AsyncStorage.getItem('onboarding_done'),
    AsyncStorage.getItem('setup_done'),
    AsyncStorage.getItem('wicks'),
    AsyncStorage.getItem('vigil'),
    AsyncStorage.getItem('lang') as Promise<Lang | null>,
    AsyncStorage.getItem('gender') as Promise<Gender | null>,
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
  ]);
  _state = {
    ..._state, deviceId, seed,
    direction: storedDir || DEFAULT_DIRECTION, lang: storedLang || 'zh',
    onboardingDone: storedDone === '1', setupDone: storedSetup === '1',
    wicks: storedWicks ? parseInt(storedWicks, 10) : 3, vigil: storedVigil === '1',
    gender: storedGender, ageBracket: storedAge, relationshipStatus: storedRelation,
    relationshipShape: storedShape,
    seeking: storedSeeking ? JSON.parse(storedSeeking) : [],
    boundary: storedBoundary,
    freeTimes: storedFreeTimes ? JSON.parse(storedFreeTimes) : [],
    region: storedRegion, quote: storedQuote,
    loftVisible: storedLoftVisible !== '0',
    identityKind: storedIdentityKind || 'sigil',
    autoFilter: storedAutoFilter !== '0',
    slowMode: storedSlowMode === '1',
    conversationsToday: storedConvToday ? parseInt(storedConvToday, 10) : 0,
    peopleTodayCount: storedPeopleToday ? parseInt(storedPeopleToday, 10) : 0,
    freeMatchesUsed: storedFreeMatches ? parseInt(storedFreeMatches, 10) : 0,
    loftFreeUsed: storedLoftFree ? parseInt(storedLoftFree, 10) : 0,
  };
  notify();
  _resetDailyCountersIfNeeded();
  _syncWithFirebase(deviceId, seed);
}

let _userUnsubscribe: (() => void) | null = null;

async function _syncWithFirebase(deviceId: string, seed: string) {
  try {
    const userId = await ensureAnonAuth();
    const dbUser = await upsertUser({ userId, deviceId, seed, lang: _state.lang, direction: _state.direction });
    if (dbUser) {
      const today = new Date().toISOString().slice(0, 10);
      const lastReward = (dbUser as any).lastRewardDate ?? null;
      _state = {
        // wicks: never let a missing field blank the display (undefined → 0/keep).
        ..._state, userId, dbSynced: true, wicks: dbUser.wicks ?? _state.wicks ?? 0, vigil: dbUser.vigil,
        // setupDone is sticky: once finished locally, a fresh/incomplete server
        // doc must never force the user to fill in their profile again.
        setupDone: dbUser.setupDone || _state.setupDone, isBanned: dbUser.isBanned, banReason: dbUser.banReason,
        banExpiresAt: (dbUser as any).banExpiresAt?.toMillis?.() ?? null,
        lastRewardDate: lastReward, rewardPending: lastReward !== today,
        gender: dbUser.gender as Gender | null, ageBracket: dbUser.ageBracket,
        relationshipStatus: dbUser.relationshipStatus,
        relationshipShape: (dbUser as any).relationshipShape ?? _state.relationshipShape,
        seeking: dbUser.seeking,
        boundary: dbUser.boundary,
        freeTimes: (dbUser as any).freeTimes ?? _state.freeTimes,
        region: dbUser.region, quote: dbUser.quote,
        loftVisible: (dbUser as any).loftVisible !== false,
        autoFilter: (dbUser as any).autoFilter ?? true,
        slowMode: (dbUser as any).slowMode ?? false,
        freeMatchesUsed: (dbUser as any).freeMatchesUsed ?? 0,
        loftFreeUsed: (dbUser as any).loftFreeUsed ?? _state.loftFreeUsed,
      };
      await Promise.all([
        AsyncStorage.setItem('wicks', String(dbUser.wicks)),
        AsyncStorage.setItem('vigil', dbUser.vigil ? '1' : '0'),
        AsyncStorage.setItem('setup_done', dbUser.setupDone ? '1' : '0'),
        dbUser.gender ? AsyncStorage.setItem('gender', dbUser.gender) : Promise.resolve(),
        dbUser.ageBracket ? AsyncStorage.setItem('ageBracket', dbUser.ageBracket) : Promise.resolve(),
        dbUser.relationshipStatus ? AsyncStorage.setItem('relationshipStatus', dbUser.relationshipStatus) : Promise.resolve(),
        (dbUser as any).relationshipShape ? AsyncStorage.setItem('relationshipShape', (dbUser as any).relationshipShape) : Promise.resolve(),
        dbUser.seeking.length ? AsyncStorage.setItem('seeking', JSON.stringify(dbUser.seeking)) : Promise.resolve(),
        dbUser.boundary ? AsyncStorage.setItem('boundary', dbUser.boundary) : Promise.resolve(),
        (dbUser as any).freeTimes?.length ? AsyncStorage.setItem('freeTimes', JSON.stringify((dbUser as any).freeTimes)) : Promise.resolve(),
        dbUser.region ? AsyncStorage.setItem('region', dbUser.region) : Promise.resolve(),
        dbUser.quote ? AsyncStorage.setItem('quote', dbUser.quote) : Promise.resolve(),
        AsyncStorage.setItem('loftVisible', (dbUser as any).loftVisible !== false ? '1' : '0'),
        AsyncStorage.setItem('autoFilter', (dbUser as any).autoFilter !== false ? '1' : '0'),
        AsyncStorage.setItem('slowMode', (dbUser as any).slowMode ? '1' : '0'),
      ]);
    } else {
      _state = { ..._state, userId, dbSynced: true };
    }
    notify();
    if (_userUnsubscribe) _userUnsubscribe();
    _userUnsubscribe = subscribeToUser(userId, updated => {
      const today = new Date().toISOString().slice(0, 10);
      const lastReward = (updated as any).lastRewardDate ?? null;
      _state = {
        ..._state, wicks: updated.wicks ?? _state.wicks ?? 0, vigil: updated.vigil,
        isBanned: updated.isBanned, banReason: updated.banReason,
        banExpiresAt: (updated as any).banExpiresAt?.toMillis?.() ?? null,
        lastRewardDate: lastReward, rewardPending: lastReward !== today,
        gender: updated.gender as Gender | null, ageBracket: updated.ageBracket,
        relationshipStatus: updated.relationshipStatus,
        relationshipShape: (updated as any).relationshipShape ?? _state.relationshipShape,
        seeking: updated.seeking,
        boundary: updated.boundary,
        freeTimes: (updated as any).freeTimes ?? _state.freeTimes,
        region: updated.region, quote: updated.quote,
        loftVisible: (updated as any).loftVisible !== false,
        autoFilter: (updated as any).autoFilter ?? true,
        slowMode: (updated as any).slowMode ?? false,
        freeMatchesUsed: (updated as any).freeMatchesUsed ?? _state.freeMatchesUsed,
        loftFreeUsed: (updated as any).loftFreeUsed ?? _state.loftFreeUsed,
      };
      AsyncStorage.setItem('wicks', String(updated.wicks));
      notify();
    });
  } catch (e) {
    console.warn('[store] Firebase sync failed, running offline:', e);
    _state = { ..._state, dbSynced: false };
    notify();
  }
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
  if (_state.userId) updateUser({ setupDone: true });
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
  if (_state.userId) updateUser({ ...fields });
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
  const today = new Date().toISOString().slice(0, 10);
  _state = { ..._state, conversationsToday: convs };
  await AsyncStorage.setItem('conversationsToday', String(convs));
  await AsyncStorage.setItem('countersDate', today);
  notify();
}

export async function trackPerson() {
  await _resetDailyCountersIfNeeded();
  const people = _state.peopleTodayCount + 1;
  const today = new Date().toISOString().slice(0, 10);
  _state = { ..._state, peopleTodayCount: people };
  await AsyncStorage.setItem('peopleTodayCount', String(people));
  await AsyncStorage.setItem('countersDate', today);
  notify();
}

export function canStartConversation(): boolean {
  if (_state.vigil) return true;
  return _state.conversationsToday < 5;
}

// ── Tiers & capabilities ──────────────────────────────────
export type Tier = 'guest' | 'free' | 'vigil';

/** Guest = anonymous, Vigil = subscriber, otherwise Free. */
export function getTier(): Tier {
  if (isGuest()) return 'guest';
  return _state.vigil ? 'vigil' : 'free';
}

/**
 * Random matching: guests can't; vigil is unlimited; free gets
 * FREE_MATCH_ALLOWANCE free matches, then each costs MATCH_WICK_COST wicks.
 */
export function canMatch(): boolean {
  const t = getTier();
  if (t === 'guest') return false;
  if (t === 'vigil') return true;
  if (_state.freeMatchesUsed < FREE_MATCH_ALLOWANCE) return true;
  return _state.wicks >= MATCH_WICK_COST;
}

/** True once a free user has used up their free matches and must pay wicks. */
export function matchCostsWick(): boolean {
  return getTier() === 'free' && _state.freeMatchesUsed >= FREE_MATCH_ALLOWANCE;
}

/**
 * Record a successful match for the current user. Free users consume a free
 * match or pay a wick; vigil/guest are no-ops. Call when a match is confirmed
 * (not merely attempted), so "no one around" never costs.
 */
export async function recordMatch() {
  if (getTier() !== 'free') return;
  if (_state.freeMatchesUsed < FREE_MATCH_ALLOWANCE) {
    const used = _state.freeMatchesUsed + 1;
    _state = { ..._state, freeMatchesUsed: used };
    await AsyncStorage.setItem('freeMatchesUsed', String(used));
    notify();
    if (_state.userId) updateUser({ freeMatchesUsed: used });
  } else {
    // Beyond the free allowance — spend a wick (subscribeToUser syncs balance).
    await spendWicks(MATCH_WICK_COST, 'match');
  }
}

/**
 * The Loft is a Vigil space, but a free user gets FREE_LOFT_ALLOWANCE lifetime
 * free entries to taste it before being asked to upgrade. Guests never enter.
 */
export function canEnterLoft(): boolean {
  const t = getTier();
  if (t === 'vigil') return true;
  if (t === 'free') return _state.loftFreeUsed < FREE_LOFT_ALLOWANCE;
  return false;
}

/** Remaining free Loft entries for a free user (0 for guest/vigil context). */
export function loftFreeRemaining(): number {
  return Math.max(0, FREE_LOFT_ALLOWANCE - _state.loftFreeUsed);
}

/** True if this Loft entry would consume the free user's free-trial entry. */
export function loftEntryIsFreeTrial(): boolean {
  return getTier() === 'free' && _state.loftFreeUsed < FREE_LOFT_ALLOWANCE;
}

/**
 * Record an actual Loft entry. Consumes a free user's lifetime free entry
 * (persisted locally + synced to Firestore). Vigil/guest are no-ops.
 * Call only once the user truly enters the Loft, not on a blocked attempt.
 */
export async function recordLoftEntry() {
  if (getTier() !== 'free') return;
  if (_state.loftFreeUsed >= FREE_LOFT_ALLOWANCE) return;
  const used = _state.loftFreeUsed + 1;
  _state = { ..._state, loftFreeUsed: used };
  await AsyncStorage.setItem('loftFreeUsed', String(used));
  notify();
  if (_state.userId) updateUser({ loftFreeUsed: used } as any);
}

/** Opening a room: guests can't; free pays wicks (charged at call site); vigil free. */
export function canCreateRoom(): boolean {
  return getTier() !== 'guest';
}

const FREE_IDENTITY_KINDS: IdentityKind[] = ['sigil', 'color+adj', 'text'];
const VIGIL_IDENTITY_KINDS: IdentityKind[] = ['sigil', 'silhouette', 'color+adj', 'character', 'text'];

export function getAvailableIdentityKinds(): IdentityKind[] {
  return _state.vigil ? VIGIL_IDENTITY_KINDS : FREE_IDENTITY_KINDS;
}

async function _resetDailyCountersIfNeeded() {
  const stored = await AsyncStorage.getItem('countersDate');
  const today = new Date().toISOString().slice(0, 10);
  if (stored !== today) {
    _state = { ..._state, conversationsToday: 0, peopleTodayCount: 0 };
    await AsyncStorage.setItem('conversationsToday', '0');
    await AsyncStorage.setItem('peopleTodayCount', '0');
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
