// screen-loft.jsx — 夜閣 entry: sensual, atmospheric, NOT a rulebook
// Visual treatment is permanently velvet-black + candle gold, regardless of main palette.

// Hard-coded Loft palette — overrides whatever the main app is using
const LOFT_PALETTE = {
  bg:       'radial-gradient(ellipse at 50% 30%, #3a1f1f 0%, #1f1014 35%, #0b0608 80%)',
  ink:      '#f5e2c4',
  inkSoft:  'rgba(245, 226, 196, 0.85)',
  muted:    'rgba(245, 226, 196, 0.5)',
  faint:    'rgba(245, 226, 196, 0.25)',
  line:     'rgba(245, 226, 196, 0.12)',
  candle:   '#e8a557',
  ember:    '#c25a3b',
  velvet:   '#1f1014',
  glass:    'rgba(245, 226, 196, 0.05)',
  // pretend-palette shape for compat with existing components
  dark: true, accent: '#e8a557', accentSoft: 'rgba(232, 165, 87, 0.12)',
  bgSolid: '#1f1014', glassBlur: 18, danger: '#e8a557',
  statusDark: true,
};

function ScreenLoft({ p, lang, identityKind, seed, wicks, setWicks, onBack, onEnter, onUpgrade }) {
  const [inside, setInside] = React.useState(false);
  const [showBroke, setShowBroke] = React.useState(false);
  const BROKE_LINES = [
    { zh: '燭芯都沒有，就想進來取暖？', en: 'Not even a wick, and you want the warmth?' },
    { zh: '夜閣的門很重。誠意太輕，推不開。', en: 'This door is heavy. Light intentions won’t move it.' },
    { zh: '想被想念，先點得起一根燭。', en: 'To be wanted, first afford a candle.' },
    { zh: '這裡不施捨浪漫。', en: 'Romance is not given away here.' },
  ];
  const [brokeLine] = React.useState(() => BROKE_LINES[Math.floor(Math.random() * BROKE_LINES.length)]);

  if (inside) {
    return <LoftInside p={p} lang={lang} identityKind={identityKind} wicks={wicks} setWicks={setWicks} onBack={() => setInside(false)} onEnter={onEnter} />;
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: LOFT_PALETTE.bg,
      overflow: 'hidden',
      color: LOFT_PALETTE.ink,
      fontFamily: '"Noto Serif TC", serif',
    }}>
      {/* ambient candle pulse */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        width: 380, height: 380, marginLeft: -190, marginTop: -100,
        background: 'radial-gradient(circle, rgba(232,165,87,0.42), transparent 60%)',
        filter: 'blur(20px)',
        animation: 'loftFlicker 3.2s ease-in-out infinite alternate',
      }} />
      <style>{`
        @keyframes loftFlicker {
          0%   { opacity: 0.65; transform: scale(1); }
          50%  { opacity: 0.85; transform: scale(1.03); }
          100% { opacity: 0.7;  transform: scale(0.98); }
        }
        @keyframes velvetGrain {
          to { background-position: 100% 100%; }
        }
      `}</style>

      {/* velvet grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"200\\"><filter id=\\"n\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.8\\" numOctaves=\\"2\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\" opacity=\\"0.6\\"/></svg>")',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '56px 28px 32px',
      }}>
        {/* back, ultra-faint */}
        <button onClick={onBack} style={{
          alignSelf: 'flex-start',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: LOFT_PALETTE.muted, padding: '4px 0',
          fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 13,
          letterSpacing: '0.06em',
        }}>← {lang === 'en' ? 'back to the daylight' : '回到白天'}</button>

        {/* a single warm flame */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <Flame />
        </div>

        {/* Title — bigger, more spaced */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{
            fontFamily: '"Noto Serif TC", serif', fontSize: 44, fontWeight: 300,
            color: LOFT_PALETTE.ink, letterSpacing: '0.45em', marginRight: '-0.45em',
          }}>{t('loftName', lang)}</div>
          <div style={{
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 16, color: LOFT_PALETTE.candle, marginTop: 8,
            letterSpacing: '0.12em',
          }}>— {tAlt('loftName', lang)} —</div>
        </div>

        {/* The hook line — the real positioning */}
        <div style={{
          marginTop: 36, padding: '0 12px', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: '"Noto Serif TC", serif', fontSize: 22, lineHeight: 1.7,
            color: LOFT_PALETTE.ink, fontWeight: 300, letterSpacing: '0.04em',
          }}>{t('loftTagline', lang)}</div>
          <div style={{
            marginTop: 14,
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 14, color: LOFT_PALETTE.muted, lineHeight: 1.7,
          }}>{tAlt('loftTagline', lang)}</div>
          <div style={{
            marginTop: 26,
            fontFamily: '"Noto Serif TC", serif', fontSize: 14, lineHeight: 1.8,
            color: LOFT_PALETTE.inkSoft, letterSpacing: '0.05em',
          }}>{t('loftSub', lang)}</div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Single boundary line — the only "rule" */}
        <div style={{
          padding: '14px 16px',
          background: 'rgba(232, 165, 87, 0.05)',
          border: `0.5px solid rgba(232, 165, 87, 0.2)`,
          borderRadius: 12,
          marginBottom: 18,
        }}>
          <div style={{
            fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: LOFT_PALETTE.candle, marginBottom: 8,
          }}>{t('loftConsent', lang)}</div>
          <div style={{
            fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: LOFT_PALETTE.ink,
            lineHeight: 1.6, letterSpacing: '0.03em',
          }}>{t('loftLine1', lang)}</div>
          <div style={{
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 11.5, color: LOFT_PALETTE.muted, marginTop: 6, lineHeight: 1.5,
          }}>{t('loftLine2', lang)}</div>
        </div>

        {/* Push the door */}
        <button onClick={() => { if (wicks >= 5) { setWicks(wicks - 5); setInside(true); } else { setShowBroke(true); } }}
          style={{
            height: 60, borderRadius: 999,
            background: wicks >= 5
              ? 'linear-gradient(135deg, #e8a557, #c25a3b)'
              : 'rgba(245,226,196,0.08)',
            color: wicks >= 5 ? '#1f1014' : LOFT_PALETTE.faint,
            border: 'none', cursor: wicks >= 5 ? 'pointer' : 'not-allowed',
            fontFamily: '"Noto Serif TC", serif', fontSize: 17, fontWeight: 500,
            letterSpacing: '0.2em', marginRight: '-0.2em',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 14, position: 'relative',
            boxShadow: wicks >= 5 ? '0 8px 28px rgba(232,165,87,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
          }}>
          <span>{t('loftAgree', lang)}</span>
          <span style={{ width: 1, height: 20, background: 'rgba(31,16,20,0.3)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, opacity: 0.85, letterSpacing: 0 }}>
            <WickGlyph size={11} color={wicks >= 5 ? '#1f1014' : LOFT_PALETTE.faint}/>
            {t('loftCost', lang)}
          </span>
        </button>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: LOFT_PALETTE.muted, fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
          fontSize: 13, padding: '14px 0 0',
        }}>{t('loftBack', lang)}</button>
      </div>

      {/* BROKE SHEET — not enough wicks */}
      {showBroke && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 95,
          background: 'rgba(11,6,8,0.8)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}>
          <div style={{
            width: '100%', background: '#1f1014',
            border: '0.5px solid rgba(232,165,87,0.3)', borderRadius: 24,
            padding: '30px 26px', textAlign: 'center',
          }}>
            {/* extinguished candle */}
            <svg width="40" height="56" viewBox="0 0 40 56" style={{ margin: '0 auto', display: 'block' }}>
              <path d="M20 4 Q 23 8 21 11 Q 19 13 18 10 Q 17 7 20 4" fill="none" stroke="rgba(245,226,196,0.4)" strokeWidth="1"/>
              <rect x="16" y="16" width="8" height="30" rx="1" fill="rgba(245,226,196,0.35)"/>
              <ellipse cx="20" cy="50" rx="11" ry="2" fill="rgba(232,165,87,0.12)"/>
            </svg>
            <div style={{
              marginTop: 18, fontFamily: '"Noto Serif TC", serif',
              fontSize: 19, color: '#f5e2c4', lineHeight: 1.7, letterSpacing: '0.04em',
            }}>{lang === 'en' ? brokeLine.en : brokeLine.zh}</div>
            <div style={{
              marginTop: 8, fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 12, color: 'rgba(245,226,196,0.5)',
            }}>{lang === 'en' ? brokeLine.zh : brokeLine.en}</div>
            <div style={{
              marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'Inter', fontSize: 11, color: 'rgba(245,226,196,0.55)',
            }}>
              <WickGlyph size={10} color="#e8a557"/>
              {lang === 'en' ? `you have ${wicks} · the door asks 5` : `你有 ${wicks} 芯 · 這扇門要 5 芯`}
            </div>
            <button onClick={onUpgrade} style={{
              marginTop: 20, width: '100%', height: 52, borderRadius: 999,
              background: 'linear-gradient(135deg, #e8a557, #c25a3b)', color: '#1f1014',
              border: 'none', cursor: 'pointer',
              fontFamily: '"Noto Serif TC", serif', fontSize: 15, fontWeight: 500, letterSpacing: '0.1em',
            }}>{lang === 'en' ? 'Buy wicks' : '去買燭芯'}</button>
            <button onClick={() => setShowBroke(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(245,226,196,0.5)', fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 13, padding: '14px 0 0', width: '100%',
            }}>{lang === 'en' ? 'walk away' : '轉身離開'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Single candle flame, animated
function Flame() {
  return (
    <div style={{ position: 'relative', width: 60, height: 92 }}>
      {/* glow halo */}
      <div style={{
        position: 'absolute', inset: -30,
        background: 'radial-gradient(circle, rgba(232,165,87,0.5), transparent 60%)',
        filter: 'blur(8px)',
        animation: 'loftFlicker 2.4s ease-in-out infinite alternate',
      }}/>
      {/* flame */}
      <svg width="60" height="92" viewBox="0 0 60 92" style={{ position: 'relative' }}>
        <defs>
          <radialGradient id="flameG" cx="50%" cy="65%" r="55%">
            <stop offset="0%" stopColor="#fff5dc" />
            <stop offset="40%" stopColor="#ffd28a" />
            <stop offset="75%" stopColor="#e8a557" />
            <stop offset="100%" stopColor="#c25a3b" stopOpacity="0.6" />
          </radialGradient>
        </defs>
        <path d="M30 6 C 36 22 46 28 46 44 C 46 56 39 65 30 65 C 21 65 14 56 14 44 C 14 28 24 22 30 6 Z"
          fill="url(#flameG)" style={{ transformOrigin: '30px 50px', animation: 'loftFlicker 1.8s ease-in-out infinite alternate' }} />
        {/* candle */}
        <rect x="26" y="62" width="8" height="22" rx="1" fill="#f5e2c4" opacity="0.85"/>
        <rect x="26" y="62" width="8" height="3" fill="#d4b890" />
        <ellipse cx="30" cy="88" rx="14" ry="2" fill="#e8a557" opacity="0.15"/>
      </svg>
    </div>
  );
}

// LIST of people lingering — drives entry into 1:1 loft chat
function LoftInside({ p, lang, identityKind, wicks, setWicks, onBack, onEnter }) {
  const tonight = [
    { seed: 'l01', zh: '今天他出差。屋子很安靜。', en: 'He travels tonight. The house is quiet.', who_zh: '酒紅的長椅', who_en: 'wine, long-bench' },
    { seed: 'l02', zh: '婚後第七年，沒有人問過我想被怎麼樣對待。', en: 'Seven years married. No one has asked how I want to be touched.', who_zh: '炭灰的舊書', who_en: 'charcoal, old-book' },
    { seed: 'l03', zh: '不是想出軌。是想被當成一個有慾望的人。', en: 'Not seeking. Just to be wanted as someone with desire.', who_zh: '蜜色的走廊', who_en: 'honey, corridor' },
    { seed: 'l04', zh: '今晚不想當太太。', en: 'Tonight I don\u2019t want to be a wife.', who_zh: '夜雨的玫', who_en: 'night-rain, rose' },
  ];
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: LOFT_PALETTE.bg,
      overflow: 'hidden',
      color: LOFT_PALETTE.ink,
      fontFamily: '"Noto Serif TC", serif',
    }}>
      {/* film + grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.55,
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"200\\"><filter id=\\"n\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.85\\" numOctaves=\\"2\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\" opacity=\\"0.55\\"/></svg>")',
        mixBlendMode: 'overlay', pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column', padding: '54px 22px 28px',
      }}>
        {/* TOP */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{
            background: 'rgba(245,226,196,0.05)', border: '0.5px solid rgba(245,226,196,0.12)',
            color: LOFT_PALETTE.muted, width: 36, height: 36, borderRadius: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="8" height="14" viewBox="0 0 8 14"><path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 18, color: LOFT_PALETTE.ink, letterSpacing: '0.3em', marginRight: '-0.3em' }}>
              {t('loftName', lang)}
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.25em', color: LOFT_PALETTE.candle, textTransform: 'uppercase', marginTop: 3 }}>
              {t('loftClose', lang)}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'rgba(232,165,87,0.1)', borderRadius: 999 }}>
            <WickGlyph size={10} color={LOFT_PALETTE.candle}/>
            <span style={{ fontFamily: 'Inter', fontSize: 11, color: LOFT_PALETTE.candle, fontVariantNumeric: 'tabular-nums' }}>{wicks}</span>
          </div>
        </div>

        {/* heading */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontFamily: 'Inter', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: LOFT_PALETTE.candle,
          }}>{t('loftPeople', lang)}</div>
          <div style={{
            marginTop: 4,
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 12, color: LOFT_PALETTE.muted, letterSpacing: '0.05em',
          }}>{tAlt('loftPeople', lang)}</div>
        </div>

        {/* listing */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
          {tonight.map((m) => (
            <div key={m.seed} onClick={onEnter} style={{
              display: 'flex', gap: 16, padding: '14px 14px',
              background: 'linear-gradient(135deg, rgba(245,226,196,0.04), rgba(232,165,87,0.06))',
              border: '0.5px solid rgba(232,165,87,0.18)',
              borderRadius: 18, cursor: 'pointer',
              position: 'relative',
            }}>
              {/* deeply veiled portrait */}
              <div style={{
                width: 60, height: 80, borderRadius: 10,
                background: `linear-gradient(170deg, ${['#7a3a4a','#5a2a3a','#6a3838','#8b4a3a'][parseInt(m.seed.slice(-2)) % 4]}, #2a1418)`,
                position: 'relative', overflow: 'hidden', flexShrink: 0,
                filter: 'blur(2.5px)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(circle at 50% 30%, rgba(255,200,160,0.45), transparent 50%)',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: '"Noto Serif TC", serif', fontSize: 14.5, color: LOFT_PALETTE.ink,
                  lineHeight: 1.55, letterSpacing: '0.02em',
                }}>「{lang === 'en' ? m.en : m.zh}」</div>
                <div style={{
                  marginTop: 6, display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
                  fontSize: 11, color: LOFT_PALETTE.muted, letterSpacing: '0.04em',
                }}>
                  <span>{lang === 'en' ? m.who_en : m.who_zh}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: LOFT_PALETTE.candle }}>● {lang === 'en' ? 'open' : '門開'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* boundary footer */}
        <div style={{
          marginTop: 14,
          fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
          fontSize: 11, color: LOFT_PALETTE.faint, textAlign: 'center', lineHeight: 1.7,
        }}>
          {t('loftLine1', lang)} · {t('loftLine2', lang)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenLoft, LOFT_PALETTE });
