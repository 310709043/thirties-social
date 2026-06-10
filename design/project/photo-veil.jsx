// photo-veil.jsx — photo with 4 progressively-lifted veils
// Renders an `image-slot` style placeholder + four veil layers controlled by `liftLevel` 0-4.

function PhotoVeil({ p, liftLevel = 0, size = 220, imgUrl, lang }) {
  // map lift level 0..4 → blur radius and overlay opacity
  const map = [
    { blur: 32, satur: 0.3, dim: 0.35, label_zh: '完全覆蓋', label_en: 'fully veiled' },
    { blur: 22, satur: 0.4, dim: 0.28, label_zh: '輪廓',     label_en: 'outline' },
    { blur: 12, satur: 0.5, dim: 0.18, label_zh: '光與影',   label_en: 'light & shadow' },
    { blur: 6,  satur: 0.7, dim: 0.08, label_zh: '局部',     label_en: 'fragments' },
    { blur: 0,  satur: 1.0, dim: 0,    label_zh: '完整',     label_en: 'full' },
  ][Math.max(0, Math.min(4, liftLevel))];

  // synthetic placeholder image — a gradient that looks vaguely like a portrait
  const fallback = (
    <div style={{
      width: '100%', height: '100%',
      background: `
        radial-gradient(circle at 50% 32%, #f3d6c2 0%, #c79e83 24%, #8a5c46 38%, transparent 39%),
        radial-gradient(ellipse at 50% 72%, #4a3b52 0%, #2f2638 40%, transparent 42%),
        linear-gradient(180deg, ${p.dark ? '#1a1830' : '#e9dfd2'}, ${p.dark ? '#2a2840' : '#cdb89e'})
      `,
    }} />
  );

  return (
    <div style={{
      position: 'relative',
      width: size, height: size, borderRadius: 24,
      overflow: 'hidden',
      border: `0.5px solid ${p.line}`,
      boxShadow: p.dark
        ? '0 12px 32px rgba(0,0,0,0.4)'
        : '0 12px 28px rgba(40,30,40,0.18)',
    }}>
      {/* image with applied filter */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: `blur(${map.blur}px) saturate(${map.satur}) brightness(${1 - map.dim})`,
        transform: `scale(${1 + map.blur / 100})`,
      }}>
        {imgUrl
          ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : fallback}
      </div>

      {/* gauze overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${p.accent}${Math.round(map.dim * 255).toString(16).padStart(2,'0')}, transparent 60%)`,
        mixBlendMode: 'overlay',
      }} />

      {/* fine cross-hatch — a "fabric" texture for the veil */}
      {liftLevel < 4 && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, ${p.dark ? '#ffffff' : '#000000'}06 0 1px, transparent 1px 6px),
                            repeating-linear-gradient(-45deg, ${p.dark ? '#ffffff' : '#000000'}05 0 1px, transparent 1px 8px)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* layer indicator stack — bottom-left */}
      <div style={{
        position: 'absolute', left: 12, bottom: 12,
        display: 'flex', gap: 3,
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 18, height: 3, borderRadius: 2,
            background: i < liftLevel ? '#ffffff99' : '#ffffff33',
            backdropFilter: 'blur(8px)',
          }} />
        ))}
      </div>

      {/* layer label — top-right pill */}
      <div style={{
        position: 'absolute', right: 12, top: 12,
        padding: '4px 10px',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 999,
        color: '#fff',
        fontFamily: '"Noto Serif TC", serif',
        fontSize: 11, letterSpacing: '0.02em',
      }}>
        {lang === 'en' ? map.label_en : map.label_zh}
      </div>
    </div>
  );
}

// Modal-style veil controller (used inside chat)
function PhotoVeilSheet({ p, lang, liftLevel, setLift, wicks, setWicks, onClose, fromMe = false }) {
  const next = liftLevel < 4 ? liftLevel + 1 : null;
  const labels = ['veilLift1', 'veilLift2', 'veilLift3', 'veilLift4'];
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: p.dark ? 'rgba(10,12,28,0.72)' : 'rgba(180,170,190,0.45)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      zIndex: 80,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div onClick={onClose} style={{ flex: 1, cursor: 'pointer' }} />
      <div style={{
        background: p.bgSolid,
        borderRadius: '28px 28px 0 0',
        padding: '22px 22px 30px',
        borderTop: `0.5px solid ${p.line}`,
        boxShadow: '0 -20px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 4,
          background: p.line, margin: '0 auto 16px',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <PhotoVeil p={p} liftLevel={liftLevel} size={200} lang={lang} />

          <div style={{ textAlign: 'center', maxWidth: 280 }}>
            <Bilingual k="veilTitle" lang={lang} size={20} weight={500} color={p.ink} altOpacity={0.45} altSize={0.55} align="center" />
            <div style={{
              marginTop: 8,
              fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.muted,
              lineHeight: 1.55,
            }}>{t('veilOnlyHere', lang)}</div>
          </div>

          {/* Lift control — only shown to receiver. fromMe = the sender, can't lift their own. */}
          {!fromMe && next !== null && (
            <button
              onClick={() => {
                if (wicks >= 2) { setLift(next); setWicks(wicks - 2); }
              }}
              disabled={wicks < 2}
              style={{
                width: '100%', height: 52, borderRadius: 16,
                background: wicks >= 2 ? p.ink : p.line,
                color: wicks >= 2 ? (p.dark ? '#15172e' : '#fbf5e4') : p.muted,
                border: 'none', cursor: wicks >= 2 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 18px',
                fontFamily: '"Noto Serif TC", serif', fontSize: 15,
              }}>
              <span>{t(labels[next - 1], lang)}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, opacity: 0.75,
              }}>
                <WickGlyph size={12} color={wicks >= 2 ? (p.dark ? '#15172e' : '#fbf5e4') : p.muted} />
                {t('veilCost', lang)}
              </span>
            </button>
          )}

          {next === null && (
            <div style={{
              padding: '12px 16px', background: p.accentSoft, borderRadius: 12,
              fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.ink,
              textAlign: 'center', width: '100%',
            }}>
              {lang === 'en' ? 'Fully revealed · gone when this chat ends' : '已全部揭曉 · 對話結束即消失'}
            </div>
          )}

          {fromMe && (
            <div style={{
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 13, color: p.muted, textAlign: 'center', marginTop: -2,
            }}>
              {lang === 'en' ? 'You sent this. Only they can lift veils.' : '你送出的。只有對方能揭。'}
            </div>
          )}

          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: p.muted,
            fontFamily: '"Noto Serif TC", serif', fontSize: 13, padding: 8, cursor: 'pointer',
          }}>{lang === 'en' ? 'close' : '關上'}</button>
        </div>
      </div>
    </div>
  );
}

// Small candle/wick glyph used for points
function WickGlyph({ size = 14, color = '#e0c08a' }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 14 20">
      <path d="M7 1 C 8.5 4 10 5 10 7.5 C 10 9.5 8.8 11 7 11 C 5.2 11 4 9.5 4 7.5 C 4 5 5.5 4 7 1 Z"
        fill={color} opacity="0.95"/>
      <rect x="6" y="11" width="2" height="6" rx="0.5" fill={color} opacity="0.5"/>
      <ellipse cx="7" cy="18" rx="3" ry="0.8" fill={color} opacity="0.2"/>
    </svg>
  );
}

Object.assign(window, { PhotoVeil, PhotoVeilSheet, WickGlyph });
