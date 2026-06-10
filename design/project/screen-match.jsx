// screen-match.jsx — incoming-match consent handshake

function ScreenMatch({ p, lang, identityKind, onAccept, onDecline }) {
  const otherSeed = 'm0od7';
  const [progress, setProgress] = React.useState(1);
  React.useEffect(() => {
    const id = setInterval(() => setProgress(prev => Math.max(0, prev - 0.0015)), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '64px 28px 38px',
        color: p.ink,
      }}>
        {/* small label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BreathDot p={p} size={6} />
          <Cap p={p}>{lang === 'en' ? 'Incoming · consent required' : '邀請·需要你的同意'}</Cap>
        </div>

        {/* HEADER */}
        <div style={{ marginTop: 26 }}>
          <Bilingual k="matchHeader" lang={lang} size={32} weight={400}
            color={p.ink} altOpacity={0.42} altSize={0.45} />
        </div>

        {/* Other person card */}
        <GlassCard p={p} padding={26} radius={32} style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <Identity kind={identityKind} seed={otherSeed} size={104} palette={p} lang={lang} trust={0.2} />
              {/* ring */}
              <div style={{
                position: 'absolute', inset: -8,
                borderRadius: 999,
                border: `1px dashed ${p.accent}66`,
                animation: 'spin 22s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: '"Noto Serif TC", serif', fontSize: 16, color: p.inkSoft,
              }}>
                <ColorAdj seed={otherSeed} lang={lang} showSwatch={false} />
              </div>
            </div>

            {/* What they wrote */}
            <Hairline p={p} style={{ width: '60%', margin: '6px 0 4px' }} />
            <Cap p={p}>{t('matchSubhead', lang)}</Cap>
            <div style={{
              fontFamily: '"Noto Serif TC", serif',
              fontSize: 17, color: p.ink, lineHeight: 1.55,
              textAlign: 'center', padding: '4px 8px', fontWeight: 400,
              letterSpacing: '0.02em',
            }}>
              {lang === 'en'
                ? '"Married twelve years. We sleep in the same bed and I cannot remember the last time he asked how I was."'
                : '「結婚十二年。睡同一張床，我已經記不起來他上次問我『你好嗎』是什麼時候。」'}
            </div>
            <div style={{
              fontFamily: lang === 'en' ? '"Noto Serif TC", serif' : '"EB Garamond", serif',
              fontStyle: lang === 'en' ? 'normal' : 'italic',
              fontSize: 12, color: p.muted, textAlign: 'center', padding: '0 6px', lineHeight: 1.55,
            }}>
              {lang === 'en'
                ? '「結婚十二年。睡同一張床，我已經記不起來他上次問我『你好嗎』是什麼時候。」'
                : '"Married twelve years. We sleep in the same bed and I cannot remember the last time he asked how I was."'}
            </div>
          </div>
        </GlassCard>

        {/* 30 min window indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, padding: '0 4px' }}>
          <CountdownRing p={p} progress={progress} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: p.ink,
            }}>{t('matchTime', lang)}</div>
            <div style={{
              fontFamily: lang==='en' ? '"Noto Serif TC", serif' : '"EB Garamond", serif',
              fontStyle: lang==='en' ? 'normal' : 'italic',
              fontSize: 11, color: p.muted, marginTop: 1,
            }}>{t('matchHint', lang)}</div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SoftButton p={p} variant="primary" size="lg" full onClick={onAccept}>
            {t('matchAccept', lang)}
          </SoftButton>
          <SoftButton p={p} variant="ghost" size="md" full onClick={onDecline}>
            {t('matchDecline', lang)}
          </SoftButton>
        </div>
      </div>
    </VaporBackground>
  );
}

Object.assign(window, { ScreenMatch });
