// screen-mood.jsx — mood entry / home moment
// User writes a sentence; we surface matching rooms.

function ScreenMood({ p, lang, identityKind, seed, moodInputKind, onNext, onLoft, onUpgrade, onProfile, wicks, vigil, density }) {
  const [text, setText] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  const suggested = ['room_partner', 'room_lonely', 'room_doubt', 'room_cant_sleep', 'room_quiet', 'room_transition'];

  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '64px 24px 28px',
        color: p.ink,
        overflow: 'hidden',
      }}>
        {/* TOP — sigil avatar (left) · wicks + cycle (right) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={onProfile} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <Identity kind={identityKind} seed={seed} size={36} palette={p} lang={lang} trust={0.2} />
            <div>
              <div style={{ fontSize: 11, color: p.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Inter' }}>
                {lang === 'en' ? 'You, tonight' : '你·今晚'}
              </div>
              <div style={{ fontSize: 13, color: p.inkSoft, fontFamily: '"Noto Serif TC", serif', marginTop: 1 }}>
                <ColorAdj seed={seed} lang={lang} showSwatch={false} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onUpgrade} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px',
              background: vigil ? p.accent : p.accentSoft,
              color: vigil ? (p.dark ? '#15172e' : '#fbf5e4') : p.accent,
              border: vigil ? 'none' : `0.5px solid ${p.accent}40`,
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: 'Inter', fontSize: 11, letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums',
            }}>
              <WickGlyph size={10} color={vigil ? (p.dark ? '#15172e' : '#fbf5e4') : p.accent} />
              {wicks}
            </button>
            <CycleCountdown p={p} lang={lang} />
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginTop: 36 }}>
          <Bilingual k="moodHeader" lang={lang} size={34} weight={300} color={p.ink}
            altOpacity={0.4} altSize={0.42} gap={6} />
        </div>

        {/* Prompt subtitle */}
        <div style={{
          marginTop: 14,
          fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: p.muted, lineHeight: 1.5, maxWidth: 320,
        }}>{t('moodPrompt', lang)}</div>

        {/* INPUT — chooses by tweak */}
        <div style={{ marginTop: 22 }}>
          {moodInputKind === 'text' && (
            <TextMoodInput p={p} lang={lang} text={text} setText={setText} focused={focused} setFocused={setFocused} />
          )}
          {moodInputKind === 'cards' && (
            <CardMoodInput p={p} lang={lang} text={text} setText={setText} />
          )}
          {moodInputKind === 'slider' && (
            <SliderMoodInput p={p} lang={lang} setText={setText} />
          )}
          {moodInputKind === 'breath' && (
            <BreathMoodInput p={p} lang={lang} setText={setText} />
          )}
        </div>

        {/* SUGGESTED ROOMS — tonight's open rooms */}
        <div style={{ marginTop: 24, flex: 1 }}>
          <Cap p={p}>{t('moodSuggested', lang)} · {tAlt('moodSuggested', lang).toLowerCase()}</Cap>
          <div style={{
            marginTop: 12,
            display: 'flex', flexWrap: 'wrap', gap: 8,
          }}>
            {suggested.map(rk => (
              <RoomChip key={rk} p={p} lang={lang} rk={rk}
                live={Math.floor(2 + Math.random() * 14)} />
            ))}
          </div>

          {/* LOFT ENTRY — a separate, optional door */}
          <div onClick={onLoft} style={{
            marginTop: 16, padding: '14px 16px',
            background: `linear-gradient(135deg, ${p.dark ? 'rgba(45,28,38,0.8)' : 'rgba(80,50,60,0.92)'}, ${p.dark ? 'rgba(28,22,32,0.8)' : 'rgba(50,30,40,0.88)'})`,
            border: `0.5px solid ${p.dark ? 'rgba(212,144,96,0.3)' : 'rgba(212,144,96,0.4)'}`,
            borderRadius: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 6px 20px rgba(220,140,90,0.15)',
          }}>
            <div style={{
              width: 36, height: 44,
              background: 'linear-gradient(180deg, #f7d9a8 0%, #d59565 60%, #8a5230 100%)',
              borderRadius: '18px 18px 2px 2px',
              position: 'relative', flexShrink: 0,
              boxShadow: '0 0 16px rgba(220,140,90,0.6)',
            }}>
              <div style={{
                position: 'absolute', left: '40%', top: '15%', width: '20%', height: '70%',
                background: '#fff5dc', borderRadius: 999,
                boxShadow: '0 0 6px #fff5dc',
              }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: '"Noto Serif TC", serif', fontSize: 15, color: '#f5ecdb',
                letterSpacing: '0.04em',
              }}>{t('loftName', lang)} · <span style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(245,236,219,0.6)' }}>{tAlt('loftName', lang)}</span></div>
              <div style={{
                fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: 'rgba(245,236,219,0.7)',
                marginTop: 2, lineHeight: 1.4,
              }}>{t('loftTagline', lang)}</div>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" style={{ opacity: 0.6 }}>
              <path d="M1 1 L6 7 L1 13" stroke="#f5ecdb" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <SoftButton p={p} variant="primary" size="lg" full onClick={onNext}>
            <span>{t('moodEnter', lang)}</span>
            <span style={{ opacity: 0.55, fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 13 }}>
              · {tAlt('moodEnter', lang).toLowerCase()}
            </span>
          </SoftButton>
          <button onClick={onNext} style={{
            background: 'none', border: 'none', color: p.muted, fontSize: 13,
            cursor: 'pointer', fontFamily: '"Noto Serif TC", serif', padding: 6,
          }}>{t('moodSkip', lang)}</button>
        </div>
      </div>
    </VaporBackground>
  );
}

