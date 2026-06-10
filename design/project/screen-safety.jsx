// screen-safety.jsx — safety / report / exit

function ScreenSafety({ p, lang, onBack, onLeave }) {
  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '54px 22px 28px',
        color: p.ink,
      }}>
        {/* back */}
        <button onClick={onBack} style={{
          alignSelf: 'flex-start',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: p.muted, padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: '"Noto Serif TC", serif', fontSize: 13,
        }}>
          <svg width="8" height="14" viewBox="0 0 8 14"><path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          {lang === 'en' ? 'back' : '返回'}
        </button>

        <div style={{ marginTop: 22 }}>
          <Bilingual k="safetyTitle" lang={lang} size={32} weight={400}
            color={p.ink} altOpacity={0.42} altSize={0.45} />
        </div>

        <div style={{
          marginTop: 12, fontFamily: '"Noto Serif TC", serif', fontSize: 15,
          color: p.inkSoft, lineHeight: 1.6, maxWidth: 320,
        }}>{t('safetyBlurb', lang)}</div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SafetyRow p={p} lang={lang}
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 2 L17 5 V11 C17 14 14 17 10 18 C6 17 3 14 3 11 V5 Z"
                  fill="none" stroke={p.ink} strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M7 10 L9 12 L13 8" stroke={p.ink} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            title={t('safetyBlock', lang)} altTitle={tAlt('safetyBlock', lang)}
            sub={lang === 'en' ? 'They will never see you again, on any device.' : '他在任何裝置上都不會再看見你。'}
            onClick={onLeave}
          />
          <SafetyRow p={p} lang={lang}
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20">
                <rect x="3" y="4" width="14" height="11" rx="2" fill="none" stroke={p.ink} strokeWidth="1.2"/>
                <path d="M3 8 H17 M7 12 H13" stroke={p.ink} strokeWidth="1.2"/>
              </svg>
            }
            title={t('safetyReport', lang)} altTitle={tAlt('safetyReport', lang)}
            sub={lang === 'en' ? 'Send a moderator only the lines you choose.' : '只把你選擇的句子傳給人工審查員。'}
          />
          <SafetyRow p={p} lang={lang}
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 16 V4 M5 9 L10 4 L15 9" stroke={p.ink} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 17 H17" stroke={p.ink} strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            }
            title={t('safetyExit', lang)} altTitle={tAlt('safetyExit', lang)}
            sub={lang === 'en' ? 'Close this window. No notice is sent.' : '直接關閉這次對話，對方不會收到任何通知。'}
            onClick={onLeave}
          />
        </div>

        {/* HOTLINE */}
        <div style={{ marginTop: 20 }}>
          <GlassCard p={p} padding={16} radius={20} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: p.dark ? 'rgba(224,144,128,0.1)' : 'rgba(184,90,79,0.07)',
            border: `0.5px solid ${p.danger}40`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 36,
              background: p.danger, color: p.dark ? '#15172e' : '#fbf5e4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M3 3 Q 3 2 4 2 L 6 2 L 7 5 L 5.5 6.5 Q 7 9 9.5 10.5 L 11 9 L 14 10 L 14 12 Q 14 13 13 13 Q 7 13 3 9 Q 3 5 3 3 Z"
                  fill="currentColor"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: p.ink, fontWeight: 500 }}>
                {t('safetyHotline', lang)}
              </div>
              <div style={{
                fontFamily: lang==='en'?'"Noto Serif TC", serif':'"EB Garamond", serif',
                fontStyle: lang==='en'?'normal':'italic',
                fontSize: 11, color: p.muted, marginTop: 2,
              }}>
                {tAlt('safetyHotline', lang)} · 1995
              </div>
            </div>
          </GlassCard>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          fontFamily: '"Noto Serif TC", serif', fontSize: 11, color: p.muted,
          textAlign: 'center', opacity: 0.7, lineHeight: 1.6,
        }}>{t('safetyFooter', lang)}</div>
      </div>
    </VaporBackground>
  );
}

function SafetyRow({ p, lang, icon, title, altTitle, sub, onClick }) {
  return (
    <GlassCard p={p} padding={16} radius={20} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 40,
        background: p.accentSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 15, color: p.ink, fontWeight: 500 }}>{title}</div>
          <div style={{
            fontFamily: lang==='en'?'"Noto Serif TC", serif':'"EB Garamond", serif',
            fontStyle: lang==='en'?'normal':'italic',
            fontSize: 11, color: p.muted, opacity: 0.7,
          }}>{altTitle}</div>
        </div>
        <div style={{
          fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.muted,
          marginTop: 3, lineHeight: 1.5,
        }}>{sub}</div>
      </div>
      <svg width="8" height="14" viewBox="0 0 8 14" style={{ opacity: 0.4 }}>
        <path d="M1 1 L6 7 L1 13" stroke={p.muted} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    </GlassCard>
  );
}

Object.assign(window, { ScreenSafety });
