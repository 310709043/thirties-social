// screen-upgrade.jsx — Vigil subscription + Wicks one-off

function ScreenUpgrade({ p, lang, wicks, setWicks, onBack }) {
  const [subscribed, setSubscribed] = React.useState(false);
  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        color: p.ink, overflowY: 'auto',
      }}>
        {/* TOP */}
        <div style={{
          padding: '54px 22px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onBack} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: p.muted, padding: 6, fontFamily: '"Noto Serif TC", serif', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="8" height="14" viewBox="0 0 8 14"><path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            {lang === 'en' ? 'back' : '返回'}
          </button>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            background: p.accentSoft,
            border: `0.5px solid ${p.accent}40`,
            borderRadius: 999,
          }}>
            <WickGlyph size={11} color={p.accent} />
            <span style={{ fontFamily: 'Inter', fontSize: 11, color: p.accent, letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
              {wicks} {t('wickName', lang)}
            </span>
          </div>
        </div>

        {/* HEADER */}
        <div style={{ padding: '24px 24px 0' }}>
          <Bilingual k="upgradeTitle" lang={lang} size={30} weight={400}
            color={p.ink} altOpacity={0.42} altSize={0.45} />
          <div style={{
            marginTop: 12,
            fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.muted,
            lineHeight: 1.6, maxWidth: 320,
          }}>{t('upgradeBlurb', lang)}</div>
        </div>

        {/* TIER COMPARE */}
        <div style={{ padding: '20px 22px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* free tier */}
          <TierCard p={p} lang={lang}
            iconBg={p.line}
            icon={<CandleIcon color={p.muted} />}
            label={t('tierFree', lang)} altLabel={tAlt('tierFree', lang)}
            price={t('tierFreeSub', lang)} altPrice={tAlt('tierFreeSub', lang)}
            current={!subscribed}
            features={[
              { zh: '每 24 小時 1 段一對一', en: '1 conversation per 24h' },
              { zh: '公共房間無限',         en: 'Public rooms unlimited' },
              { zh: '基礎匿名識別',         en: 'Basic anonymous identity' },
            ]}
          />

          {/* vigil tier */}
          <TierCard p={p} lang={lang}
            featured
            iconBg={p.accent}
            icon={<CandleIcon color={p.dark ? '#15172e' : '#fbf5e4'} lit/>}
            label={t('tierVigil', lang)} altLabel={tAlt('tierVigil', lang)}
            price={t('tierVigilPrice', lang)} altPrice={tAlt('tierVigilPrice', lang)}
            current={subscribed}
            features={[
              { zh: '不限段對話',                en: 'Unlimited conversations' },
              { zh: '全部 5 種匿名識別',         en: 'All 5 identity metaphors' },
              { zh: '夜閣 通行（不含對話費用）', en: 'Loft access (separate session)' },
              { zh: '照片紗罩交換',              en: 'Photo veil exchange' },
              { zh: '每日 1 燭芯，自動補充',     en: '1 wick daily, auto-refill' },
            ]}
            cta={subscribed ? (lang === 'en' ? 'Current plan' : '目前方案') : t('vigilCta', lang)}
            onCta={() => setSubscribed(!subscribed)}
          />
        </div>

        {/* WICKS */}
        <div style={{ padding: '14px 24px 0' }}>
          <Cap p={p}>{t('wicksTitle', lang)}</Cap>
          <div style={{
            marginTop: 6,
            fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.muted,
            lineHeight: 1.55,
          }}>{t('wicksBlurb', lang)}</div>
        </div>

        <div style={{ padding: '14px 22px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <WickPack p={p} count={10} price="30" onBuy={() => setWicks(wicks + 10)} />
          <WickPack p={p} count={30} price="80" bonus="+3" onBuy={() => setWicks(wicks + 33)} />
          <WickPack p={p} count={100} price="240" bonus="+15" onBuy={() => setWicks(wicks + 115)} />
        </div>

        {/* What wicks buy */}
        <div style={{ padding: '12px 22px 22px' }}>
          <GlassCard p={p} padding={16} radius={18}>
            <Cap p={p} style={{ marginBottom: 10 }}>
              {lang === 'en' ? 'A wick buys' : '一根燭芯可以'}
            </Cap>
            <WickUse p={p} cost="2" zh="揭一層紗罩" en="lift one veil layer" />
            <WickUse p={p} cost="3" zh="延長對話 +30 分" en="extend a chat +30 min" />
            <WickUse p={p} cost="5" zh="一晚的夜閣通行" en="one night in the Loft" />
            <WickUse p={p} cost="10" zh="把昨晚的訊息救 1 小時" en="restore last night for 1 hour" last />
          </GlassCard>
        </div>

        {/* fine print */}
        <div style={{
          padding: '0 28px 24px',
          fontFamily: '"Noto Serif TC", serif', fontSize: 11, color: p.muted,
          textAlign: 'center', lineHeight: 1.6, opacity: 0.7,
        }}>
          {lang === 'en'
            ? 'Wicks expire after 90 days. Subscription renews monthly · cancel anytime. We do not store payment data.'
            : '燭芯 90 天內未使用會自然熄滅。守夜每月續訂・隨時可停。我們不會儲存付款資料。'}
        </div>
      </div>
    </VaporBackground>
  );
}

function TierCard({ p, lang, iconBg, icon, label, altLabel, price, altPrice, features, featured, current, cta, onCta }) {
  return (
    <div style={{
      position: 'relative',
      background: featured
        ? `linear-gradient(155deg, ${p.surface}, ${p.accentSoft})`
        : p.surface,
      backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
      border: `0.5px solid ${featured ? p.accent + '60' : p.line}`,
      borderRadius: 22,
      padding: 18,
      boxShadow: featured
        ? (p.dark ? `0 12px 32px ${p.accent}20` : `0 12px 28px ${p.accent}25`)
        : 'none',
    }}>
      {current && (
        <div style={{
          position: 'absolute', top: -10, right: 14,
          padding: '3px 10px',
          background: p.ink,
          color: p.dark ? '#15172e' : '#fbf5e4',
          borderRadius: 999,
          fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>{lang === 'en' ? 'current' : '目前'}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 18, color: p.ink, fontWeight: 500,
            }}>{label}</div>
            <div style={{
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 13, color: p.muted, opacity: 0.7,
            }}>{altLabel}</div>
          </div>
          <div style={{
            marginTop: 1, fontFamily: 'Inter', fontSize: 12, color: p.ink, fontWeight: 500,
          }}>{price}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.inkSoft,
          }}>
            <span style={{ color: p.accent, fontSize: 10 }}>●</span>
            <span style={{ flex: 1 }}>{lang === 'en' ? f.en : f.zh}</span>
          </div>
        ))}
      </div>

      {cta && (
        <button onClick={onCta} style={{
          marginTop: 16, width: '100%', height: 44, borderRadius: 14,
          background: current ? 'transparent' : p.ink,
          color: current ? p.muted : (p.dark ? '#15172e' : '#fbf5e4'),
          border: current ? `0.5px solid ${p.line}` : 'none',
          cursor: 'pointer',
          fontFamily: '"Noto Serif TC", serif', fontSize: 14, fontWeight: 500,
        }}>{cta}</button>
      )}
    </div>
  );
}

function WickPack({ p, count, price, bonus, onBuy }) {
  return (
    <button onClick={onBuy} style={{
      padding: '14px 8px',
      background: p.surface,
      backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
      border: `0.5px solid ${p.line}`,
      borderRadius: 16,
      cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: '"EB Garamond", serif', fontSize: 24, color: p.ink, fontWeight: 500,
        }}>{count}</span>
        <span style={{
          fontFamily: '"Noto Serif TC", serif', fontSize: 11, color: p.muted,
        }}>芯</span>
      </div>
      {bonus && (
        <span style={{
          fontFamily: 'Inter', fontSize: 9, color: p.accent,
          padding: '1px 6px', background: p.accentSoft, borderRadius: 4, letterSpacing: '0.05em',
        }}>{bonus}</span>
      )}
      <span style={{
        fontFamily: 'Inter', fontSize: 12, color: p.ink, fontWeight: 500, marginTop: 2,
      }}>NT$ {price}</span>
    </button>
  );
}

function WickUse({ p, cost, zh, en, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
      borderBottom: last ? 'none' : `0.5px solid ${p.line}`,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', background: p.accentSoft, borderRadius: 999,
        minWidth: 40, justifyContent: 'center',
      }}>
        <WickGlyph size={9} color={p.accent} />
        <span style={{ fontFamily: 'Inter', fontSize: 11, color: p.accent, fontVariantNumeric: 'tabular-nums' }}>{cost}</span>
      </div>
      <span style={{ flex: 1, fontFamily: '"Noto Serif TC", serif', fontSize: 13, color: p.inkSoft }}>
        {zh}<span style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', color: p.muted, opacity: 0.7, marginLeft: 8, fontSize: 11 }}>{en}</span>
      </span>
    </div>
  );
}

function CandleIcon({ color, lit }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      {lit && <ellipse cx="11" cy="4" rx="2.2" ry="3.3" fill={color} opacity="0.9"/>}
      {lit && <ellipse cx="11" cy="4" rx="1" ry="1.6" fill="#fff" opacity="0.7"/>}
      <rect x="9" y="7" width="4" height="11" rx="0.6" fill={color} opacity={lit ? 1 : 0.55}/>
      <ellipse cx="11" cy="18" rx="4.5" ry="0.8" fill={color} opacity="0.35"/>
    </svg>
  );
}

Object.assign(window, { ScreenUpgrade, CandleIcon });