// ── inputs ───────────────────────────────────────────────────
function TextMoodInput({ p, lang, text, setText, focused, setFocused }) {
  const charCount = text.length;
  return (
    <GlassCard p={p} padding={20} radius={24}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t('moodPlaceholder', lang)}
        rows={3}
        style={{
          width: '100%', resize: 'none', border: 'none', outline: 'none',
          background: 'transparent', color: p.ink,
          fontFamily: '"Noto Serif TC", serif',
          fontSize: 17, lineHeight: 1.6, padding: 0, letterSpacing: '0.01em',
        }}
      />
      <div style={{
        marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: p.muted, fontSize: 11, fontFamily: 'Inter',
      }}>
        <span style={{ opacity: 0.7 }}>{lang === 'en' ? 'private to you' : '只有你看得到'}</span>
        <span>{charCount}/280</span>
      </div>
    </GlassCard>
  );
}

function CardMoodInput({ p, lang, text, setText }) {
  const presets = [
    { zh: '今晚很孤單', en: 'lonely tonight' },
    { zh: '和他的距離', en: 'distance with him' },
    { zh: '睡不著',     en: "can't sleep" },
    { zh: '不確定',     en: 'unsure' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {presets.map(pr => {
        const label = lang === 'en' ? pr.en : pr.zh;
        const selected = text === label;
        return (
          <GlassCard key={pr.zh} p={p} padding={16} radius={20}
            onClick={() => setText(label)}
            style={{
              background: selected ? p.accent + '44' : p.glass,
              border: selected ? `1px solid ${p.accent}` : `0.5px solid ${p.line}`,
            }}>
            <div style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 15, color: p.ink, lineHeight: 1.4,
            }}>{label}</div>
            <div style={{
              fontFamily: '"EB Garamond", serif', fontStyle: lang === 'zh' ? 'italic' : 'normal',
              fontSize: 11, color: p.muted, marginTop: 4,
            }}>{lang === 'en' ? pr.zh : pr.en}</div>
          </GlassCard>
        );
      })}
    </div>
  );
}

