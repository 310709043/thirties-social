// screen-loft-chat.jsx — the actual 1:1 Loft chat
// Dramatically different from regular chat: veiled portrait dominates, italic handwritten text,
// "pulse" buttons (single-word emotional signals) cost 1 wick each — the monetization driver.

function ScreenLoftChat({ p, lang, identityKind, seed, wicks, setWicks, onBack, onPeek, viewpoint = 'm' }) {
  const isF = viewpoint === 'f';
  const P = LOFT_PALETTE;
  const otherSeed = 'loft_r1';
  const [veilLevel, setVeilLevel] = React.useState(1);
  const [pulses, setPulses] = React.useState([]);   // sent quick pulses
  const [showPulse, setShowPulse] = React.useState(null); // last received pulse
  const [remaining, setRemaining] = React.useState(58 * 60 + 14);
  const [showGift, setShowGift] = React.useState(false);
  const [giftSent, setGiftSent] = React.useState(false);
  const [showRequests, setShowRequests] = React.useState(false);
  const [requests, setRequests] = React.useState([]); // {id, kind, cost, status: pending|accepted|declined}
  React.useEffect(() => {
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');

  const messages = [
    { from: 'other', zh: '你還醒著。', en: 'You\u2019re still awake.' },
    { from: 'me',    zh: '今天身邊那個人，沒問我一句話。', en: 'The one beside me asked nothing today.' },
    { from: 'other', zh: '我聽得到你的呼吸。', en: 'I can hear you breathing.' },
    { from: 'me',    zh: '我不知道我在等什麼。', en: 'I don\u2019t know what I\u2019m waiting for.' },
    { from: 'other', zh: '等一個人，先看你一眼。', en: 'For someone to look at you, before anything else.' },
  ];

  const pulseOptions = [
    { key: 'loftPulse1', em: '♡' },
    { key: 'loftPulse2', em: '⤳' },
    { key: 'loftPulse3', em: '☾' },
    { key: 'loftPulse4', em: '⊙' },
  ];

  const sendPulse = (key, em) => {
    if (wicks < 1) return;
    setWicks(wicks - 1);
    const id = Date.now() + Math.random();
    setPulses(ps => [...ps, { id, key, em }]);
    // auto receive a pulse back after a moment
    setTimeout(() => setShowPulse({ id: id + 'r', key, em }), 1400);
  };

  // asymmetric requests — wicks only consumed when SHE agrees
  const REQUEST_KINDS = [
    { kind: 'photo',   cost: 3,  zh: '請她傳一張照片', en: 'Ask for a photo' },
    { kind: 'voice',   cost: 2,  zh: '請她說一段語音', en: 'Ask for a voice note' },
    { kind: 'extend',  cost: 5,  zh: '請求延長 30 分', en: 'Ask to extend 30 min' },
    { kind: 'contact', cost: 20, zh: '請求交換聯絡', en: 'Ask to exchange contact' },
  ];
  const sendRequest = (rq) => {
    if (wicks < rq.cost) return;
    const id = Date.now();
    setRequests(rs => [...rs, { id, ...rq, status: 'pending' }]);
    setShowRequests(false);
    // demo: she accepts after 2.2s — wicks consumed ON acceptance
    setTimeout(() => {
      setRequests(rs => rs.map(r => r.id === id ? { ...r, status: 'accepted' } : r));
      setWicks(w => w - rq.cost);
      if (rq.kind === 'extend') setRemaining(r => r + 30 * 60);
    }, 2200);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: P.bg,
      overflow: 'hidden',
      color: P.ink, fontFamily: '"Noto Serif TC", serif',
    }}>
      {/* candle glow ambient */}
      <div style={{
        position: 'absolute', top: '12%', left: '50%', width: 320, height: 320,
        marginLeft: -160,
        background: 'radial-gradient(circle, rgba(232,165,87,0.28), transparent 60%)',
        filter: 'blur(30px)',
        animation: 'loftFlicker 3.2s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }}/>
      <style>{`
        @keyframes pulseUp {
          from { opacity: 0; transform: translateY(20px) scale(0.7); }
          50%  { opacity: 1; }
          to   { opacity: 0; transform: translateY(-80px) scale(1.1); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.55,
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"200\\"><filter id=\\"n\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.85\\" numOctaves=\\"2\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\" opacity=\\"0.5\\"/></svg>")',
        mixBlendMode: 'overlay', pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* TOP — countdown + back + wick balance */}
        <div style={{
          padding: '52px 18px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onBack} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: P.muted, padding: 6,
          }}>
            <svg width="12" height="20" viewBox="0 0 12 20"><path d="M9 2 L2 10 L9 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase',
              color: P.candle, marginBottom: 3,
            }}>{lang === 'en' ? 'closes at 05:00' : '05:00 關門'}</div>
            <div style={{
              fontFamily: 'Inter', fontSize: 22, fontWeight: 300, color: P.ink,
              fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em',
            }}>
              {hh}<span style={{ opacity: 0.4 }}>:</span>{mm}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* her page */}
            <button onClick={onPeek} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 999,
              background: 'rgba(245,226,196,0.06)', border: '0.5px solid rgba(232,165,87,0.25)',
              color: P.candle, cursor: 'pointer',
              fontFamily: '"Noto Serif TC", serif', fontSize: 11,
            }}>
              <svg width="11" height="11" viewBox="0 0 12 12">
                <circle cx="6" cy="4" r="2.4" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M1.5 11 Q 6 6.5 10.5 11" fill="none" stroke="currentColor" strokeWidth="1"/>
              </svg>
              {lang === 'en' ? 'her page' : '她的頁面'}
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'rgba(232,165,87,0.1)', borderRadius: 999 }}>
              <WickGlyph size={10} color={P.candle}/>
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: P.candle, fontVariantNumeric: 'tabular-nums' }}>{wicks}</span>
            </div>
          </div>
        </div>

        {/* HERO — veiled portrait of the other person, centerpiece */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <div style={{ position: 'relative' }}>
            <PhotoVeil p={P} liftLevel={veilLevel} size={170} lang={lang} />
            {/* candle gold ring */}
            <div style={{
              position: 'absolute', inset: -8,
              borderRadius: 999,
              border: '1px solid rgba(232,165,87,0.35)',
              animation: 'loftFlicker 4s ease-in-out infinite alternate',
              pointerEvents: 'none',
            }}/>
            {/* lift button */}
            {veilLevel < 4 && (
              <button onClick={() => { if (wicks >= 2) { setVeilLevel(veilLevel + 1); setWicks(wicks - 2); } }}
                disabled={wicks < 2}
                style={{
                  position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
                  padding: '6px 12px', borderRadius: 999,
                  background: 'linear-gradient(135deg, #e8a557, #c25a3b)',
                  color: '#1f1014',
                  border: 'none', cursor: wicks >= 2 ? 'pointer' : 'not-allowed',
                  fontFamily: '"Noto Serif TC", serif', fontSize: 11.5, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 6px 16px rgba(232,165,87,0.4)',
                  opacity: wicks >= 2 ? 1 : 0.5,
                }}>
                {lang === 'en' ? `lift veil ${veilLevel + 1}` : `揭第 ${veilLevel + 1} 層`}
                <WickGlyph size={9} color="#1f1014"/>2
              </button>
            )}
          </div>

          {/* pulse animations rising */}
          {pulses.slice(-4).map((p_) => (
            <div key={p_.id} style={{
              position: 'absolute', right: '8%', bottom: 30,
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 18, color: '#e8a557',
              animation: 'pulseUp 2.4s ease-out forwards',
              pointerEvents: 'none', textShadow: '0 0 12px rgba(232,165,87,0.6)',
            }}>{p_.em} <span style={{ fontSize: 13, fontFamily: '"Noto Serif TC", serif', fontStyle: 'normal' }}>{t(p_.key, lang)}</span></div>
          ))}
          {showPulse && (
            <div key={showPulse.id} style={{
              position: 'absolute', left: '12%', bottom: 30,
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 18, color: '#f5e2c4',
              animation: 'pulseUp 2.4s ease-out forwards',
              pointerEvents: 'none', textShadow: '0 0 12px rgba(245,226,196,0.6)',
            }}>{showPulse.em} <span style={{ fontSize: 13, fontFamily: '"Noto Serif TC", serif', fontStyle: 'normal' }}>{t(showPulse.key, lang)}</span></div>
          )}
        </div>

        {/* message stream — italic, slow */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '40px 24px 8px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start',
              animation: `msgIn 0.8s ${i * 0.2}s both ease-out`,
            }}>
              <div style={{
                maxWidth: '78%', padding: '4px 6px',
                fontFamily: m.from === 'me' ? '"Noto Serif TC", serif' : '"EB Garamond", serif',
                fontStyle: m.from === 'me' ? 'normal' : 'italic',
                fontSize: 16, lineHeight: 1.7,
                color: m.from === 'me' ? P.candle : P.ink,
                letterSpacing: '0.04em',
              }}>
                {lang === 'en' ? m.en : m.zh}
              </div>
            </div>
          ))}

          {/* voice note from her */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'msgIn 0.8s 1s both ease-out' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 999,
              background: 'rgba(245,226,196,0.06)',
              border: '0.5px solid rgba(232,165,87,0.25)',
              cursor: 'pointer',
            }}>
              <svg width="12" height="14" viewBox="0 0 12 14"><path d="M2 1 L 11 7 L 2 13 Z" fill={P.candle}/></svg>
              {/* waveform */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {[4,9,6,12,8,14,7,10,5,11,6,8,4].map((h, i) => (
                  <div key={i} style={{ width: 2, height: h, borderRadius: 2, background: P.candle, opacity: 0.7 }}/>
                ))}
              </div>
              <span style={{ fontFamily: 'Inter', fontSize: 10, color: P.muted, fontVariantNumeric: 'tabular-nums' }}>0:11</span>
            </div>
          </div>

          {/* request status chips */}
          {requests.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'center', animation: 'msgIn 0.5s both ease-out' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 999,
                background: r.status === 'accepted' ? 'rgba(232,165,87,0.14)' : 'rgba(245,226,196,0.05)',
                border: `0.5px solid ${r.status === 'accepted' ? 'rgba(232,165,87,0.5)' : 'rgba(245,226,196,0.15)'}`,
                fontFamily: '"Noto Serif TC", serif', fontSize: 12,
                color: r.status === 'accepted' ? P.candle : P.muted,
              }}>
                {r.status === 'pending' && <span style={{ display: 'inline-flex', gap: 2 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 3, height: 3, borderRadius: 3, background: P.muted, animation: `pulse 1.4s ${i*0.2}s infinite` }}/>)}
                </span>}
                {r.status === 'accepted' && <span>✓</span>}
                <span>{lang === 'en' ? r.en : r.zh}</span>
                <span style={{ opacity: 0.6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  · <WickGlyph size={8} color="currentColor"/>{r.cost}
                  {r.status === 'pending' && (lang === 'en' ? ' · held until she agrees' : ' · 她同意才扣')}
                  {r.status === 'accepted' && (lang === 'en' ? ' · she agreed' : ' · 她同意了')}
                </span>
              </div>
            </div>
          ))}
          <style>{`@keyframes pulse { 0%,60%,100%{opacity:.3} 30%{opacity:1} }`}</style>
        </div>

        {/* PULSE BAR — single-word emotional signals, the monetization core */}
        <div style={{
          padding: '12px 14px 8px',
          borderTop: '0.5px solid rgba(232,165,87,0.18)',
          background: 'rgba(31,16,20,0.55)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 11, color: P.muted, textAlign: 'center', marginBottom: 8,
            letterSpacing: '0.05em',
          }}>{t('loftWhisper', lang)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {pulseOptions.map(po => (
              <button key={po.key}
                onClick={() => sendPulse(po.key, po.em)}
                disabled={wicks < 1}
                style={{
                  padding: '10px 4px', borderRadius: 14,
                  background: 'rgba(245,226,196,0.06)',
                  border: '0.5px solid rgba(232,165,87,0.22)',
                  cursor: wicks >= 1 ? 'pointer' : 'not-allowed',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  color: P.ink,
                  opacity: wicks >= 1 ? 1 : 0.4,
                  transition: 'all 0.15s',
                }}>
                <span style={{
                  fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
                  fontSize: 18, color: P.candle,
                }}>{po.em}</span>
                <span style={{
                  fontFamily: '"Noto Serif TC", serif', fontSize: 11, letterSpacing: '0.04em',
                }}>{t(po.key, lang)}</span>
                <span style={{
                  fontFamily: 'Inter', fontSize: 8, color: P.muted, letterSpacing: '0.1em',
                }}>{t('loftPulseCost', lang)}</span>
              </button>
            ))}
          </div>

          {/* composer + request + gift */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={() => setShowRequests(!showRequests)} style={{
              width: 42, height: 42, borderRadius: 42,
              background: showRequests ? P.candle : 'rgba(245,226,196,0.06)',
              border: '0.5px solid rgba(232,165,87,0.3)',
              color: showRequests ? '#1f1014' : P.candle,
              cursor: 'pointer', fontSize: 18, fontFamily: 'Inter',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>+</button>
            <input placeholder={lang === 'en' ? 'or type something softer…' : '或者，輕一點地寫⋯⋯'}
              style={{
                flex: 1, border: '0.5px solid rgba(232,165,87,0.2)', outline: 'none',
                background: 'rgba(245,226,196,0.04)', color: P.ink,
                fontFamily: '"Noto Serif TC", serif', fontSize: 14,
                padding: '10px 14px', borderRadius: 999, letterSpacing: '0.03em',
                minWidth: 0,
              }} />
            {/* mic */}
            <button style={{
              width: 42, height: 42, borderRadius: 42,
              background: 'rgba(245,226,196,0.06)', border: '0.5px solid rgba(232,165,87,0.3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="18" viewBox="0 0 14 18">
                <rect x="4.5" y="1" width="5" height="9" rx="2.5" fill={P.candle}/>
                <path d="M2 8 Q 2 13 7 13 Q 12 13 12 8" fill="none" stroke={P.candle} strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="7" y1="13" x2="7" y2="16" stroke={P.candle} strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <button onClick={() => setShowGift(true)} disabled={giftSent} style={{
              width: 42, height: 42, borderRadius: 42,
              background: giftSent ? 'rgba(245,226,196,0.08)' : 'linear-gradient(135deg, #e8a557, #c25a3b)',
              border: 'none', cursor: giftSent ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: giftSent ? 'none' : '0 4px 12px rgba(232,165,87,0.35)',
            }}>
              <WickGlyph size={14} color={giftSent ? P.faint : '#1f1014'}/>
            </button>
          </div>

          {/* REQUEST MENU — male view: send requests */}
          {showRequests && !isF && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
                fontSize: 11, color: P.muted, textAlign: 'center',
              }}>{lang === 'en' ? 'wicks are held — consumed only if she agrees' : '燭芯先保留——她同意才扣'}</div>
              {REQUEST_KINDS.map(rq => (
                <button key={rq.kind} onClick={() => sendRequest(rq)} disabled={wicks < rq.cost}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 16px', borderRadius: 14,
                    background: 'rgba(245,226,196,0.05)',
                    border: '0.5px solid rgba(232,165,87,0.22)',
                    color: P.ink, cursor: wicks >= rq.cost ? 'pointer' : 'not-allowed',
                    fontFamily: '"Noto Serif TC", serif', fontSize: 13.5,
                    opacity: wicks >= rq.cost ? 1 : 0.4,
                  }}>
                  <span>{lang === 'en' ? rq.en : rq.zh}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: P.candle, fontFamily: 'Inter', fontSize: 11 }}>
                    <WickGlyph size={9} color={P.candle}/>{rq.cost}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* FEMALE VIEW — incoming request awaiting her decision */}
          {isF && (
            <div style={{
              marginTop: 10, padding: '14px 16px', borderRadius: 16,
              background: 'rgba(232,165,87,0.1)',
              border: '0.5px solid rgba(232,165,87,0.4)',
            }}>
              <div style={{
                fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: P.candle, marginBottom: 8,
              }}>{lang === 'en' ? 'He asks · you decide' : '他請求 · 你決定'}</div>
              <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 14.5, color: P.ink, lineHeight: 1.6 }}>
                {lang === 'en' ? 'He asks to see one photo.' : '他想看一張照片。'}
              </div>
              <div style={{
                marginTop: 4, fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
                fontSize: 11.5, color: P.muted,
              }}>{lang === 'en' ? 'Saying yes costs him 3 wicks. Saying no costs nothing, tells him nothing.' : '你同意，扣的是他的 3 芯。你拒絕，不花任何代價，他也不會知道理由。'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{
                  flex: 1, padding: '11px 0', borderRadius: 999,
                  background: 'linear-gradient(135deg, #e8a557, #c25a3b)', color: '#1f1014',
                  border: 'none', cursor: 'pointer',
                  fontFamily: '"Noto Serif TC", serif', fontSize: 13.5, fontWeight: 500,
                }}>{lang === 'en' ? 'Allow once' : '給他看一次'}</button>
                <button style={{
                  flex: 1, padding: '11px 0', borderRadius: 999,
                  background: 'transparent', color: P.muted,
                  border: '0.5px solid rgba(245,226,196,0.25)', cursor: 'pointer',
                  fontFamily: '"Noto Serif TC", serif', fontSize: 13.5,
                }}>{lang === 'en' ? 'Quietly decline' : '靜靜婉拒'}</button>
              </div>
              {/* free extension grant — female privilege */}
              <button style={{
                marginTop: 8, width: '100%', padding: '10px 0', borderRadius: 999,
                background: 'rgba(245,226,196,0.06)', color: P.candle,
                border: '0.5px solid rgba(232,165,87,0.3)', cursor: 'pointer',
                fontFamily: '"Noto Serif TC", serif', fontSize: 12.5,
              }}>{lang === 'en' ? 'Grant +30 min · free · your call' : '主動延長 30 分 · 免費 · 只有你能給'}</button>
            </div>
          )}
        </div>
      </div>

      {/* GIFT SHEET — "send a candle to thank them" */}
      {showGift && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(11,6,8,0.7)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 80,
        }}>
          <div onClick={() => setShowGift(false)} style={{ flex: 1, cursor: 'pointer' }}/>
          <div style={{
            background: '#1f1014', color: P.ink,
            borderRadius: '28px 28px 0 0', padding: '24px 26px 30px',
            borderTop: '0.5px solid rgba(232,165,87,0.3)',
          }}>
            <div style={{ width: 36, height: 4, background: 'rgba(245,226,196,0.2)', borderRadius: 4, margin: '0 auto 18px' }}/>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Flame />
            </div>
            <div style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 20, textAlign: 'center', color: P.ink,
              letterSpacing: '0.06em',
            }}>{t('loftGift', lang)}</div>
            <div style={{
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 12,
              color: P.muted, textAlign: 'center', marginTop: 6,
            }}>{tAlt('loftGift', lang)}</div>
            <div style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 12.5, color: P.inkSoft,
              textAlign: 'center', marginTop: 16, lineHeight: 1.7, padding: '0 12px',
            }}>{lang === 'en'
              ? 'They will see one candle lit, with no name. They cannot reply, cannot trace. Only the warmth.'
              : '對方會看見一根點亮的蠟燭，沒有名字。不能回、不能追，只剩那一點暖。'}</div>
            <button onClick={() => { if (wicks >= 5) { setWicks(wicks - 5); setGiftSent(true); setShowGift(false); } }}
              disabled={wicks < 5}
              style={{
                marginTop: 22, width: '100%', height: 54, borderRadius: 999,
                background: wicks >= 5 ? 'linear-gradient(135deg, #e8a557, #c25a3b)' : 'rgba(245,226,196,0.08)',
                color: wicks >= 5 ? '#1f1014' : P.faint,
                border: 'none', cursor: wicks >= 5 ? 'pointer' : 'not-allowed',
                fontFamily: '"Noto Serif TC", serif', fontSize: 15, fontWeight: 500,
                letterSpacing: '0.12em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
              <span>{lang === 'en' ? 'Light a candle for them' : '為他點一根'}</span>
              <span style={{ width: 1, height: 18, background: 'rgba(31,16,20,0.3)' }}/>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, letterSpacing: 0 }}>
                <WickGlyph size={10} color={wicks >= 5 ? '#1f1014' : P.faint}/>{t('loftGiftCost', lang)}
              </span>
            </button>
            <button onClick={() => setShowGift(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: P.muted, fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 13, padding: '12px 0 0', width: '100%',
            }}>{lang === 'en' ? 'not now' : '不了'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ScreenLoftChat });
