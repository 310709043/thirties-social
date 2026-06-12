import React from 'react';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Line, Polygon } from 'react-native-svg';
import { rand, SWATCHES } from '../../lib/identity';
import { Palette } from '../../lib/theme';

interface SigilProps {
  seed?: string;
  size?: number;
  palette: Palette;
}

export function Sigil({ seed = 'today', size = 96, palette }: SigilProps) {
  const r = rand(seed, 32);
  const cx = 50, cy = 50;
  const rings = 2 + Math.floor(r[22] * 3); // 2–4 rings
  const paths: string[] = [];

  for (let k = 0; k < rings; k++) {
    const n = 5 + Math.floor(r[k] * 5);
    const baseR = 22 + k * (rings === 2 ? 11 : 7);
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r[k * 5 + (i % 5)] * 0.8;
      const rr = baseR * (0.74 + r[(k + i) % r.length] * 0.5);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `;
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const next = pts[(i + 1) % pts.length];
      const mid = [(cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2];
      d += `Q ${cur[0].toFixed(2)} ${cur[1].toFixed(2)} ${mid[0].toFixed(2)} ${mid[1].toFixed(2)} `;
    }
    d += 'Z';
    paths.push(d);
  }

  const dotN = 2 + Math.floor(r[20] * 4);
  // Seed-tinted accent so different people read as visually distinct
  const tint = SWATCHES[Math.floor(r[23] * SWATCHES.length)];
  // Motif variant: 0 none · 1 crescent · 2 slash · 3 triangle · 4 orbit ring
  const motif = Math.floor(r[21] * 5);
  const gradId = `sigGrad-${seed.slice(0, 8)}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="45%" r="60%">
          <Stop offset="0%" stopColor={tint} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={46} fill={`url(#${gradId})`} />
      {paths.map((d, i) => (
        <Path
          key={i} d={d} fill="none"
          stroke={i === 1 ? tint : palette.ink}
          strokeOpacity={i === 1 ? 0.65 : 0.5 - i * 0.11}
          strokeWidth={i === 0 ? 1.2 : 0.7}
        />
      ))}
      {motif === 1 && (
        <Path
          d={`M ${cx - 13} ${cy + 5} A 14 14 0 0 1 ${cx + 13} ${cy + 5}`}
          fill="none" stroke={tint} strokeOpacity={0.8} strokeWidth={1.4} strokeLinecap="round"
        />
      )}
      {motif === 2 && (
        <Line
          x1={cx - 11 + r[24] * 6} y1={cy + 12} x2={cx + 11} y2={cy - 12 + r[25] * 6}
          stroke={tint} strokeOpacity={0.75} strokeWidth={1.3} strokeLinecap="round"
        />
      )}
      {motif === 3 && (
        <Polygon
          points={`${cx},${cy - 9} ${cx - 8},${cy + 6} ${cx + 8},${cy + 6}`}
          fill="none" stroke={tint} strokeOpacity={0.8} strokeWidth={1.2}
        />
      )}
      {motif === 4 && (
        <Circle
          cx={cx} cy={cy} r={8 + r[26] * 5}
          fill="none" stroke={tint} strokeOpacity={0.7} strokeWidth={1}
          strokeDasharray="3 4"
        />
      )}
      {Array.from({ length: dotN }).map((_, i) => {
        const a = r[i] * Math.PI * 2;
        const rr = 4 + r[i + 10] * 9;
        return (
          <Circle key={i}
            cx={cx + Math.cos(a) * rr}
            cy={cy + Math.sin(a) * rr}
            r={0.9 + r[i + 15] * 1.3}
            fill={i === 0 ? tint : palette.ink} fillOpacity={0.7}
          />
        );
      })}
    </Svg>
  );
}
