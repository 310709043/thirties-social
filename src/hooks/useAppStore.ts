import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailySeed } from '../lib/identity';
import { Direction, DEFAULT_DIRECTION } from '../lib/theme';
import { Lang } from '../lib/copy';
import { IdentityKind } from '../lib/identity';
import { ensureAnonAuth, upsertUser, updateUser, subscribeToUser } from '../lib/db';

// ── Device ID ─────────────────────────────────────────────
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

// ── State ─────────────────────────────────────────────────
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
}

let _state: AppState = {
  deviceId: '',
  userId: '',
  seed: 'default',
  direction: DEFAULT_DIRECTION,
  lang: 'zh',
  identityKind: 'sigil',
  onboardingDone: false,
  setupDone: false,
  dbSynced: false,
  wicks: 3,
  vigil: false,
};

const _listeners = new Set<() => void>();
function notify() { _listeners.forEach(fn => fn()); }

// ── Init ──────────────────────────────────────────────────
export async function initStore() {
  const deviceId = await getDeviceId();
  const seed = getDailySeed(deviceId);

  // Load from AsyncStorage immediately (fast, offline)
  const [storedDir, storedDone, storedSetup, storedWicks, storedVigil, storedLang] =
    await Promise.all([
      AsyncStorage.getItem('direction') as Promise<Direction | null>,
      AsyncStorage.getItem('onboarding_done'),
      AsyncStorage.getItem('setup_done'),
      AsyncStorage.getItem('wicks'),
      AsyncStorage.getItem('vigil'),
      AsyncStorage.getItem('lang') as Promise<Lang | null>,
    ]);

  _state = {
    ..._state,
    deviceId,
    seed,
    direction: storedDir || DEFAULT_DIRECTION,
    lang: storedLang || 'zh',
    onboardingDone: storedDone === '1',
    setupDone: storedSetup === '1',
    wicks: storedWicks ? parseInt(storedWicks, 10) : 3,
    vigil: storedVigil === '1',
  };
  notify();

  // Background: Firebase auth + Firestore sync
  _syncWithFirebase(deviceId, seed);
}

let _userUnsubscribe: (() => void) | null = null;

async function _syncWithFirebase(deviceId: string, seed: string) {
  try {
    const userId = await ensureAnonAuth();

    const dbUser = await upsertUser({
      userId,
      deviceId,
      seed,
      lang: _state.lang,
      direction: _state.direction,
    });

    if (dbUser) {
      _state = {
        ..._state,
        userId,
        dbSynced: true,
        wicks: dbUser.wicks,
        vigil: dbUser.vigil,
        setupDone: dbUser.setupDone,
      };
      // Cache authoritative values
      await Promise.all([
        AsyncStorage.setItem('wicks', String(dbUser.wicks)),
        AsyncStorage.setItem('vigil', dbUser.vigil ? '1' : '0'),
        AsyncStorage.setItem('setup_done', dbUser.setupDone ? '1' : '0'),
      ]);
    } else {
      _state = { ..._state, userId, dbSynced: true };
    }
    notify();

    // Realtime listener for wicks/vigil changes
    if (_userUnsubscribe) _userUnsubscribe();
    _userUnsubscribe = subscribeToUser(userId, updated => {
      _state = { ..._state, wicks: updated.wicks, vigil: updated.vigil };
      AsyncStorage.setItem('wicks', String(updated.wicks));
      notify();
    });

  } catch (e) {
    console.warn('[store] Firebase sync failed, running offline:', e);
    _state = { ..._state, dbSynced: false };
    notify();
  }
}

export function getState() { return _state; }

// ── Setters ───────────────────────────────────────────────
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
  // For atomic ops, prefer spendWicks/addWicks from db.ts
  if (_state.userId) updateUser({ wicks: n });
}

export async function setVigil(on: boolean) {
  _state = { ..._state, vigil: on };
  await AsyncStorage.setItem('vigil', on ? '1' : '0');
  notify();
  if (_state.userId) updateUser({ vigil: on });
}

// ── Hook ──────────────────────────────────────────────────
export function useAppStore() {
  const [s, setS] = useState(_state);
  useEffect(() => {
    const update = () => setS({ ..._state });
    _listeners.add(update);
    return () => { _listeners.delete(update); };
  }, []);
  return s;
}
