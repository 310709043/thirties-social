import React from 'react';
import { View, Text } from 'react-native';
import { Sigil } from './Sigil';
import { Palette } from '../../lib/theme';
import { IdentityKind, getColorAdj, getCharacter, rand, SWATCHES } from '../../lib/identity';
import { Lang } from '../../lib/copy';

interface IdentityProps {
  kind?: IdentityKind;
  seed?: string;
  size?: number;
  palette: Palette;
  lang?: Lang;
  trust?: number;
}

export function Identity({ kind = 'sigil', seed = 'today', size = 96, palette, lang = 'zh', trust = 0 }: IdentityProps) {
  switch (kind) {
    case 'sigil':
      return <Sigil seed={seed} size={size} palette={palette} />;
    case 'color+adj':
      return <ColorAdjIdentity seed={seed} size={size} lang={lang} />;
    case 'character':
      return <CharSealIdentity seed={seed} size={size} palette={palette} />;
    case 'text':
      return <TextOnlyIdentity seed={seed} size={size} lang={lang} palette={palette} />;
    case 'silhouette':
      // Fallback to sigil for MVP (silhouette needs blur filter support)
      return <Sigil seed={seed} size={size} palette={palette} />;
    default:
      return <Sigil seed={seed} size={size} palette={palette} />;
  }
}

function ColorAdjIdentity({ seed, size, lang }: { seed: string; size: number; lang: Lang }) {
  const { color, label } = getColorAdj(seed, lang);
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{
        width: size, height: size, borderRadius: size,
        backgroundColor: color,
        shadowColor: color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
      }} />
      <Text style={{
        fontFamily: lang === 'en' ? 'EBGaramond-Italic' : 'NotoSerifTC-Regular',
        fontSize: 14, opacity: 0.7,
      }}>{label}</Text>
    </View>
  );
}

function CharSealIdentity({ seed, size, palette }: { seed: string; size: number; palette: Palette }) {
  const ch = getCharacter(seed);
  return (
    <View style={{
      width: size, height: size, borderRadius: 4,
      backgroundColor: palette.accent,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        color: '#fbf5e4',
        fontFamily: 'NotoSerifTC-Bold',
        fontSize: size * 0.62, lineHeight: size * 0.7,
      }}>{ch}</Text>
    </View>
  );
}

function TextOnlyIdentity({ seed, size, lang, palette }: { seed: string; size: number; lang: Lang; palette: Palette }) {
  const { adj } = getColorAdj(seed, lang);
  return (
    <View style={{
      width: size, height: size, borderRadius: size,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 0.5, borderColor: palette.line,
    }}>
      <Text style={{
        fontFamily: lang === 'en' ? 'EBGaramond-Italic' : 'NotoSerifTC-Regular',
        fontSize: size * 0.18, color: palette.ink, textAlign: 'center',
      }}>{adj}</Text>
    </View>
  );
}

// Inline label (no swatch) — used in chat headers etc.
export function ColorAdjLabel({ seed, lang, palette }: { seed: string; lang: Lang; palette: Palette }) {
  const { label } = getColorAdj(seed, lang);
  return (
    <Text style={{
      fontFamily: lang === 'en' ? 'EBGaramond-Regular' : 'NotoSerifTC-Regular',
      fontSize: 13, color: palette.inkSoft,
    }}>{label}</Text>
  );
}
