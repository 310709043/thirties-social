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
    blurb: 'Safe · pale dawn',
    dark: false,
    bg: ['#f1ecea', '#e3e4ec', '#ecdfe6', '#e8e8ef'],
    bgAngle: 155,
    bgSolid: '#ece6e4',
    glow: 'rgba(206,184,200,0.45)',
    ink: '#26242b',
    inkSoft: '#4b4750',
    muted: '#7e7882',
    faint: 'rgba(40,36,44,0.32)',
    line: 'rgba(40,36,44,0.08)',
    surface: 'rgba(255,255,255,0.55)',
    surfaceSolid: '#ffffff',
    glass: 'rgba(255,255,255,0.42)',
    glassBlur: 24,
    accent: '#9d7d96',
    accentSoft: 'rgba(157,125,150,0.18)',
    danger: '#b85a4f',
    statusDark: false,
  },
  nocturne: {
    key: 'nocturne',
    nameZh: '夜',
    nameEn: 'Nocturne',
    blurb: 'Interesting · deep ink',
    dark: true,
    bg: ['#0d1224', '#15172e', '#1a1530', '#0f1426'],
    bgAngle: 160,
    bgSolid: '#13152a',
    glow: 'rgba(120,110,200,0.32)',
    ink: '#ece8f4',
    inkSoft: 'rgba(236,232,244,0.78)',
    muted: 'rgba(220,212,232,0.5)',
    faint: 'rgba(220,212,232,0.28)',
    line: 'rgba(220,212,232,0.1)',
    surface: 'rgba(255,255,255,0.04)',
    surfaceSolid: '#1a1c34',
    glass: 'rgba(255,255,255,0.06)',
    glassBlur: 28,
    accent: '#e0c08a',
    accentSoft: 'rgba(224,192,138,0.16)',
    danger: '#e09080',
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

export const DEFAULT_DIRECTION: Direction = 'mist';
