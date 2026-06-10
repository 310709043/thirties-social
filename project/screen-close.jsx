// screen-close.jsx — 24-hour cycle close

function ScreenClose({ p, lang, identityKind, seed, onRest }) {
  const [nextWindow] = React.useState('05:42:18');
  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '64px 28px 38px',
        color: p.ink,
      }}>
        {/* small label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Cap p={p}>{lang === 'en' ? 'cycle complete' : '今日窗口·已關閉'}</Cap>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            background: p.accentSoft,
            border: `0.5px solid ${p.accent}40`,
            borderRadius: 999,
          }}>
            <NoShotGlyph color={p.accent} size={11}/>
            <span style={{ fontFamily: 'Inter', fontSize: 10, color: p.accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t('noTrace', lang)}
            </span>
          </div>
        </div>

        {/* HEADER */}
        <div style={{ marginTop: 36 }}>
          <Bilingual k="closeHeader" lang={lang} size={32} weight={300}
            color={p.ink} altOpacity={0.42} altSize={0.45} gap={8} />
        </div>

        {/* Center artwork — a dissolving sigil */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{
              filter: 'blur(2.5px)', opacity: 0.65,
              transform: 'scale(1.05)',
              animation: 'driftIn 6s ease-in-out infinite alternate',
            }}>
              <Identity kind={identityKind} seed={seed} size={160} palette={p} lang={lang} trust={0.4}/>
            </div>
            <style>{`
              @keyframes driftIn {
                from { transform: scale(1.02) translateY(-2px); opacity: 0.55; }
                to   { transform: scale(1.08) translateY(2px); opacity: 0.7; }
              }
            `}</style>

            {/* Stats */}
            <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <CloseStat p={p} lang={lang} n="8" zh="個人說了話" en="people spoken with" />
              <CloseStat p={p} lang={lang} n="3" zh="段一對一對話" en="one-to-one conversations" />
              <CloseStat p={p} lang={lang} n="0" zh="筆對話被儲存" en="conversations stored" />
            </div>
          </div>
        </div>

        {/* Next window countdown */}
        <div style={{ marginBottom: 16 }}>
          <GlassCard p={p} padding={18} radius={24} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 44,
              background: p.accentSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="7.5" fill="none" stroke={p.accent} strokeWidth="1.2"/>
                <path d="M9 3 V 9 L 13 11" stroke={p.accent} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <Cap p={p}>{t('closeTimer', lang)} · {tAlt('closeTimer', lang)}</Cap>
              <div style={{
                fontFamily: 'Inter', fontSize: 20, color: p.ink, fontWeight: 300,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em', marginTop: 2,
              }}>{nextWindow}</div>
            </div>
            <div style={{
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 12, color: p.muted, textAlign: 'right', maxWidth: 110, lineHeight: 1.4,
            }}>{lang === 'en' ? 'opens 03:00' : '03:00 開啟'}</div>
          </GlassCard>
        </div>

        <SoftButton p={p} variant="secondary" size="lg" full onClick={onRest}>
          {t('closeRest', lang)}
          <span style={{ opacity: 0.55, fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 13, marginLeft: 4 }}>
            · {tAlt('closeRest', lang).toLowerCase()}
          </span>
        </SoftButton>
      </div>
    </VaporBackground>
  );
}

function CloseStat({ p, lang, n, zh, en }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'center' }}>
      <div style={{
        fontFamily: '"EB Garamond", serif', fontSize: 28, color: p.ink, fontWeight: 400,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{n}</div>
      <div style={{
        fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.muted, lineHeight: 1.4,
      }}>{lang === 'en' ? en : zh}</div>
    </div>
  );
}

Object.assign(window, { ScreenClose });
