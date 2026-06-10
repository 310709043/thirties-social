// identity.jsx — five anonymous-identity metaphors
// All return JSX that renders within a {size×size} box (or text inline).
// Each takes a `seed` string (we hash it) and a `palette` (theme dir).

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
function rand(seed, n = 1) {
  // returns array of n floats 0..1 from a hashed seed
  const out = [];
  let h = hash(seed);
  for (let i = 0; i < n; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(h / 4294967295);
  }
  return out;
}

// ──────────────────────────────────────────────────────
// 1. Generative sigil — soft asymmetric organic mark
// ──────────────────────────────────────────────────────
function Sigil({ seed = 'today', size = 96, palette, stroke }) {
  const p = palette || { ink: '#2a2a35', accent: '#9d7d96' };
  const r = rand(seed, 24);
  const cx = 50, cy = 50;
  const rings = 3;
  const paths = [];
  // soft organic blobs as cubic curves through 6-8 points
  for (let k = 0; k < rings; k++) {
    const n = 6 + Math.floor(r[k] * 3);
    const baseR = 24 + k * 7;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r[k * 5 + i % 5] * 0.6;
      const rr = baseR * (0.78 + r[(k + i) % r.length] * 0.42);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    // close path with smooth curves
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
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`sigGrad-${seed}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={p.accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r="46" fill={`url(#sigGrad-${seed})`} />
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke={stroke || p.ink}
          strokeOpacity={0.5 - i * 0.13}
          strokeWidth={i === 0 ? 1.2 : 0.7} />
      ))}
      {/* center dot constellation */}
      {Array.from({ length: dotN }).map((_, i) => {
        const a = r[i] * Math.PI * 2;
        const rr = 4 + r[i + 10] * 9;
        return <circle key={i}
          cx={cx + Math.cos(a) * rr}
          cy={cy + Math.sin(a) * rr}
          r={0.9 + r[i + 15] * 1.3}
          fill={p.ink} fillOpacity={0.7} />;
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────────────
// 2. Blurred silhouette — clarifies as trust grows
// trustLevel 0..1 controls blur from heavy to almost none
// ──────────────────────────────────────────────────────
function Silhouette({ seed = 'me', size = 96, palette, trust = 0 }) {
  const p = palette || { ink: '#2a2a35', accent: '#9d7d96' };
  const r = rand(seed, 8);
  const blur = (1 - trust) * 14 + 1.5;
  // soft head + shoulders shape
  const skinHue = Math.floor(r[0] * 360);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <defs>
        <filter id={`silBlur-${seed}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
        <radialGradient id={`silG-${seed}`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={`hsl(${skinHue}, 22%, 62%)`} />
          <stop offset="100%" stopColor={p.accent} stopOpacity="0.8" />
        </radialGradient>
      </defs>
      <g filter={`url(#silBlur-${seed})`}>
        {/* shoulders */}
        <path d="M5 95 Q 50 60 95 95 L 95 100 L 5 100 Z" fill={`url(#silG-${seed})`} />
        {/* head */}
        <ellipse cx="50" cy="42" rx="22" ry="26" fill={`url(#silG-${seed})`} />
        {/* hair / shadow accent */}
        <path d="M30 32 Q 50 16 72 34 Q 70 22 50 18 Q 30 22 30 32 Z" fill={p.ink} fillOpacity="0.35" />
      </g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────
// 3. Color + Adjective pair — e.g. "slate driftwood"
// Returns a swatch + label
// ──────────────────────────────────────────────────────
const COLOR_NAMES_ZH = ['霧灰', '青墨', '砂金', '苔綠', '焦糖', '沉藍', '木棕', '蘆白', '炭', '茶', '杏', '玫', '靛', '梅', '雲', '槐'];
const COLOR_NAMES_EN = ['slate', 'umber', 'fawn', 'moss', 'caramel', 'indigo', 'walnut', 'reed', 'charcoal', 'tea', 'apricot', 'rose', 'mulberry', 'cloud', 'sage', 'ash'];
const ADJ_ZH = ['漂木', '靜物', '夜雨', '舊書', '空房', '清晨', '末班', '長椅', '回音', '走廊', '抽屜', '燈下'];
const ADJ_EN = ['driftwood', 'still-life', 'night-rain', 'old-book', 'empty-room', 'early-hour', 'last-train', 'long-bench', 'echo', 'corridor', 'drawer', 'lamp-light'];
const SWATCHES = [
  '#7c7e84', '#5d4a3a', '#c8a87a', '#7d8d6e', '#a86c44',
  '#3f4a6a', '#6b4a3a', '#dcd2bd', '#3a3a3a', '#9c7a64',
  '#dab28a', '#a87082', '#5a4070', '#7a4060', '#c4c6cc', '#94a482',
];

function ColorAdj({ seed = 'me', lang = 'zh', size = 96, showSwatch = true }) {
  const r = rand(seed, 3);
  const ci = Math.floor(r[0] * COLOR_NAMES_ZH.length);
  const ai = Math.floor(r[1] * ADJ_ZH.length);
  const color = SWATCHES[ci];
  const colorName = lang === 'en' ? COLOR_NAMES_EN[ci] : COLOR_NAMES_ZH[ci];
  const adj = lang === 'en' ? ADJ_EN[ai] : ADJ_ZH[ai];
  if (!showSwatch) {
    return <span>{lang === 'en' ? `${colorName} ${adj}` : `${colorName}的${adj}`}</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: size,
        background: `radial-gradient(circle at 35% 30%, ${color}, ${color}cc 60%, ${color}80)`,
        boxShadow: `0 8px 24px ${color}40, inset 0 -8px 16px ${color}80`,
      }} />
      <div style={{
        fontFamily: lang === 'en' ? '"EB Garamond", serif' : '"Noto Serif TC", serif',
        fontStyle: lang === 'en' ? 'italic' : 'normal',
        fontSize: 14, opacity: 0.7, whiteSpace: 'nowrap',
      }}>
        {lang === 'en' ? `${colorName} ${adj}` : `${colorName}的${adj}`}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 4. Single Chinese character — semi-random, calligraphic
// ──────────────────────────────────────────────────────
const CHAR_POOL = '靜默霧雨夜冷暮歸潮影空惘茫渺渙寂晦悄忱忐忱悠寥曠淡涼涔淳潤湫渝沉惻悒愀慍愯憮憫黯沓徬徨惘悄悄遣徘徊靄靘霂霋';
function CharSeal({ seed = 'me', size = 96, palette }) {
  const p = palette || { ink: '#1d1b16', accent: '#8b2417' };
  const r = rand(seed, 3);
  const ch = CHAR_POOL[Math.floor(r[0] * CHAR_POOL.length)];
  return (
    <div style={{
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: p.accent,
      color: '#fbf5e4',
      fontFamily: '"Noto Serif TC", "Songti TC", serif',
      fontWeight: 700,
      fontSize: size * 0.62,
      lineHeight: 1,
      borderRadius: 4,
      boxShadow: `inset 0 0 0 2px ${p.accent}, 0 4px 16px rgba(0,0,0,0.12)`,
      letterSpacing: 0,
      userSelect: 'none',
    }}>
      <span style={{ marginTop: -2 }}>{ch}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 5. Just text — a short adjective only
// ──────────────────────────────────────────────────────
function TextOnly({ seed = 'me', size = 96, lang = 'zh', palette }) {
  const p = palette || { ink: '#2a2a35' };
  const r = rand(seed, 2);
  const word = (lang === 'en' ? ADJ_EN : ADJ_ZH)[Math.floor(r[0] * ADJ_ZH.length)];
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `0.5px solid ${p.line || 'rgba(0,0,0,0.15)'}`,
      color: p.ink,
      fontFamily: lang === 'en' ? '"EB Garamond", serif' : '"Noto Serif TC", serif',
      fontStyle: lang === 'en' ? 'italic' : 'normal',
      fontSize: size * 0.18, textAlign: 'center', padding: '0 10%',
      lineHeight: 1.2,
    }}>
      <span>{word}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Identity router — picks based on tweak setting
// ──────────────────────────────────────────────────────
function Identity({ kind = 'sigil', seed = 'today', size = 96, palette, lang = 'zh', trust = 0 }) {
  switch (kind) {
    case 'sigil':       return <Sigil seed={seed} size={size} palette={palette} />;
    case 'silhouette':  return <Silhouette seed={seed} size={size} palette={palette} trust={trust} />;
    case 'color+adj':   return <ColorAdj seed={seed} size={size} lang={lang} />;
    case 'character':   return <CharSeal seed={seed} size={size} palette={palette} />;
    case 'text':        return <TextOnly seed={seed} size={size} lang={lang} palette={palette} />;
    default:            return <Sigil seed={seed} size={size} palette={palette} />;
  }
}

Object.assign(window, {
  Sigil, Silhouette, ColorAdj, CharSeal, TextOnly, Identity,
  COLOR_NAMES_ZH, COLOR_NAMES_EN, ADJ_ZH, ADJ_EN, SWATCHES,
});
