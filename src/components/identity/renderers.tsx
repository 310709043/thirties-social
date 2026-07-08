// renderers.tsx — the expanded, premium set of anonymous identity glyphs.
//
// Every renderer is PROCEDURAL and seeded: the same person always gets the same
// glyph within a session, and no two seeds look alike. Nothing here labels a
// person — these are masks of light/shadow/line/field, not personality tags.
// All draw into a 0 0 32 32 viewBox so they compose at any size.
import React from 'react';
import Svg, {
  Path, Circle, Line, Ellipse, Rect, Defs,
  RadialGradient as RG, LinearGradient as LG, Stop, G, ClipPath,
} from 'react-native-svg';
import { rand, SWATCHES } from '../../lib/identity';
import { Palette } from '../../lib/theme';

type P = { seed: string; size: number; palette: Palette };

// A small helper: pick a swatch hue for a seed channel.
const pick = (v: number) => SWATCHES[Math.floor(v * SWATCHES.length)];
// Stable, collision-free gradient id per seed+tag.
const gid = (seed: string, tag: string) => `${tag}_${seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;

// ── 光 Light ──────────────────────────────────────────────

/** Aurora — soft curtains of seed-tinted light, layered and translucent. */
export function AuroraIdentity({ seed, size }: P) {
  const r = rand(seed, 6);
  const c1 = pick(r[0]), c2 = pick(r[1]);
  const id = gid(seed, 'aur');
  const sway = (r[2] - 0.5) * 6;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LG id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={c1} stopOpacity={0.9} />
          <Stop offset="100%" stopColor={c2} stopOpacity={0.05} />
        </LG>
      </Defs>
      <Circle cx={16} cy={16} r={15.6} fill={c2} fillOpacity={0.06} />
      {[0, 1, 2].map(i => {
        const x = 9 + i * 5 + sway * (i - 1);
        return (
          <Path key={i}
            d={`M ${x} 4 C ${x + 4} 11, ${x - 3} 18, ${x + 2} 28`}
            stroke={`url(#${id})`} strokeWidth={3.4 - i * 0.6}
            strokeLinecap="round" fill="none" opacity={0.85 - i * 0.18} />
        );
      })}
    </Svg>
  );
}

/** Halo — concentric rings of calm light around a quiet core. */
export function HaloIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 4);
  const tint = pick(r[0]);
  const rings = 3 + Math.floor(r[1] * 3); // 3..5
  const id = gid(seed, 'halo');
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <RG id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={tint} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={tint} stopOpacity={0} />
        </RG>
      </Defs>
      <Circle cx={16} cy={16} r={15.5} fill={`url(#${id})`} />
      {Array.from({ length: rings }).map((_, i) => (
        <Circle key={i} cx={16} cy={16} r={4 + i * (11 / rings)}
          fill="none" stroke={tint} strokeOpacity={0.55 - i * 0.09} strokeWidth={0.8} />
      ))}
      <Circle cx={16} cy={16} r={2.4} fill={tint} fillOpacity={0.95} />
    </Svg>
  );
}

/** Prism — a triangle refracting a seeded spectrum of shards. */
export function PrismIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 6);
  const rot = (r[0] - 0.5) * 40;
  const shards = [pick(r[1]), pick(r[2]), pick(r[3])];
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G transform={`rotate(${rot} 16 16)`}>
        {shards.map((c, i) => (
          <Path key={i}
            d={`M 16 16 L 30 ${9 + i * 5} L 30 ${13 + i * 5} Z`}
            fill={c} fillOpacity={0.7} />
        ))}
        <Path d="M 16 6 L 10 22 L 22 22 Z" fill="none"
          stroke={palette.ink} strokeOpacity={0.75} strokeWidth={1.3} strokeLinejoin="round" />
        <Line x1={4} y1={13} x2={16} y2={16} stroke={palette.ink} strokeOpacity={0.4} strokeWidth={0.8} />
      </G>
    </Svg>
  );
}

// ── 影 Shadow ─────────────────────────────────────────────

/** Smoke — wisps of ink rising and thinning into nothing. */
export function SmokeIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 6);
  const drift = (r[0] - 0.5) * 8;
  const id = gid(seed, 'smk');
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LG id={id} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor={palette.ink} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={palette.ink} stopOpacity={0.04} />
        </LG>
      </Defs>
      {[0, 1].map(i => {
        const x = 14 + i * 3;
        const d = (drift) * (i ? -1 : 1);
        return (
          <Path key={i}
            d={`M ${x} 29 C ${x + d} 24, ${x - d} 20, ${x + d} 15 S ${x - d + 2} 8, ${x + d} 4`}
            stroke={`url(#${id})`} strokeWidth={2.6 - i} strokeLinecap="round" fill="none" />
        );
      })}
      <Circle cx={16} cy={29} r={1.4} fill={palette.ink} fillOpacity={0.5} />
    </Svg>
  );
}

