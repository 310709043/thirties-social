import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Line, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
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
      return <SilhouetteIdentity seed={seed} size={size} palette={palette} />;
    case 'flame':
      return <FlameIdentity seed={seed} size={size} />;
    case 'constellation':
      return <ConstellationIdentity seed={seed} size={size} palette={palette} />;
    default:
      return <Sigil seed={seed} size={size} palette={palette} />;
  }
}

// A soft, anonymous head-and-shoulders in seed-tinted dusk — finally a real
// silhouette instead of the old fallback-to-sigil (which made the style picker
// look broken: tapping 剪影 changed nothing).
function SilhouetteIdentity({ seed, size, palette }: { seed: string; size: number; palette: Palette }) {
  const r = rand(seed, 3);
  const tint = SWATCHES[Math.floor(r[0] * SWATCHES.length)];
  const tilt = (r[1] - 0.5) * 14;               // head tilt, −7°..+7°
  const cx = 16 + (r[2] - 0.5) * 3;             // slight off-center
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <SvgRadialGradient id={`sil_${seed}`} cx="50%" cy="38%" r="70%">
          <Stop offset="0%" stopColor={tint} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={tint} stopOpacity={0.12} />
        </SvgRadialGradient>
      </Defs>
      <Circle cx={16} cy={16} r={15.4} fill={`url(#sil_${seed})`} />
      {/* head */}
      <Circle cx={cx} cy={12.5} r={5.4} fill={palette.ink} fillOpacity={0.82}
        transform={`rotate(${tilt} 16 16)`} />
      {/* shoulders */}
      <Path d={`M ${cx - 9} 30 C ${cx - 8} 21.5, ${cx - 4} 19.4, ${cx} 19.4 C ${cx + 4} 19.4, ${cx + 8} 21.5, ${cx + 9} 30 Z`}
        fill={palette.ink} fillOpacity={0.82} transform={`rotate(${tilt} 16 16)`} />
    </Svg>
  );
}

// A lone candle flame whose hue and lean are the person's own.
function FlameIdentity({ seed, size }: { seed: string; size: number }) {
  const r = rand(seed, 3);
  const hue = 20 + Math.floor(r[0] * 40);        // 20..60 — ember to gold
  const lean = (r[1] - 0.5) * 8;
  const core = `hsl(${hue}, 85%, 62%)`;
  const glow = `hsl(${hue}, 80%, 50%)`;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={17} r={13} fill={glow} fillOpacity={0.14} />
      <Path d={`M ${16 + lean} 5 C 20.5 10.5, 22 13.5, 22 17.4 C 22 21.9, 19.3 24.8, 16 24.8 C 12.7 24.8, 10 21.9, 10 17.4 C 10 13.5, 11.5 10.5, ${16 + lean} 5 Z`}
        fill={glow} fillOpacity={0.85} />
      <Path d={`M ${16 + lean * 0.5} 11 C 18.4 14, 19.2 15.8, 19.2 18.2 C 19.2 20.9, 17.8 22.6, 16 22.6 C 14.2 22.6, 12.8 20.9, 12.8 18.2 C 12.8 15.8, 13.6 14, ${16 + lean * 0.5} 11 Z`}
        fill={core} />
      <Line x1={16} y1={24.8} x2={16} y2={28.5} stroke={glow} strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// A tiny private constellation — 5–7 seed-placed stars joined by faint lines.
function ConstellationIdentity({ seed, size, palette }: { seed: string; size: number; palette: Palette }) {
  const n = 5 + Math.floor(rand(seed, 1)[0] * 3); // 5..7 stars
  const rs = rand(seed + '_stars', n * 3);
  const stars = Array.from({ length: n }, (_, i) => ({
    x: 5 + rs[i * 3] * 22,
    y: 5 + rs[i * 3 + 1] * 22,
    r: 0.8 + rs[i * 3 + 2] * 1.2,
  }));
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15.4} fill={palette.ink} fillOpacity={0.06} />
      {stars.slice(1).map((s, i) => (
        <Line key={i} x1={stars[i].x} y1={stars[i].y} x2={s.x} y2={s.y}
          stroke={palette.ink} strokeOpacity={0.28} strokeWidth={0.5} />
      ))}
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i === 0 ? '#e8a557' : palette.ink}
          fillOpacity={i === 0 ? 0.95 : 0.8} />
      ))}
    </Svg>
  );
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
