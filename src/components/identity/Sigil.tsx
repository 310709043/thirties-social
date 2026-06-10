import React from 'react';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { rand } from '../../lib/identity';
import { Palette } from '../../lib/theme';

interface SigilProps {
  seed?: string;
  size?: number;
  palette: Palette;
}

export function Sigil({ seed = 'today', size = 96, palette }: SigilProps) {
  const r = rand(seed, 24);
  const cx = 50, cy = 50;
  const rings = 3;
  const paths: string[] = [];

  for (let k = 0; k < rings; k++) {
    const n = 6 + Math.floor(r[k] * 3);
    const baseR = 24 + k * 7;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r[k * 5 + (i % 5)] * 0.6;
      const rr = baseR * (0.78 + r[(k + i) % r.length] * 0.42);
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

  const dotN = 3 + Math.floor(r[20] * 3);
  const gradId = `sigGrad-${seed.slice(0, 6)}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="45%" r="60%">
          <Stop offset="0%" stopColor={palette.accent} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={46} fill={`url(#${gradId})`} />
      {paths.map((d, i) => (
        <Path
          key={i} d={d} fill="none"
          stroke={palette.ink}
          strokeOpacity={0.5 - i * 0.13}
          strokeWidth={i === 0 ? 1.2 : 0.7}
        />
      ))}
      {Array.from({ length: dotN }).map((_, i) => {
        const a = r[i] * Math.PI * 2;
        const rr = 4 + r[i + 10] * 9;
        return (
          <Circle key={i}
            cx={cx + Math.cos(a) * rr}
            cy={cy + Math.sin(a) * rr}
            r={0.9 + r[i + 15] * 1.3}
            fill={palette.ink} fillOpacity={0.7}
          />
        );
      })}
    </Svg>
  );
}
