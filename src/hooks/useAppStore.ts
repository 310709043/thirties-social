// Global app state (no Redux — simple module-level store + hooks)
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailySeed } from '../lib/identity';
import { Direction, DEFAULT_DIRECTION } from '../lib/theme';
import { Lang } from '../lib/copy';
import { IdentityKind } from '../lib/identity';

// Generate a persistent device ID
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

// App-wide state shape
interface AppState {
  deviceId: string;
  seed: string;
  direction: Direction;
  lang: Lang;
  identityKind: IdentityKind;
  onboardingDone: boolean;
}

// Singleton store
let _state: AppState = {
  deviceId: '',
  seed: 'default',
  direction: DEFAULT_DIRECTION,
  lang: 'zh',
  identityKind: 'sigil',
  onboardingDone: false,
};
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach(fn => fn()); }

export async function initStore() {
  const deviceId = await getDeviceId();
  const seed = getDailySeed(deviceId);
  const storedDir = (await AsyncStorage.getItem('direction')) as Direction | null;
  const storedDone = await AsyncStorage.getItem('onboarding_done');
  _state = {
    ..._state,
    deviceId,
    seed,
    direction: storedDir || DEFAULT_DIRECTION,
    onboardingDone: storedDone === '1',
  };
  notify();
}

export function getState() { return _state; }

export async function setDirection(d: Direction) {
  _state = { ..._state, direction: d };
  await AsyncStorage.setItem('direction', d);
  notify();
}

export async function setOnboardingDone() {
  _state = { ..._state, onboardingDone: true };
  await AsyncStorage.setItem('onboarding_done', '1');
  notify();
}

export function useAppStore() {
  const [s, setS] = useState(_state);
  useEffect(() => {
    const update = () => setS({ ..._state });
    _listeners.add(update);
    return () => { _listeners.delete(update); };
  }, []);
  return s;
}
