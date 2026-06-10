// screen-onboarding.jsx — first run: anonymous identity setup
// Multi-step within the same screen (intro pages → identity preview → ready).

function ScreenOnboarding({ p, lang, identityKind, seed, onNext, setSeed }) {
  const [step, setStep] = React.useState(0);
  const steps = [
    { k: 'ob1Title', body: 'ob1Body' },
    { k: 'ob2Title', body: 'ob2Body' },
    { k: 'ob3Title', body: 'ob3Body' },
  ];
  const isPreview = step === steps.length;

  return (
    <VaporBackground p={p}>
      {/* Status bar bg already provided by IOSDevice */}
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '64px 28px 38px',
        color: p.ink,
      }}>
        {/* tiny brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
          <BreathDot p={p} />
          <span style={{
            fontFamily: '"Noto Serif TC", serif', fontSize: 14, letterSpacing: '0.05em',
            color: p.ink,
          }}>{t('appName', lang)}</span>
          <span style={{
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 12, color: p.muted, opacity: 0.8,
          }}>· {tAlt('appName', lang)}</span>
        </div>

        {/* progress dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 28, alignItems: 'center' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              height: 2, borderRadius: 2,
              flex: i === step ? 2 : 1,
              background: i <= step ? p.ink : p.line,
              opacity: i <= step ? 0.85 : 1,
              transition: 'all 0.35s ease',
            }} />
          ))}
        </div>

        {/* content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
          {!isPreview ? (
            <>
              {/* large mark/illustration above each intro */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                {step === 0 && <IntroMark1 p={p} />}
                {step === 1 && <IntroMark2 p={p} />}
                {step === 2 && <IntroMark3 p={p} />}
              </div>
              <Bilingual k={steps[step].k} lang={lang} size={32} weight={400}
                color={p.ink} align="left" altOpacity={0.45} altSize={0.46} gap={8} />
              <div style={{
                fontFamily: '"Noto Serif TC", serif',
                fontSize: 16, lineHeight: 1.6, color: p.inkSoft,
                maxWidth: 320,
              }}>
                {t(steps[step].body, lang)}
              </div>
              <div style={{
                fontFamily: lang === 'en' ? '"Noto Serif TC", serif' : '"EB Garamond", serif',
                fontStyle: lang === 'en' ? 'normal' : 'italic',
                fontSize: 13, color: p.muted, opacity: 0.7, maxWidth: 320,
              }}>
                {tAlt(steps[step].body, lang)}
              </div>
            </>
          ) : (
            <IdentityPreview p={p} lang={lang} identityKind={identityKind} seed={seed} setSeed={setSeed} />
          )}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isPreview ? (
            <SoftButton p={p} variant="primary" size="lg" full onClick={() => setStep(step + 1)}>
              <span>{lang === 'en' ? 'Continue' : '繼續'}</span>
              <span style={{ opacity: 0.5 }}>→</span>
            </SoftButton>
          ) : (
            <SoftButton p={p} variant="primary" size="lg" full onClick={onNext}>
              {t('obContinue', lang)}
            </SoftButton>
          )}
          <div style={{ textAlign: 'center', height: 22 }}>
            {!isPreview && step > 0 && (
              <button onClick={() => setStep(step - 1)} style={{
                background: 'none', border: 'none', color: p.muted, fontSize: 13,
                cursor: 'pointer', fontFamily: '"Noto Serif TC", serif',
              }}>{lang === 'en' ? 'Back' : '上一步'}</button>
            )}
          </div>
        </div>
      </div>
    </VaporBackground>
  );
}

// the identity preview slot inside onboarding
function IdentityPreview({ p, lang, identityKind, seed, setSeed }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Bilingual k="obSigil" lang={lang} size={28} weight={400} color={p.ink}
        altOpacity={0.5} altSize={0.48} />
      <GlassCard p={p} padding={32} radius={32}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <Identity kind={identityKind} seed={seed} size={132} palette={p} lang={lang} trust={0.35} />
          {/* ghost identity description */}
          <div style={{
            fontFamily: lang === 'en' ? '"EB Garamond", serif' : '"Noto Serif TC", serif',
            fontStyle: lang === 'en' ? 'italic' : 'normal',
            fontSize: 13, color: p.muted, textAlign: 'center', maxWidth: 240, lineHeight: 1.5,
          }}>
            {/* the secondary identity below — same seed, a different metaphor */}
            <ColorAdj seed={seed} lang={lang} showSwatch={false} />
          </div>
        </div>
      </GlassCard>
      <div style={{
        fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.muted,
        textAlign: 'center', lineHeight: 1.55, padding: '0 12px',
      }}>{t('obSigilHint', lang)}</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SoftButton p={p} variant="ghost" size="sm" onClick={() => setSeed(Math.random().toString(36).slice(2,8))}>
          <span style={{ fontFamily: '"Inter", system-ui', fontSize: 12, letterSpacing: '0.05em' }}>↻ {t('obShuffle', lang)}</span>
        </SoftButton>
      </div>
    </div>
  );
}

// ── soft intro marks ─────────────────────────────────────────
function IntroMark1({ p }) {
  // a single sigil orbited by very faint marks — "no name"
  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke={p.ink} strokeOpacity="0.15" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={p.ink} strokeOpacity="0.25" strokeWidth="0.6" strokeDasharray="2 3" />
      <circle cx="50" cy="50" r="14" fill={p.accent} fillOpacity="0.6" />
      <circle cx="50" cy="50" r="6" fill={p.ink} fillOpacity="0.85" />
    </svg>
  );
}
function IntroMark2({ p }) {
  // three words dissolving — bars fading into nothing
  return (
    <svg width="140" height="80" viewBox="0 0 140 80">
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={6 + i*26} y={28} width="20" height="24" rx="3"
          fill={p.ink} fillOpacity={0.55 - i * 0.12} />
      ))}
      <text x="70" y="74" textAnchor="middle"
        fontFamily="Inter, sans-serif" fontSize="9" fill={p.muted} letterSpacing="0.2em">
        FADING
      </text>
    </svg>
  );
}
function IntroMark3({ p }) {
  // two facing curves — "one at a time"
  return (
    <svg width="140" height="100" viewBox="0 0 140 100">
      <circle cx="40" cy="50" r="18" fill="none" stroke={p.ink} strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="100" cy="50" r="18" fill="none" stroke={p.ink} strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="40" cy="50" r="7" fill={p.ink} fillOpacity="0.7" />
      <circle cx="100" cy="50" r="7" fill={p.accent} fillOpacity="0.85" />
      <path d="M58 50 Q 70 30 82 50" fill="none" stroke={p.ink} strokeOpacity="0.4" strokeDasharray="2 3" />
      <path d="M58 50 Q 70 70 82 50" fill="none" stroke={p.ink} strokeOpacity="0.4" strokeDasharray="2 3" />
    </svg>
  );
}

Object.assign(window, { ScreenOnboarding });
