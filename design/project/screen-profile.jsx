// screen-profile.jsx — personal page (own view) + peek view (what a Loft visitor sees)
// `mine` prop switches between the two.

function ScreenProfile({ p, lang, identityKind, seed, wicks, setWicks, vigil, mine = true, onBack, onUpgrade }) {
  const P = mine ? p : LOFT_PALETTE; // peek view always rendered in loft palette
  const [unlockedDiary, setUnlockedDiary] = React.useState(false);
  const [unlockedPhotos, setUnlockedPhotos] = React.useState([]);
  const [loftVisible, setLoftVisible] = React.useState(true);

  const diary = [
    { d: '06.08', zh: '他睡了。我在陽台站了很久。', en: 'He sleeps. I stood on the balcony a long time.' },
    { d: '06.06', zh: '今天差點哭出來，在超市。', en: 'Nearly cried today, in the supermarket.' },
  ];
  const interests = lang === 'en'
    ? ['old films', 'late walks', 'whisky', 'jazz', 'rain']
    : ['老電影', '深夜散步', '威士忌', '爵士', '雨聲'];

  const sectionTitle = (zh, en, extra) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 2px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.muted, fontWeight: 500 }}>{lang === 'en' ? en : zh}</span>
        <span style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 11, color: P.muted, opacity: 0.6 }}>{lang === 'en' ? zh : en}</span>
      </div>
      {extra}
    </div>
  );

  const wickTag = (cost, unlocked, onClick) => (
    <button onClick={onClick} disabled={unlocked} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 999,
      background: unlocked ? 'transparent' : P.accentSoft,
      border: `0.5px solid ${unlocked ? P.line : P.accent + '50'}`,
      color: unlocked ? P.muted : P.accent,
      fontFamily: 'Inter', fontSize: 10, cursor: unlocked ? 'default' : 'pointer',
      fontVariantNumeric: 'tabular-nums', flexShrink: 0,
    }}>
      {unlocked ? (lang === 'en' ? 'unlocked' : '已解鎖') : <>
        <WickGlyph size={9} color={P.accent} />{cost}{lang === 'en' ? '' : ' 芯'}
      </>}
    </button>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: mine ? undefined : LOFT_PALETTE.bg, overflow: 'hidden' }}>
      {mine ? <VaporBackground p={p} /> : null}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column',
        color: P.ink, overflowY: 'auto',
        fontFamily: '"Noto Serif TC", serif',
      }}>
        {/* top */}
        <div style={{ padding: '54px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: P.muted, padding: 6, fontFamily: '"Noto Serif TC", serif', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="8" height="14" viewBox="0 0 8 14"><path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            {lang === 'en' ? 'back' : '返回'}
          </button>
          <Cap p={P}>{mine ? (lang === 'en' ? 'My page' : '我的頁面') : (lang === 'en' ? 'Her page · Loft' : '她的頁面 · 夜閣')}</Cap>
        </div>

        {/* identity + balance */}
        <div style={{ padding: '20px 22px 6px' }}>
          <GlassCard p={P} padding={18} radius={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ filter: mine ? 'none' : 'blur(2px)' }}>
                <Identity kind={identityKind} seed={mine ? seed : 'her_x2'} size={64} palette={P} lang={lang} trust={mine ? 0.4 : 0.1} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 17, color: P.ink }}>
                  <ColorAdj seed={mine ? seed : 'her_x2'} lang={lang} showSwatch={false} />
                </div>
                <div style={{
                  fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
                  fontSize: 12, color: P.muted, marginTop: 4,
                }}>
                  {mine
                    ? (lang === 'en' ? 'identity regenerates daily' : '識別每天重新生成')
                    : (lang === 'en' ? 'in the Loft tonight' : '今晚在夜閣')}
                </div>
              </div>
              {mine && (
                <button onClick={onUpgrade} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  background: P.accentSoft, border: `0.5px solid ${P.accent}40`,
                  borderRadius: 14, padding: '8px 14px', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <WickGlyph size={12} color={P.accent}/>
                    <span style={{ fontFamily: 'Inter', fontSize: 18, color: P.accent, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{wicks}</span>
                  </div>
                  <span style={{ fontFamily: 'Inter', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: P.muted }}>
                    {lang === 'en' ? 'buy more' : '購買'}
                  </span>
                </button>
              )}
            </div>
            {mine && (
              <div style={{
                marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${P.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CandleIcon color={vigil ? P.accent : P.muted} lit={vigil}/>
                  <span style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: P.ink }}>
                    {vigil ? (lang === 'en' ? 'Vigil member' : '守夜會員') : (lang === 'en' ? 'One Candle (free)' : '一根蠟燭（免費）')}
                  </span>
                </div>
                <button onClick={onUpgrade} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: P.accent,
                }}>{vigil ? (lang === 'en' ? 'manage' : '管理') : (lang === 'en' ? 'upgrade →' : '升級 →')}</button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* LOFT PROFILE SECTION */}
        <div style={{ padding: '16px 22px 30px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {mine && (
            <NightNameComposer p={P} lang={lang} />
          )}
          {mine && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(60,32,36,0.9), rgba(35,20,26,0.92))',
              border: '0.5px solid rgba(232,165,87,0.3)', borderRadius: 16,
            }}>
              <div>
                <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: '#f5e2c4' }}>
                  {lang === 'en' ? 'Show my page in the Loft' : '在夜閣顯示我的頁面'}
                </div>
                <div style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(245,226,196,0.55)', marginTop: 2 }}>
                  {lang === 'en' ? 'Visitors pay wicks to look. You choose every item.' : '訪客看要付燭芯。每一項都由你決定。'}
                </div>
              </div>
              <div onClick={() => setLoftVisible(!loftVisible)} style={{
                width: 40, height: 24, borderRadius: 24, flexShrink: 0, cursor: 'pointer',
                background: loftVisible ? '#e8a557' : 'rgba(245,226,196,0.2)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 2, left: loftVisible ? 18 : 2,
                  width: 20, height: 20, borderRadius: 20, background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}/>
              </div>
            </div>
          )}

          {/* 日記 Diary */}
          <div>
            {sectionTitle('日記', 'Diary', !mine && wickTag(2, unlockedDiary, () => { if (wicks >= 2) { setWicks(wicks - 2); setUnlockedDiary(true); } }))}
            <GlassCard p={P} padding={0} radius={18}>
              {diary.map((d, i) => (
                <div key={i} style={{
                  padding: '13px 16px',
                  borderTop: i > 0 ? `0.5px solid ${P.line}` : 'none',
                  display: 'flex', gap: 12, alignItems: 'baseline',
                }}>
                  <span style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 11, color: P.muted, flexShrink: 0 }}>{d.d}</span>
                  <span style={{
                    fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: P.ink, lineHeight: 1.6,
                    filter: (!mine && !unlockedDiary) ? 'blur(5px)' : 'none',
                    userSelect: (!mine && !unlockedDiary) ? 'none' : 'auto',
                    transition: 'filter 0.5s',
                  }}>{lang === 'en' ? d.en : d.zh}</span>
                </div>
              ))}
            </GlassCard>
          </div>

          {/* 相簿 Photos */}
          <div>
            {sectionTitle('相簿', 'Photos', !mine && (
              <span style={{ fontFamily: 'Inter', fontSize: 10, color: P.muted }}>
                {lang === 'en' ? '3 wicks each' : '每張 3 芯'}
              </span>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[0, 1, 2].map(i => {
                const unlocked = mine || unlockedPhotos.includes(i);
                return (
                  <div key={i}
                    onClick={() => {
                      if (!mine && !unlocked && wicks >= 3) {
                        setWicks(wicks - 3); setUnlockedPhotos([...unlockedPhotos, i]);
                      }
                    }}
                    style={{ cursor: (!mine && !unlocked) ? 'pointer' : 'default', position: 'relative' }}>
                    <PhotoVeil p={P} liftLevel={unlocked ? 4 : 1} size={100} lang={lang} imgUrl={null} />
                    {!mine && !unlocked && (
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          padding: '4px 8px', borderRadius: 999,
                          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                          color: '#f5e2c4', fontFamily: 'Inter', fontSize: 10,
                        }}>
                          <WickGlyph size={8} color="#e8a557"/>3
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 語錄 Quote */}
          <div>
            {sectionTitle('語錄', 'A line', null)}
            <div style={{
              padding: '14px 18px',
              borderLeft: `2px solid ${P.accent}60`,
              fontFamily: '"Noto Serif TC", serif', fontSize: 15, color: P.ink,
              lineHeight: 1.7, fontStyle: 'normal',
            }}>
              {lang === 'en'
                ? '"Marriage is two people taking turns being lonely."'
                : '「婚姻是兩個人輪流孤獨。」'}
            </div>
          </div>

          {/* 感情狀態 + 興趣 */}
          <div>
            {sectionTitle('感情狀態 · 興趣', 'Status · Interests', null)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{
                padding: '8px 14px', borderRadius: 999,
                background: P.accent, color: P.dark ? '#1f1014' : '#fbf5e4',
                fontFamily: '"Noto Serif TC", serif', fontSize: 13,
              }}>{lang === 'en' ? 'married · 12 yrs' : '已婚 · 十二年'}</span>
              {interests.map(it => (
                <span key={it} style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: P.surface, border: `0.5px solid ${P.line}`,
                  color: P.ink, fontFamily: '"Noto Serif TC", serif', fontSize: 13,
                }}>{it}</span>
              ))}
            </div>
          </div>

          {mine && (
            <div style={{
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 11, color: P.muted, textAlign: 'center', opacity: 0.7, lineHeight: 1.7,
            }}>
              {lang === 'en'
                ? 'Your page is invisible in the Park. Only the Loft can see it — and only what you allow.'
                : '公園裡沒有人看得到你的頁面。只有夜閣看得到——而且只有你允許的部分。'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenProfile });

// 夜名 composer — a FIXED Loft-only name, composed from the word bank (never free-typed)
function NightNameComposer({ p, lang }) {
  const [ci, setCi] = React.useState(4);  // color index
  const [ai, setAi] = React.useState(0);  // noun index
  const colors = lang === 'en' ? COLOR_NAMES_EN : COLOR_NAMES_ZH;
  const nouns = lang === 'en' ? ADJ_EN : ADJ_ZH;
  const name = lang === 'en' ? `${colors[ci]} ${nouns[ai]}` : `${colors[ci]}的${nouns[ai]}`;
  return (
    <div style={{
      padding: '16px 16px 14px',
      background: 'linear-gradient(135deg, rgba(60,32,36,0.9), rgba(35,20,26,0.92))',
      border: '0.5px solid rgba(232,165,87,0.3)', borderRadius: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: '#f5e2c4' }}>
          {lang === 'en' ? 'Night name · Loft only' : '夜名 · 僅夜閣使用'}
        </div>
        <div style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(245,226,196,0.55)' }}>
          {lang === 'en' ? 'fixed · composed, never typed' : '固定 · 只能組合不能輸入'}
        </div>
      </div>
      <div style={{
        marginTop: 10, textAlign: 'center',
        fontFamily: '"Noto Serif TC", serif', fontSize: 22, color: '#e8a557',
        letterSpacing: '0.1em',
      }}>{name}</div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {colors.map((c, i) => (
            <button key={c} onClick={() => setCi(i)} style={{
              padding: '5px 12px', borderRadius: 999, flexShrink: 0,
              background: ci === i ? '#e8a557' : 'rgba(245,226,196,0.06)',
              color: ci === i ? '#1f1014' : 'rgba(245,226,196,0.7)',
              border: '0.5px solid rgba(232,165,87,0.25)', cursor: 'pointer',
              fontFamily: '"Noto Serif TC", serif', fontSize: 12,
            }}>{c}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {nouns.map((n, i) => (
            <button key={n} onClick={() => setAi(i)} style={{
              padding: '5px 12px', borderRadius: 999, flexShrink: 0,
              background: ai === i ? '#e8a557' : 'rgba(245,226,196,0.06)',
              color: ai === i ? '#1f1014' : 'rgba(245,226,196,0.7)',
              border: '0.5px solid rgba(232,165,87,0.25)', cursor: 'pointer',
              fontFamily: '"Noto Serif TC", serif', fontSize: 12,
            }}>{n}</button>
          ))}
        </div>
      </div>
      <div style={{
        marginTop: 10, fontFamily: '"Noto Serif TC", serif', fontSize: 11,
        color: 'rgba(245,226,196,0.55)', lineHeight: 1.6,
      }}>
        {lang === 'en'
          ? 'The Park ignores this — there you are renamed nightly. The Loft keeps it, so someone can find you again.'
          : '公園不用夜名——那裡每晚重新命名。夜閣會記住它，所以有人能再找到你。'}
      </div>
    </div>
  );
}

Object.assign(window, { NightNameComposer });
