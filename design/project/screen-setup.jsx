// screen-setup.jsx — first-run profile setup (after onboarding intro, before mood)
// Audience: people inside marriages/relationships looking for connection outside them.
// Everything is chips — no free typing except the final line. Park never shows any of it.

function SetupChipRow({ p, label, alt, options, value, onPick, multi = false }) {
  const picked = (v) => multi ? (value || []).includes(v) : value === v;
  const pick = (v) => {
    if (multi) {
      const cur = value || [];
      onPick(picked(v) ? cur.filter(x => x !== v) : [...cur, v]);
    } else onPick(v);
  };
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <Cap p={p}>{label}</Cap>
        {alt && <span style={{
          fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
          fontSize: 11, color: p.muted, opacity: 0.6,
        }}>{alt}</span>}
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(o => (
          <button key={o} onClick={() => pick(o)} style={{
            padding: '9px 15px', borderRadius: 999, cursor: 'pointer',
            background: picked(o) ? (multi ? p.accentSoft : p.ink) : p.surface,
            color: picked(o) ? (multi ? p.ink : (p.dark ? '#1a1530' : '#fff')) : p.ink,
            border: `0.5px solid ${picked(o) ? (multi ? p.accent : p.ink) : p.line}`,
            fontFamily: '"Noto Serif TC", serif', fontSize: 13,
            transition: 'all 0.12s',
          }}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function ScreenSetup({ p, lang, identityKind, seed, onDone }) {
  const zh = lang !== 'en';
  const [gender, setGender] = React.useState(null);
  const [age, setAge] = React.useState(null);
  const [marriage, setMarriage] = React.useState(null);
  const [shape, setShape] = React.useState(null);
  const [seeking, setSeeking] = React.useState([]);
  const [boundary, setBoundary] = React.useState(null);
  const [when, setWhen] = React.useState([]);
  const [region, setRegion] = React.useState(null);
  const [picks, setPicks] = React.useState([]);
  const [line, setLine] = React.useState('');

  const ready = gender && age && marriage && seeking.length > 0 && boundary;

  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column',
        color: p.ink, overflowY: 'auto',
        padding: '60px 26px 30px',
      }}>
        <Cap p={p}>{zh ? '最後一步' : 'Last step'}</Cap>
        <div style={{
          marginTop: 8, fontFamily: '"Noto Serif TC", serif',
          fontSize: 28, fontWeight: 400, color: p.ink, lineHeight: 1.3,
        }}>{zh ? '說說你的情況' : 'Tell us where you are'}</div>
        <div style={{
          marginTop: 8, fontFamily: '"Noto Serif TC", serif',
          fontSize: 13, color: p.muted, lineHeight: 1.6,
        }}>{zh
          ? '這裡的人多半身邊都有一個人。誠實一點，配對才會準。公園永遠不顯示這些，只有夜閣看得到——而且只有你允許的部分。'
          : 'Most people here have someone beside them. Be honest — the matching depends on it. The Park never shows any of this; only the Loft can, and only what you allow.'}</div>

        {/* gender — drives the asymmetric economy */}
        <div style={{ marginTop: 24 }}>
          <Cap p={p}>{zh ? '我是' : 'I am'}</Cap>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { v: 'f', zh: '女生', en: 'Woman', note_zh: '夜閣免費 · 請求由你決定', note_en: 'Loft free · you approve requests' },
              { v: 'm', zh: '男生', en: 'Man',   note_zh: '夜閣憑燭芯 · 她同意才扣', note_en: 'Wicks · charged on consent' },
            ].map(g => (
              <div key={g.v} onClick={() => setGender(g.v)} style={{
                padding: '14px 10px', borderRadius: 16, cursor: 'pointer',
                background: gender === g.v ? p.accentSoft : p.surface,
                border: `1px solid ${gender === g.v ? p.accent : p.line}`,
                backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
                transition: 'all 0.15s',
              }}>
                <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 15, color: p.ink, fontWeight: 500, lineHeight: 1.3 }}>
                  {zh ? g.zh : g.en}
                </div>
                <div style={{
                  marginTop: 6, fontFamily: '"Noto Serif TC", serif',
                  fontSize: 10.5, color: p.muted, lineHeight: 1.5,
                }}>{zh ? g.note_zh : g.note_en}</div>
              </div>
            ))}
          </div>
        </div>

        <SetupChipRow p={p} label={zh ? '年齡' : 'Age'} alt={zh ? 'age' : '年齡'}
          options={['25−30', '31−35', '36−40', '41−45', '46+']}
          value={age} onPick={setAge} />

        <SetupChipRow p={p} label={zh ? '我的感情狀態' : 'My relationship'} alt={zh ? 'status' : '狀態'}
          options={zh
            ? ['穩定交往中', '同居', '訂婚 · 快結婚了', '已婚', '已婚 · 分居中', '偽單身', '開放關係', '對象是已婚的', '單身但說不清']
            : ['in a relationship', 'cohabiting', 'engaged', 'married', 'married · separated', 'single-passing', 'open', 'seeing someone married', 'single-ish']}
          value={marriage} onPick={setMarriage} />

        <SetupChipRow p={p} label={zh ? '它現在的樣子' : 'What it feels like now'} alt={zh ? 'honestly' : '誠實地說'}
          options={zh
            ? ['無性了', '喪偶式', '還有愛，但寂寞', '熱戀期過了', '正在想要不要離開', '說不清']
            : ['sexless', 'roommates', 'love remains, lonely', 'past the honeymoon', 'thinking of leaving', 'hard to say']}
          value={shape} onPick={setShape} />

        <SetupChipRow p={p} label={zh ? '我來找' : 'I am here for'} alt={zh ? 'multi · seeking' : '可複選'} multi
          options={zh
            ? ['一個樹洞', '情感陪伴', '曖昧', '線上親密', '不設限']
            : ['someone to listen', 'companionship', 'flirtation', 'online intimacy', 'no limits']}
          value={seeking} onPick={setSeeking} />

        <SetupChipRow p={p} label={zh ? '我的邊界' : 'My boundary'} alt={zh ? 'boundary' : '邊界'}
          options={zh
            ? ['只在線上', '或許可以見面', '看感覺']
            : ['online only', 'maybe meet', 'depends']}
          value={boundary} onPick={setBoundary} />

        <SetupChipRow p={p} label={zh ? '我通常有空的時候' : 'When I am free'} alt={zh ? 'multi · 別人找得到你的時段' : 'multi'} multi
          options={zh
            ? ['深夜', '午後', '上班時間', '碎片時間']
            : ['late night', 'afternoons', 'office hours', 'in-between']}
          value={when} onPick={setWhen} />

        <SetupChipRow p={p} label={zh ? '大概在' : 'Roughly in'} alt={zh ? '只到區域，不會更細' : 'region only, never finer'}
          options={zh
            ? ['北部', '中部', '南部', '東部', '不透露']
            : ['north', 'central', 'south', 'east', 'undisclosed']}
          value={region} onPick={setRegion} />

        <SetupChipRow p={p} label={zh ? '喜歡的東西' : 'Things I keep close'} alt={zh ? '可不填' : 'optional'} multi
          options={zh
            ? ['老電影', '深夜散步', '威士忌', '爵士', '雨聲', '下廚', '閱讀', '海']
            : ['old films', 'late walks', 'whisky', 'jazz', 'rain', 'cooking', 'reading', 'sea']}
          value={picks} onPick={setPicks} />

        {/* one line */}
        <div style={{ marginTop: 20 }}>
          <Cap p={p}>{zh ? '留給夜閣的一句話（可不填）' : 'One line, for the Loft (optional)'}</Cap>
          <input value={line} onChange={e => setLine(e.target.value)}
            placeholder={zh ? '例：「婚姻是兩個人輪流孤獨。」' : 'e.g. "Marriage is two people taking turns being lonely."'}
            style={{
              marginTop: 10, width: '100%', boxSizing: 'border-box',
              padding: '13px 16px', borderRadius: 14,
              border: `0.5px solid ${p.line}`, outline: 'none',
              background: p.surface, color: p.ink,
              fontFamily: '"Noto Serif TC", serif', fontSize: 14,
            }}/>
        </div>

        {/* age/device verification note */}
        <div style={{
          marginTop: 18, padding: '12px 14px', borderRadius: 14,
          background: p.accentSoft, border: `0.5px solid ${p.accent}30`,
          fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.inkSoft, lineHeight: 1.6,
        }}>
          {zh
            ? '按下開始即代表你已滿 18 歲。年齡驗證只在這台裝置上完成，不會被儲存。你填的一切，都能隨時改、隨時抹掉。'
            : 'Starting means you are over 18. Verification happens on this device only — never stored. Everything here can be changed or erased at any time.'}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        <SoftButton p={p} variant="primary" size="lg" full onClick={() => ready && onDone()}
          style={{ opacity: ready ? 1 : 0.4, marginTop: 18 }}>
          {zh ? '開始今晚' : 'Begin tonight'}
        </SoftButton>
      </div>
    </VaporBackground>
  );
}

Object.assign(window, { ScreenSetup, SetupChipRow });