function SliderMoodInput({ p, lang, setText }) {
  const [calm, setCalm] = React.useState(40);
  const [heavy, setHeavy] = React.useState(70);
  React.useEffect(() => {
    setText(`calm:${calm} heavy:${heavy}`);
  }, [calm, heavy]);
  return (
    <GlassCard p={p} padding={20} radius={24}>
      {[
        { label: lang==='en' ? 'calm — restless' : '靜 — 躁', val: calm, set: setCalm, l: lang==='en'?'calm':'靜', r: lang==='en'?'restless':'躁' },
        { label: lang==='en' ? 'light — heavy' : '輕 — 重', val: heavy, set: setHeavy, l: lang==='en'?'light':'輕', r: lang==='en'?'heavy':'重' },
      ].map((s, i) => (
        <div key={i} style={{ marginBottom: i === 0 ? 22 : 0 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.muted, marginBottom: 8,
          }}>
            <span>{s.l}</span><span>{s.r}</span>
          </div>
          <div style={{ position: 'relative', height: 4, background: p.line, borderRadius: 4 }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: 4, borderRadius: 4,
              width: `${s.val}%`, background: `linear-gradient(90deg, ${p.accent}66, ${p.accent})`,
            }} />
            <div style={{
              position: 'absolute', left: `calc(${s.val}% - 8px)`, top: -6,
              width: 16, height: 16, borderRadius: 16,
              background: p.surfaceSolid,
              border: `1px solid ${p.accent}`,
              boxShadow: `0 2px 6px ${p.accent}40`,
              cursor: 'grab',
            }} />
            <input type="range" min="0" max="100" value={s.val} onChange={e => s.set(+e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
          </div>
        </div>
      ))}
    </GlassCard>
  );
}

function BreathMoodInput({ p, lang, setText }) {
  return (
    <GlassCard p={p} padding={28} radius={24} style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 80,
          background: `radial-gradient(circle, ${p.accent}66, transparent)`,
          animation: 'breath 6s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: 16, background: p.accent,
          }} />
        </div>
        <div style={{
          fontFamily: '"Noto Serif TC", serif', fontSize: 16, color: p.inkSoft, lineHeight: 1.6,
        }}>
          {lang === 'en' ? 'breathe in… breathe out…' : '吸氣⋯⋯ 吐氣⋯⋯'}
        </div>
        <div style={{
          fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
          fontSize: 12, color: p.muted,
        }}>
          {lang === 'en' ? 'three breaths, then choose' : '三個呼吸後，再選'}
        </div>
      </div>
    </GlassCard>
  );
}

// ── Room chip ───────────────────────────────────────────────
function RoomChip({ p, lang, rk, live }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      background: p.surface,
      backdropFilter: `blur(${p.glassBlur}px)`,
      WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
      border: `0.5px solid ${p.line}`,
      borderRadius: 999,
      cursor: 'pointer',
    }}>
      <BreathDot p={p} size={5} />
      <span style={{
        fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.ink,
      }}>{t(rk, lang)}</span>
      <span style={{
        fontFamily: 'Inter', fontSize: 10, color: p.muted,
        padding: '2px 6px', background: p.accentSoft, borderRadius: 6,
      }}>{live}</span>
    </div>
  );
}

// ── 24h cycle countdown component ────────────────────────────
function CycleCountdown({ p, lang }) {
  const [t1, setT1] = React.useState('05:42:18');
  React.useEffect(() => {
    const interval = setInterval(() => {
      // a soft tick
      const now = new Date();
      const tonight3am = new Date(now);
      tonight3am.setHours(27, 0, 0, 0); // next day 03:00
      let diff = (tonight3am - now) / 1000;
      if (diff < 0) diff += 86400;
      const h = String(Math.floor(diff/3600)).padStart(2,'0');
      const m = String(Math.floor((diff%3600)/60)).padStart(2,'0');
      const s = String(Math.floor(diff%60)).padStart(2,'0');
      setT1(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: p.muted }}>
      <svg width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill="none" stroke={p.muted} strokeWidth="0.8" />
        <path d="M6 2 V 6 L 9 7.5" stroke={p.muted} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 12, fontFamily: 'Inter', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
        {t1}
      </span>
    </div>
  );
}

Object.assign(window, { ScreenMood, RoomChip, CycleCountdown });
