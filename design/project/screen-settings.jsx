// screen-settings.jsx — privacy & control

function ScreenSettings({ p, lang, onBack, identityKind, seed }) {
  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        color: p.ink, overflowY: 'auto',
      }}>
        {/* top */}
        <div style={{ padding: '54px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: p.muted, padding: 6, fontFamily: '"Noto Serif TC", serif', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="8" height="14" viewBox="0 0 8 14"><path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            {lang === 'en' ? 'back' : '返回'}
          </button>
          <Cap p={p}>{t('setTitle', lang)} · {tAlt('setTitle', lang)}</Cap>
        </div>

        {/* identity preview tile */}
        <div style={{ padding: '24px 22px 8px' }}>
          <GlassCard p={p} padding={18} radius={24} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Identity kind={identityKind} seed={seed} size={64} palette={p} lang={lang} trust={0.3} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: '"Noto Serif TC", serif', fontSize: 16, color: p.ink,
              }}>
                <ColorAdj seed={seed} lang={lang} showSwatch={false} />
              </div>
              <div style={{
                fontFamily: lang==='en' ? '"Noto Serif TC", serif' : '"EB Garamond", serif',
                fontStyle: lang==='en' ? 'normal' : 'italic',
                fontSize: 11, color: p.muted, marginTop: 4,
              }}>
                {t('setIdentitySub', lang)} · {tAlt('setIdentitySub', lang)}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* sections */}
        <div style={{ padding: '12px 22px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SettingSection p={p} title={lang==='en'?'Privacy':'隱私'} alt={lang==='en'?'隱私':'Privacy'}>
            <SettingRow p={p} title={t('setVisibility', lang)} alt={tAlt('setVisibility', lang)}
              sub={t('setVisibilitySub', lang)}
              control={
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      width: 6, height: 18, borderRadius: 3,
                      background: i <= 2 ? p.accent : p.line,
                    }} />
                  ))}
                </div>
              }
            />
            <SettingRow p={p} title={t('setExpiry', lang)} alt={tAlt('setExpiry', lang)}
              sub={t('setExpirySub', lang)}
              control={<Toggle p={p} on={true}/>}
            />
            <SettingRow p={p} title={t('setCycle', lang)} alt={tAlt('setCycle', lang)}
              sub={t('setCycleSub', lang)}
              control={<span style={{ fontFamily: 'Inter', fontSize: 12, color: p.muted, fontVariantNumeric: 'tabular-nums' }}>05:42:18</span>}
            />
          </SettingSection>

          <SettingSection p={p} title={lang==='en'?'Conversation':'對話'} alt={lang==='en'?'對話':'Conversation'}>
            <SettingRow p={p}
              title={lang==='en'?'Auto-filter abusive language':'自動過濾辱罵言詞'}
              alt={lang==='en'?'自動過濾辱罵言詞':'Auto-filter abusive language'}
              sub={lang==='en'?'On-device. We never see your conversation.':'在裝置上完成。我們不會看到你的對話。'}
              control={<Toggle p={p} on={true}/>}
            />
            <SettingRow p={p}
              title={lang==='en'?'Slow mode after 22:00':'夜間 22 點後緩衝模式'}
              alt={lang==='en'?'夜間 22 點後緩衝模式':'Slow mode after 22:00'}
              sub={lang==='en'?'A pause before each message you send.':'你按送出之前，給一個暫停。'}
              control={<Toggle p={p} on={false}/>}
            />
            <SettingRow p={p}
              title={lang==='en'?'Daily quiet limit':'每日對話上限'}
              alt={lang==='en'?'每日對話上限':'Daily quiet limit'}
              sub={lang==='en'?'3 conversations per cycle.':'每個 24 小時最多 3 段對話。'}
              control={<span style={{ fontFamily: 'Inter', fontSize: 14, color: p.ink, fontWeight: 500 }}>3</span>}
            />
          </SettingSection>

          <SettingSection p={p} title={lang==='en'?'Account':'帳戶'} alt={lang==='en'?'帳戶':'Account'}>
            <SettingRow p={p}
              title={t('setLanguage', lang)} alt={tAlt('setLanguage', lang)}
              control={<span style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.muted }}>
                {lang === 'en' ? 'English · 中文' : '中文 · English'}
              </span>}
            />
            <SettingRow p={p}
              title={t('setAbout', lang)} alt={tAlt('setAbout', lang)}
              control={<svg width="8" height="14" viewBox="0 0 8 14" style={{opacity:0.4}}><path d="M1 1 L6 7 L1 13" stroke={p.muted} strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
            />
            <SettingRow p={p}
              title={t('setLeave', lang)} alt={tAlt('setLeave', lang)}
              danger={true}
              sub={lang==='en'?'No traces remain. We hold no records.':'不留下任何資料。我們本來就沒有保存。'}
            />
          </SettingSection>

          <div style={{
            marginTop: 6,
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 11,
            color: p.muted, textAlign: 'center', opacity: 0.7, lineHeight: 1.6,
          }}>
            {lang === 'en'
              ? '第卅者 — for those who are the third party to no one, only themselves.'
              : '第卅者 — 不為別人，只為自己當一次傾訴的對象。'}
          </div>
        </div>
      </div>
    </VaporBackground>
  );
}

function SettingSection({ p, title, alt, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 4px 10px' }}>
        <span style={{
          fontFamily: 'Inter', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: p.muted, fontWeight: 500,
        }}>{title}</span>
        <span style={{
          fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
          fontSize: 11, color: p.muted, opacity: 0.6,
        }}>{alt}</span>
      </div>
      <GlassCard p={p} padding={0} radius={20}>
        {React.Children.map(children, (c, i) => (
          <React.Fragment>
            {i > 0 && <div style={{ marginLeft: 18, height: 0.5, background: p.line }}/>}
            {c}
          </React.Fragment>
        ))}
      </GlassCard>
    </div>
  );
}

function SettingRow({ p, title, alt, sub, control, danger }) {
  return (
    <div style={{
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
      cursor: 'pointer',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{
            fontFamily: '"Noto Serif TC", serif', fontSize: 15,
            color: danger ? p.danger : p.ink, fontWeight: 500,
          }}>{title}</div>
          <div style={{
            fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
            fontSize: 11, color: p.muted, opacity: 0.6,
          }}>{alt}</div>
        </div>
        {sub && <div style={{
          marginTop: 3, fontFamily: '"Noto Serif TC", serif', fontSize: 12,
          color: p.muted, lineHeight: 1.5,
        }}>{sub}</div>}
      </div>
      {control}
    </div>
  );
}

function Toggle({ p, on }) {
  return (
    <div style={{
      width: 40, height: 24, borderRadius: 24,
      background: on ? p.accent : p.line,
      position: 'relative', transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 20, height: 20, borderRadius: 20,
        background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

Object.assign(window, { ScreenSettings });
