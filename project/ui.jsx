// ui.jsx — shared building blocks for screens
// All these accept `p` (palette from DIRECTIONS), `lang`, `density` props.

// ───────────────────────────────────────────────
// VaporBackground — fills the iOS device with palette-aware mist
// ───────────────────────────────────────────────
function VaporBackground({ p, children, style = {} }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: p.bg,
      overflow: 'hidden',
      ...style,
    }}>
      {/* drifting blurred orbs */}
      <div style={{
        position: 'absolute', top: '8%', left: '-20%',
        width: '90%', aspectRatio: '1',
        background: `radial-gradient(circle, ${p.accent}66, transparent 55%)`,
        filter: 'blur(50px)',
        opacity: 0.55,
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', right: '-30%',
        width: '110%', aspectRatio: '1',
        background: `radial-gradient(circle, ${p.accent}55, transparent 60%)`,
        filter: 'blur(60px)',
        opacity: 0.4,
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '20%',
        width: '70%', aspectRatio: '1',
        background: `radial-gradient(circle, ${p.dark ? '#9d8bd6' : '#dbe3f0'}55, transparent 55%)`,
        filter: 'blur(70px)',
        opacity: 0.35,
      }} />
      {/* film grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"200\\"><filter id=\\"n\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.85\\" numOctaves=\\"2\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\" opacity=\\"0.5\\"/></svg>")',
        mixBlendMode: p.dark ? 'overlay' : 'multiply',
        opacity: p.dark ? 0.15 : 0.08,
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

// ───────────────────────────────────────────────
// GlassCard — frosted surface
// ───────────────────────────────────────────────
function GlassCard({ p, children, style = {}, padding = 20, radius = 28, onClick }) {
  return (
    <div onClick={onClick} style={{
      position: 'relative',
      background: p.glass,
      backdropFilter: `blur(${p.glassBlur}px) saturate(140%)`,
      WebkitBackdropFilter: `blur(${p.glassBlur}px) saturate(140%)`,
      border: `0.5px solid ${p.line}`,
      borderRadius: radius,
      padding,
      boxShadow: p.dark
        ? '0 8px 32px rgba(0,0,0,0.25), inset 0 0.5px 0 rgba(255,255,255,0.08)'
        : '0 8px 24px rgba(50,40,60,0.06), inset 0 0.5px 0 rgba(255,255,255,0.6)',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ───────────────────────────────────────────────
// Display H + body text (Chinese primary + English ghost)
// ───────────────────────────────────────────────
function Bilingual({ k, lang = 'zh', primary = 'serif', size = 28, weight = 400, lineHeight = 1.35, color, altOpacity = 0.4, altSize = 0.45, gap = 6, align = 'left', style = {} }) {
  // primary = serif | sans
  const primaryFam = primary === 'sans' ? '"Inter", system-ui, sans-serif' : '"Noto Serif TC", serif';
  const altFam = lang === 'en' ? '"Noto Serif TC", serif' : '"EB Garamond", serif';
  const altItalic = lang === 'zh';
  return (
    <div style={{ textAlign: align, ...style }}>
      <div style={{
        fontFamily: primaryFam, fontSize: size, fontWeight: weight,
        lineHeight, color, letterSpacing: lang === 'zh' ? 0.02 + 'em' : '-0.005em',
      }}>{t(k, lang)}</div>
      {tAlt(k, lang) && (
        <div style={{
          marginTop: gap,
          fontFamily: altFam,
          fontStyle: altItalic ? 'italic' : 'normal',
          fontSize: size * altSize, fontWeight: 400,
          color, opacity: altOpacity, lineHeight: 1.3,
          letterSpacing: lang === 'zh' ? '-0.005em' : 0.02 + 'em',
        }}>{tAlt(k, lang)}</div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Soft pill button
// ───────────────────────────────────────────────
function SoftButton({ p, children, onClick, variant = 'primary', size = 'md', full = false, style = {} }) {
  const sizes = {
    sm: { h: 36, fs: 13, pad: '0 14px' },
    md: { h: 48, fs: 15, pad: '0 22px' },
    lg: { h: 56, fs: 16, pad: '0 28px' },
  }[size];
  const variants = {
    primary: {
      background: p.ink,
      color: p.dark ? '#1a1530' : (p.surfaceSolid || '#fff'),
      border: 'none',
      boxShadow: p.dark ? '0 4px 16px rgba(224,192,138,0.15)' : '0 6px 20px rgba(30,30,40,0.18)',
    },
    secondary: {
      background: p.surface,
      color: p.ink,
      border: `0.5px solid ${p.line}`,
      backdropFilter: `blur(${p.glassBlur}px)`,
      WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
    },
    ghost: {
      background: 'transparent',
      color: p.muted,
      border: `0.5px solid ${p.line}`,
    },
    accent: {
      background: p.accent,
      color: p.dark ? '#15172e' : '#fbf5e4',
      border: 'none',
    },
    danger: {
      background: 'transparent',
      color: p.danger,
      border: `0.5px solid ${p.danger}40`,
    },
  }[variant];
  return (
    <button onClick={onClick} style={{
      height: sizes.h, padding: sizes.pad, borderRadius: 999,
      fontSize: sizes.fs, fontWeight: 500,
      fontFamily: '"Noto Serif TC", "Inter", serif',
      cursor: 'pointer',
      width: full ? '100%' : undefined,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8,
      transition: 'transform 0.15s, opacity 0.2s',
      ...variants, ...style,
    }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </button>
  );
}

// ───────────────────────────────────────────────
// Subtle top "back" / contextual chrome
// ───────────────────────────────────────────────
function TopChrome({ p, leading, trailing, style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 22px', minHeight: 44,
      position: 'relative', zIndex: 5,
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: p.muted, fontSize: 13 }}>
        {leading}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: p.muted, fontSize: 13 }}>
        {trailing}
      </div>
    </div>
  );
}

// dot icon used as breath indicator
function BreathDot({ p, size = 8 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: p.accent,
      boxShadow: `0 0 ${size * 1.5}px ${p.accent}aa`,
      animation: 'breath 4s ease-in-out infinite',
    }}>
      <style>{`@keyframes breath {
        0%, 100% { transform: scale(0.85); opacity: 0.55; }
        50%      { transform: scale(1.1);  opacity: 1; }
      }`}</style>
    </div>
  );
}

// Hairline divider
function Hairline({ p, vertical = false, opacity = 1, style = {} }) {
  return <div style={{
    background: p.line,
    opacity,
    width: vertical ? 0.5 : '100%',
    height: vertical ? '100%' : 0.5,
    ...style,
  }} />;
}

// Small caps label
function Cap({ children, p, style = {} }) {
  return (
    <div style={{
      fontFamily: '"Inter", system-ui',
      fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
      color: p.muted, fontWeight: 500,
      ...style,
    }}>{children}</div>
  );
}

// Countdown ring (used in match + chat top bar)
function CountdownRing({ p, progress = 0.5, size = 36, stroke = 2, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={p.line} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={p.accent} strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
      {children && <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: p.muted,
      }}>{children}</div>}
    </div>
  );
}

Object.assign(window, {
  VaporBackground, GlassCard, Bilingual, SoftButton, TopChrome,
  BreathDot, Hairline, Cap, CountdownRing,
});
