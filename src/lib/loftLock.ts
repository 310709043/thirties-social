// loftLock.ts — an optional PIN that gates entry to the Loft, so that if someone
// else picks up the phone they can't wander into your Loft. Device-local only
// (a privacy barrier, not a security secret).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'loftPin';

export async function getLoftPin(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
}

export async function hasLoftPin(): Promise<boolean> {
  return !!(await getLoftPin());
}

export async function setLoftPin(pin: string): Promise<void> {
  try { await AsyncStorage.setItem(KEY, pin); } catch {}
}

export async function clearLoftPin(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}

export async function verifyLoftPin(pin: string): Promise<boolean> {
  return (await getLoftPin()) === pin;
}
