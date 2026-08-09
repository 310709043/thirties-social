// theme.ts — palette directions

export type Direction = 'mist' | 'nocturne' | 'ink';

export interface Palette {
  key: Direction;
  nameZh: string;
  nameEn: string;
  blurb: string;
  dark: boolean;
  bg: string[];          // LinearGradient colors
  bgAngle: number;       // degrees
  bgSolid: string;
  glow: string;
  ink: string;
  inkSoft: string;
  muted: string;
  faint: string;
  line: string;
  surface: string;
  surfaceSolid: string;
  glass: string;
  glassBlur: number;
  accent: string;
  accentSoft: string;
  danger: string;
  statusDark: boolean;
}

export const DIRECTIONS: Record<Direction, Palette> = {
  mist: {
    key: 'mist',
    nameZh: '霧',
    nameEn: 'Mist',
    blurb: 'Safe · warm dusk',
    dark: false,
    // "Twilight cream": recognisably warm, but with enough rose/plum depth
    // that cards and selected states no longer dissolve into one beige plane.
    bg: ['#fff8ef', '#f4e2dc', '#ead7dc', '#dbc9d0'],
    bgAngle: 155,
    bgSolid: '#f2e2dd',
    glow: 'rgba(184,94,91,0.38)',
    ink: '#251c24',
    inkSoft: '#51404a',
    muted: '#77646e',
    faint: 'rgba(37,28,36,0.36)',
    line: 'rgba(73,42,58,0.14)',
    surface: 'rgba(255,251,247,0.82)',
    surfaceSolid: '#fffaf5',
    glass: 'rgba(255,248,244,0.64)',
    glassBlur: 24,
    accent: '#a74752',
    accentSoft: 'rgba(167,71,82,0.14)',
    danger: '#b43f4a',
    statusDark: false,
  },
  nocturne: {
    key: 'nocturne',
    nameZh: '燭',
    nameEn: 'Candle',
    blurb: 'Intimate · candlelit dark',
    dark: true,
    // Warm candlelit near-black — the "燭影" (candle-shadow) brand fantasy: an ember
    // glowing in the dark, cream serif on warm black. Set as the default direction.
    bg: ['#2a1a1e', '#1c1116', '#12090c', '#0b0608'],
    bgAngle: 160,
    bgSolid: '#170f13',
    glow: 'rgba(232,165,87,0.30)',
    ink: '#f5e2c4',
    inkSoft: 'rgba(245,226,196,0.82)',
    muted: 'rgba(245,226,196,0.5)',
    faint: 'rgba(245,226,196,0.28)',
    line: 'rgba(245,226,196,0.13)',
    surface: 'rgba(255,240,224,0.05)',
    surfaceSolid: '#1e1418',
    glass: 'rgba(255,240,224,0.06)',
    glassBlur: 28,
    accent: '#e8a557',
    accentSoft: 'rgba(232,165,87,0.15)',
    danger: '#e0806e',
    statusDark: true,
  },
  ink: {
    key: 'ink',
    nameZh: '墨',
    nameEn: 'Ink',
    blurb: 'Bold · bone & seal',
    dark: false,
    bg: ['#f1e8d4', '#ede2cb', '#e8dcc2'],
    bgAngle: 170,
    bgSolid: '#ede3cd',
    glow: 'rgba(139,36,23,0.18)',
    ink: '#1d1b16',
    inkSoft: '#3a3528',
    muted: '#6e6452',
    faint: 'rgba(29,27,22,0.32)',
    line: 'rgba(29,27,22,0.12)',
    surface: 'rgba(255,251,240,0.7)',
    surfaceSolid: '#fbf5e4',
    glass: 'rgba(255,251,240,0.45)',
    glassBlur: 18,
    accent: '#8b2417',
    accentSoft: 'rgba(139,36,23,0.12)',
    danger: '#8b2417',
    statusDark: false,
  },
};

// Loft — permanent dark velvet palette
export const LOFT_PALETTE = {
  bg: ['#3a1f1f', '#1f1014', '#0b0608'],
  bgSolid: '#1f1014',
  ink: '#f5e2c4',
  inkSoft: 'rgba(245,226,196,0.85)',
  muted: 'rgba(245,226,196,0.5)',
  faint: 'rgba(245,226,196,0.25)',
  line: 'rgba(245,226,196,0.12)',
  candle: '#e8a557',
  ember: '#c25a3b',
  glass: 'rgba(245,226,196,0.05)',
  dark: true,
  accent: '#e8a557',
  accentSoft: 'rgba(232,165,87,0.12)',
  glassBlur: 18,
  danger: '#e8a557',
  statusDark: true,
};

export const DEFAULT_DIRECTION: Direction = 'nocturne';

// Type scale — one consistent hierarchy so screens stop using ad-hoc sizes
// (the "no font hierarchy → visual fatigue" feedback). Pair with palette colours.
export const TYPE = {
  display:  { fontFamily: 'NotoSerifTC-Light', fontSize: 30, lineHeight: 40 },
  title:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 22, lineHeight: 32 },
  subtitle: { fontFamily: 'NotoSerifTC-Regular', fontSize: 16, lineHeight: 26 },
  body:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 25 },
  caption:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 20 },
  label:    { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 2 },
} as const;
