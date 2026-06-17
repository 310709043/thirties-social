// resonance.ts — Brazier (火盆) resonance symbols.
//
// Empathy-first reactions: they carry the raw late-night feeling of being
// unseen or unwanted in a relationship through *understanding*, never by
// encouraging affairs — which keeps the app on-brand and store-safe.

export type ResonanceId =
  | 'understand' | 'hug' | 'withyou' | 'metoo'
  | 'ache' | 'deserve' | 'notalone' | 'light';

export interface ResonanceSymbol {
  id: ResonanceId;
  zh: string;
  en: string;
}

export const RESONANCE_SYMBOLS: ResonanceSymbol[] = [
  { id: 'understand', zh: '懂你',   en: 'I understand' },
  { id: 'hug',        zh: '抱抱',   en: 'Hug' },
  { id: 'withyou',    zh: '陪你',   en: 'With you' },
  { id: 'metoo',      zh: '我也是', en: 'Me too' },
  { id: 'ache',       zh: '心疼',   en: 'My heart aches' },
  { id: 'deserve',    zh: '你值得', en: 'You deserve' },
  { id: 'notalone',   zh: '不孤單', en: "You're not alone" },
  { id: 'light',      zh: '為你留燈', en: 'A light for you' },
];

export const RESONANCE_BY_ID: Record<ResonanceId, ResonanceSymbol> =
  RESONANCE_SYMBOLS.reduce((acc, s) => { acc[s.id] = s; return acc; }, {} as Record<ResonanceId, ResonanceSymbol>);

export function resonanceLabel(id: string, lang: 'zh' | 'en'): string {
  const s = RESONANCE_BY_ID[id as ResonanceId];
  return s ? (lang === 'en' ? s.en : s.zh) : id;
}