/** Ink-wash — a soft sumi-e blot, translucent layers bleeding at the edge. */
export function InkwashIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 8);
  const id = gid(seed, 'ink');
  const blobs = Array.from({ length: 4 }, (_, i) => ({
    cx: 16 + (r[i] - 0.5) * 12,
    cy: 16 + (r[i + 4] - 0.5) * 12,
    rr: 5 + r[i] * 6,
  }));
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <RG id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={palette.ink} stopOpacity={0.55} />
          <Stop offset="75%" stopColor={palette.ink} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={palette.ink} stopOpacity={0} />
        </RG>
      </Defs>
      {blobs.map((b, i) => (
        <Circle key={i} cx={b.cx} cy={b.cy} r={b.rr} fill={`url(#${id})`} />
      ))}
    </Svg>
  );
}

// ── 線 Line ───────────────────────────────────────────────

/** Orbit — a core with seeded elliptical orbits and small travellers. */
export function OrbitIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 9);
  const n = 2 + Math.floor(r[0] * 2); // 2..3 orbits
  const tint = pick(r[1]);
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15.4} fill={tint} fillOpacity={0.05} />
      {Array.from({ length: n }).map((_, i) => {
        const rx = 6 + i * 4.5, ry = 10 + i * 3;
        const rot = r[i + 2] * 180;
        const a = r[i + 5] * Math.PI * 2;
        const px = 16 + Math.cos(a) * rx, py = 16 + Math.sin(a) * ry;
        return (
          <G key={i} transform={`rotate(${rot} 16 16)`}>
            <Ellipse cx={16} cy={16} rx={rx} ry={ry}
              fill="none" stroke={palette.ink} strokeOpacity={0.4} strokeWidth={0.7} />
            <Circle cx={px} cy={py} r={1.3} fill={tint} />
          </G>
        );
      })}
      <Circle cx={16} cy={16} r={2.6} fill={palette.ink} fillOpacity={0.85} />
    </Svg>
  );
}

/** Ripple — concentric rings spreading from a seeded, off-centre touch. */
export function RippleIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 4);
  const cx = 12 + r[0] * 8, cy = 12 + r[1] * 8;
  const tint = pick(r[2]);
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15.5} fill={tint} fillOpacity={0.05} />
      {[3, 6.5, 10, 13.5].map((rr, i) => (
        <Circle key={i} cx={cx} cy={cy} r={rr}
          fill="none" stroke={tint} strokeOpacity={0.6 - i * 0.13} strokeWidth={1 - i * 0.12} />
      ))}
      <Circle cx={cx} cy={cy} r={1.3} fill={tint} />
    </Svg>
  );
}

// ── 場 Field ──────────────────────────────────────────────

/** Tide — a seeded sea under a faint moon; a field of colour, not a shape. */
export function TideIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 5);
  const c1 = pick(r[0]), c2 = pick(r[1]);
  const id = gid(seed, 'tide'), cid = gid(seed, 'tidec');
  const lift = (r[2] - 0.5) * 4;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LG id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={c1} stopOpacity={0.85} />
          <Stop offset="100%" stopColor={c2} stopOpacity={0.55} />
        </LG>
        <ClipPath id={cid}><Circle cx={16} cy={16} r={15.5} /></ClipPath>
      </Defs>
      <G clipPath={`url(#${cid})`}>
        <Circle cx={16} cy={16} r={15.5} fill={c2} fillOpacity={0.12} />
        <Circle cx={22} cy={10} r={2.6} fill={c1} fillOpacity={0.55} />
        <Path
          d={`M -2 ${19 + lift} Q 8 ${15 + lift} 16 ${19 + lift} T 34 ${19 + lift} L 34 34 L -2 34 Z`}
          fill={`url(#${id})`} />
      </G>
      <Circle cx={16} cy={16} r={15.5} fill="none" stroke={palette.line} strokeWidth={0.5} />
    </Svg>
  );
}

/** Moon — a seeded lunar phase with a soft glow. */
export function MoonIdentity({ seed, size, palette }: P) {
  const r = rand(seed, 3);
  const phase = r[0];                 // 0 new → 1 full
  const tint = '#e8dfc8';
  const id = gid(seed, 'moon');
  // Offset shadow disc slides across to carve the phase.
  const shadowDx = (phase - 0.5) * 20;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <RG id={id} cx="50%" cy="50%" r="55%">
          <Stop offset="0%" stopColor={tint} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={tint} stopOpacity={0} />
        </RG>
        <ClipPath id={`${id}c`}><Circle cx={16} cy={16} r={9} /></ClipPath>
      </Defs>
      <Circle cx={16} cy={16} r={15} fill={`url(#${id})`} />
      <Circle cx={16} cy={16} r={9} fill={tint} fillOpacity={0.9} />
      <G clipPath={`url(#${id}c)`}>
        <Circle cx={16 + shadowDx} cy={16} r={9} fill={palette.bgSolid ?? '#1a1420'} fillOpacity={0.92} />
      </G>
      <Circle cx={16} cy={16} r={9} fill="none" stroke={tint} strokeOpacity={0.35} strokeWidth={0.5} />
    </Svg>
  );
}
