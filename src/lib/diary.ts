// diary.ts — the user's private late-night notes.
//
// Entries live ONLY on this device (AsyncStorage). Nothing is uploaded: the
// diary is the one place in the app where words are kept, so it must also be
// the one place we can honestly say "only you can read this".
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiaryEntry {
  id: string;
  content: string;
  createdAt: number; // ms epoch
}

const KEY = 'diaryEntries';
const MAX_ENTRIES = 200;

export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as DiaryEntry[];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

/** Prepends a new entry (newest first). Silently ignores empty text. */
export async function addDiaryEntry(content: string): Promise<DiaryEntry | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const entry: DiaryEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    content: trimmed,
    createdAt: Date.now(),
  };
  const list = await getDiaryEntries();
  // Don't double-save the exact same line twice in a row (e.g. re-entering the
  // match queue with the same mood text).
  if (list[0]?.content === trimmed) return list[0];
  const next = [entry, ...list].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return entry;
}

export async function removeDiaryEntry(id: string): Promise<void> {
  const list = await getDiaryEntries();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter(e => e.id !== id)));
}
