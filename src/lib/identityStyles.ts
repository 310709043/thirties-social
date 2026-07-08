// identityStyles.ts — the catalogue that drives the identity-style picker.
//
// One source of truth for: which styles exist, how they group, their bilingual
// name + one-line poetry, and whether they're a Vigil perk. The picker, the
// preview and the free/vigil gate all read from here — add a style once and it
// shows up everywhere, correctly gated.
//
// Design intent: these are ANONYMOUS visual masks (light / shadow / line /
// field / word), never personality labels. Copy stays in the app's grayscale,
// no-labeling voice — evocative, never a claim about who the person "is".
import { IdentityKind } from './identity';

export type IdentityCategory = 'light' | 'shadow' | 'line' | 'field' | 'word';

export interface IdentityCategoryMeta {
  id: IdentityCategory;
  zh: string; en: string;
  glyph: string;      // a quiet mark shown beside the section title
}

export interface IdentityStyleMeta {
  kind: IdentityKind;
  category: IdentityCategory;
  zh: string; en: string;              // style name
  descZh: string; descEn: string;      // one poetic line
  vigilOnly: boolean;                  // a守夜 perk (kept scarce, not paywalled-basic)
}

export const IDENTITY_CATEGORIES: IdentityCategoryMeta[] = [
  { id: 'light',  zh: '光', en: 'Light',  glyph: '✷' },
  { id: 'shadow', zh: '影', en: 'Shadow', glyph: '☾' },
  { id: 'line',   zh: '線', en: 'Line',   glyph: '✧' },
  { id: 'field',  zh: '場', en: 'Field',  glyph: '◍' },
  { id: 'word',   zh: '字', en: 'Word',   glyph: '文' },
];

// Ordered for display. Free styles first within each category so the free tier
// always sees something beautiful before hitting a locked one.
export const IDENTITY_STYLES: IdentityStyleMeta[] = [
  // 光 Light
  { kind: 'flame',       category: 'light',  zh: '燭火',   en: 'Flame',        descZh: '一株只屬於你的火。',       descEn: 'A flame that leans your way.',        vigilOnly: false },
  { kind: 'halo',        category: 'light',  zh: '光暈',   en: 'Halo',         descZh: '一圈安靜的光。',           descEn: 'Quiet rings of light.',               vigilOnly: false },
  { kind: 'aurora',      category: 'light',  zh: '極光',   en: 'Aurora',       descZh: '夜空垂下的光簾。',         descEn: 'Curtains of light in the dark.',      vigilOnly: true  },
  { kind: 'prism',       category: 'light',  zh: '稜光',   en: 'Prism',        descZh: '一道光，折成一片光譜。',   descEn: 'One light, split into a spectrum.',   vigilOnly: true  },
  // 影 Shadow
  { kind: 'silhouette',  category: 'shadow', zh: '剪影',   en: 'Silhouette',   descZh: '暮色裡的一個輪廓。',       descEn: 'An outline in the dusk.',             vigilOnly: false },
  { kind: 'smoke',       category: 'shadow', zh: '煙',     en: 'Smoke',        descZh: '升起，然後散進空氣。',     descEn: 'Rising, then gone to air.',           vigilOnly: true  },
  { kind: 'inkwash',     category: 'shadow', zh: '水墨',   en: 'Ink-wash',     descZh: '一團暈開的墨。',           descEn: 'Ink bleeding soft at the edge.',      vigilOnly: true  },
  // 線 Line
  { kind: 'sigil',       category: 'line',   zh: '符印',   en: 'Sigil',        descZh: '一枚繞出來的私印。',       descEn: 'A private mark, spun from you.',      vigilOnly: false },
  { kind: 'constellation', category: 'line', zh: '星座',   en: 'Constellation',descZh: '幾顆連起來的星。',         descEn: 'A few stars, joined by faint lines.', vigilOnly: false },
  { kind: 'ripple',      category: 'line',   zh: '漣漪',   en: 'Ripple',       descZh: '一次觸碰，蕩開的圈。',     descEn: 'Rings spreading from one touch.',     vigilOnly: false },
  { kind: 'orbit',       category: 'line',   zh: '軌道',   en: 'Orbit',        descZh: '安靜運行的一個小宇宙。',   descEn: 'A small system, quietly turning.',    vigilOnly: true  },
  // 場 Field
  { kind: 'color+adj',   category: 'field',  zh: '色相',   en: 'Hue',          descZh: '一種顏色，一個名字。',     descEn: 'A colour, and a name.',               vigilOnly: false },
  { kind: 'moon',        category: 'field',  zh: '月相',   en: 'Moon',         descZh: '此刻的月，缺或圓。',       descEn: 'The moon, as it is tonight.',         vigilOnly: false },
  { kind: 'tide',        category: 'field',  zh: '潮',     en: 'Tide',         descZh: '月光下的一片海。',         descEn: 'A sea beneath a faint moon.',         vigilOnly: true  },
  // 字 Word
  { kind: 'text',        category: 'word',   zh: '字句',   en: 'Word',         descZh: '一個形容你的詞。',         descEn: 'A single word for you.',              vigilOnly: false },
  { kind: 'character',   category: 'word',   zh: '印章',   en: 'Seal',         descZh: '一個字，蓋成一方印。',     descEn: 'One character, pressed as a seal.',   vigilOnly: true  },
];

export const ALL_IDENTITY_KINDS: IdentityKind[] = IDENTITY_STYLES.map(s => s.kind);
export const FREE_IDENTITY_KINDS: IdentityKind[] = IDENTITY_STYLES.filter(s => !s.vigilOnly).map(s => s.kind);
export const VIGIL_IDENTITY_KINDS: IdentityKind[] = ALL_IDENTITY_KINDS;

export function stylesByCategory(cat: IdentityCategory): IdentityStyleMeta[] {
  return IDENTITY_STYLES.filter(s => s.category === cat);
}

export function styleMeta(kind: IdentityKind): IdentityStyleMeta | undefined {
  return IDENTITY_STYLES.find(s => s.kind === kind);
}
