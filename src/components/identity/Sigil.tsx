import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { rand, getColorAdj } from '../../lib/identity';
import { Palette } from '../../lib/theme';

interface SigilProps {
  seed?: string;
  size?: number;
  palette: Palette;
}

// Star-chart identity (design handoff §匿名識別 layer 2). Replaces the old wavy
// sigil whose only differences were edge jitter that vanished when small — six
// people looked identical at 28px. This is a 3×3 dot lattice with 4–5 points
// joined into a non-self-intersecting line, ONE brighter point ("tonight's
// fire"), and — crucially — the whole thing is drawn in the identity's own
// SWATCH colour, which is the strongest recognition cue and survives any size.
// Tied to the seed passed in (daily seed today), so it stays stable within a
// night and rotates daily — no cross-day linkage is introduced.
export function Sigil({ seed = 'today', size = 96 }: SigilProps) {
  const color = getColorAdj(seed).color;
  const r = rand(seed, 16);

  // 3×3 lattice (coords 7/16/25 in a 32 viewBox).
  const COORDS = [7, 16, 25];
  const lattice: [number, number][] = [];
  for (const y of COORDS) for (const x of COORDS) lattice.push([x, y]);

  // Seeded shuffle → pick 4 or 5 distinct lattice points.
  const order = Array.from({ length: 9 }, (_, i) => i);
  for (let i = 8; i > 0; i--) {
    const j = Math.floor(r[i] * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const count = 4 + Math.floor(r[0] * 2); // 4 or 5
  let pts = order.slice(0, count).map(i => lattice[i]);

  // Order by angle around the centroid → a simple (non-self-intersecting) outline.
  const cxp = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cyp = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  pts = pts.slice().sort((a, b) => Math.atan2(a[1] - cyp, a[0] - cxp) - Math.atan2(b[1] - cyp, b[0] - cxp));

  const bright = Math.floor(r[1] * pts.length);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15.2} fill={color} fillOpacity={0.16} />
      <Path d={d} fill="none" stroke={color} strokeOpacity={0.92} strokeWidth={1.1}
        strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p[0]} cy={p[1]} r={i === bright ? 2.7 : 1.5}
          fill={i === bright ? '#ffe7be' : color} />
      ))}
    </Svg>
  );
}
