// screen-chat.jsx — 1:1 ephemeral chat with whole-conversation countdown

function ScreenChat({ p, lang, identityKind, seed, expiryStyle, onSafety, onClose, density, wicks, setWicks, onUpgrade }) {
  const [veilOpen, setVeilOpen] = React.useState(false);
  const [veilFromMe, setVeilFromMe] = React.useState(false);
  const [liftLevel, setLiftLevel] = React.useState(1); // current visible level
  const otherSeed = 'm0od7';
  const [remaining, setRemaining] = React.useState(28 * 60 + 14); // 28:14
  const total = 30 * 60;
  React.useEffect(() => {
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = remaining / total;

  const messages = [
    { from: 'other', text_zh: '謝謝你願意聽。', text_en: 'Thank you for being here.', t: '−27:50', age: 0.05 },
    { from: 'me',    text_zh: '我也是。最近什麼都不太想跟身邊的人說。', text_en: "Me too. Lately I don't want to tell anyone close to me.", t: '−27:12', age: 0.1 },
    { from: 'other', text_zh: '你寫的那句，「睡同一張床卻像隔了一條河」⋯⋯', text_en: '"Same bed, but feels like a river between us"…', t: '−25:30', age: 0.18 },
    { from: 'other', text_zh: '我也是這樣。',                                 text_en: 'I feel the same.', t: '−25:24', age: 0.18 },
    { from: 'me',    text_zh: '不是不愛了。是疲倦。',                        text_en: "Not unlove. Just tired.", t: '−23:08', age: 0.27 },
    { from: 'other', text_zh: '今天他下班沒說一句話就去睡了。',              text_en: 'Today he came home, said nothing, went to bed.', t: '−21:11', age: 0.34 },
  ];

  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        color: p.ink,
      }}>
        {/* Anti-screenshot watermark — barely visible diagonal */}
        <AntiShotWatermark p={p} seed={seed} />

        {/* TOP — countdown header (whole-convo timer) */}
        <div style={{
          padding: '54px 18px 14px',
          background: p.dark
            ? 'linear-gradient(to bottom, rgba(13,18,36,0.92), transparent)'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.75), transparent)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          position: 'relative', zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 6, color: p.muted, display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: '"Noto Serif TC", serif', fontSize: 13,
            }}>
              <svg width="8" height="14" viewBox="0 0 8 14"><path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </button>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Identity kind={identityKind} seed={otherSeed} size={28} palette={p} lang={lang} trust={0.25} />
              <div style={{
                fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.inkSoft,
              }}>
                <ColorAdj seed={otherSeed} lang={lang} showSwatch={false} />
              </div>
            </div>
            <button onClick={onSafety} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: p.muted,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M9 5 V 9.5 M9 12 V 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* COUNTDOWN BAR */}
          <div style={{ marginTop: 18, padding: '0 6px' }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <Cap p={p}>{t('chatRemaining', lang)}</Cap>
              <div style={{
                fontFamily: 'Inter', fontSize: 22, fontWeight: 300, color: p.ink,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
              }}>
                {mm}<span style={{ opacity: 0.4, margin: '0 1px' }}>:</span>{ss}
              </div>
            </div>
            <div style={{ position: 'relative', height: 2, background: p.line, borderRadius: 2 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: 2, borderRadius: 2,
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${p.accent}, ${p.accent}66)`,
                transition: 'width 1s linear',
              }} />
            </div>
            <div style={{
              marginTop: 8, fontFamily: lang==='en'?'"Noto Serif TC", serif':'"EB Garamond", serif',
              fontStyle: lang==='en'?'normal':'italic',
              fontSize: 11, color: p.muted, textAlign: 'center', opacity: 0.7,
            }}>
              {lang === 'en'
                ? 'when this reaches zero, the entire conversation dissolves.'
                : '歸零之後，整段對話會全部消散。'}
            </div>
          </div>
        </div>

        {/* MESSAGES */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 20px 14px',
          display: 'flex', flexDirection: 'column', gap: density === 'dense' ? 8 : 14,
        }}>
          {/* day-opener divider */}
          <div style={{
            textAlign: 'center', fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 11, color: p.muted, opacity: 0.7, margin: '4px 0 10px',
          }}>
            {lang === 'en' ? 'opened at 23:47 · ends at 00:17' : '23:47 開啟 · 00:17 結束'}
          </div>

          {messages.map((m, i) => (
            <ChatBubble key={i} p={p} m={m} lang={lang} expiryStyle={expiryStyle} />
          ))}

          {/* received photo veil (clickable) */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
            <div onClick={() => { setVeilFromMe(false); setVeilOpen(true); }} style={{ cursor: 'pointer' }}>
              <PhotoVeil p={p} liftLevel={liftLevel} size={150} lang={lang} />
              <div style={{
                marginTop: 6, paddingLeft: 4,
                fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
                fontSize: 11, color: p.muted, opacity: 0.8,
              }}>
                {lang === 'en' ? `tap to lift · ${4 - liftLevel} left` : `輕點揭曉 · 還剩 ${4 - liftLevel} 層`}
              </div>
            </div>
          </div>

          {/* typing indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, opacity: 0.7 }}>
            <Identity kind={identityKind === 'character' ? 'sigil' : identityKind}
              seed={otherSeed} size={20} palette={p} lang={lang} trust={0.25} />
            <div style={{
              padding: '8px 14px', borderRadius: 16,
              background: p.surface, border: `0.5px solid ${p.line}`,
              backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
              display: 'flex', gap: 4,
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: 5, background: p.muted,
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}/>
              ))}
              <style>{`@keyframes pulse {
                0%, 60%, 100% { opacity: 0.3; }
                30%           { opacity: 1; }
              }`}</style>
            </div>
          </div>
        </div>

        {/* CONSENT / REVEAL bar — sends a veiled photo */}
        <div style={{
          margin: '0 18px 8px', padding: '10px 12px',
          background: p.accentSoft,
          border: `0.5px solid ${p.accent}40`,
          borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            overflow: 'hidden', flexShrink: 0,
            border: `0.5px solid ${p.accent}40`,
          }}>
            <PhotoVeil p={p} liftLevel={0} size={36} lang={lang} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.ink, lineHeight: 1.4,
            }}>{t('veilTitle', lang)}</div>
            <div style={{
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 10, color: p.muted, marginTop: 1,
            }}>{t('veilOnlyHere', lang)}</div>
          </div>
          <button onClick={() => { setVeilFromMe(true); setVeilOpen(true); }} style={{
            background: p.accent, color: p.dark ? '#15172e' : '#fbf5e4',
            border: 'none', padding: '6px 12px', borderRadius: 999,
            fontFamily: '"Noto Serif TC", serif', fontSize: 12,
            cursor: 'pointer', flexShrink: 0,
          }}>{t('veilSend', lang)}</button>
        </div>

        {/* PHOTO VEIL SHEET */}
        {veilOpen && (
          <PhotoVeilSheet p={p} lang={lang}
            liftLevel={liftLevel} setLift={setLiftLevel}
            wicks={wicks} setWicks={setWicks}
            fromMe={veilFromMe}
            onClose={() => setVeilOpen(false)} />
        )}

        {/* COMPOSER */}
        <div style={{ padding: '4px 18px 18px' }}>
          <GlassCard p={p} padding={6} radius={28} style={{
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <input placeholder={t('chatPlaceholder', lang)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                color: p.ink, fontFamily: '"Noto Serif TC", serif',
                fontSize: 15, padding: '12px 14px',
              }} />
            <button style={{
              width: 38, height: 38, borderRadius: 38,
              background: p.ink, color: p.dark ? '#1a1530' : '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 2 V 12 M3 6 L7 2 L11 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </GlassCard>
        </div>
      </div>
    </VaporBackground>
  );
}

function ChatBubble({ p, m, lang, expiryStyle }) {
  const me = m.from === 'me';
  // expiry visualization options
  const styleOverrides = {};
  if (expiryStyle === 'fade') styleOverrides.opacity = Math.max(0.35, 1 - m.age * 1.2);
  if (expiryStyle === 'ink')  styleOverrides.filter = `blur(${m.age * 1.5}px)`;
  return (
    <div style={{
      display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end', gap: 6,
    }}>
      <div style={{
        maxWidth: '78%',
        background: me
          ? `linear-gradient(135deg, ${p.accent}, ${p.accent}cc)`
          : p.surface,
        backdropFilter: me ? 'none' : `blur(${p.glassBlur}px)`,
        WebkitBackdropFilter: me ? 'none' : `blur(${p.glassBlur}px)`,
        color: me ? (p.dark ? '#15172e' : '#fbf5e4') : p.ink,
        border: me ? 'none' : `0.5px solid ${p.line}`,
        padding: '10px 15px',
        borderRadius: me ? '22px 22px 6px 22px' : '22px 22px 22px 6px',
        fontFamily: '"Noto Serif TC", serif',
        fontSize: 15, lineHeight: 1.5,
        boxShadow: me ? `0 6px 16px ${p.accent}40` : 'none',
        ...styleOverrides,
      }}>
        {lang === 'en' ? m.text_en : m.text_zh}
        {expiryStyle === 'ring' && (
          <div style={{
            position: 'absolute', right: -6, bottom: -6,
          }}>
            <CountdownRing p={p} progress={1 - m.age} size={14} stroke={1.5}/>
          </div>
        )}
      </div>
    </div>
  );
}

// Anti-screenshot watermark — diagonal repeating session id, ultra-faint
function AntiShotWatermark({ p, seed }) {
  const sessionId = (seed || 'today').slice(0, 6);
  const t = new Date();
  const stamp = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  const line = `第卅者 · ephemeral · session ${sessionId} · ${stamp}`;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', zIndex: 30,
      overflow: 'hidden',
      opacity: p.dark ? 0.045 : 0.06,
    }}>
      <div style={{
        position: 'absolute', inset: '-30%',
        transform: 'rotate(-22deg)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        rowGap: 80,
        color: p.ink,
        fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
        fontSize: 11, letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
      }}>
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} style={{ textAlign: 'center' }}>{line}</div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenChat, AntiShotWatermark });
