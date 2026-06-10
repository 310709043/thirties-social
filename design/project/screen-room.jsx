// screen-room.jsx — anonymous group room based on shared emotional state

function ScreenRoom({ p, lang, identityKind, seed, onNext, onSafety, onInviteAccepted }) {
  const [showCreate, setShowCreate] = React.useState(false);
  const [invite, setInvite] = React.useState(null);      // message being invited
  const [inviteSent, setInviteSent] = React.useState(false);
  const [roomSeed, setRoomSeed] = React.useState(seed);   // stable identity within this room
  React.useEffect(() => {
    if (inviteSent) {
      const id = setTimeout(onInviteAccepted || onNext, 2400); // demo: she accepts → chat opens
      return () => clearTimeout(id);
    }
  }, [inviteSent]);
  const messages = [
    { seed: 'a7x', text_zh: '結婚十年，最近說話像在公司開會。', text_en: 'Ten years married. Talking feels like a meeting.', age: 3 },
    { seed: 'k2m', text_zh: '想找人說但又不想被認識。', text_en: 'Want someone to talk to, but not be known.', age: 7 },
    { seed: 'q9b', text_zh: '他在身邊，我還是覺得很孤單。', text_en: 'He is next to me. I still feel alone.', age: 12 },
    { seed: 'r4n', text_zh: '不是想離開。只是想被聽到。', text_en: 'Not leaving. Just want to be heard.', age: 18 },
  ];
  return (
    <VaporBackground p={p}>
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        color: p.ink,
      }}>
        {/* TOP — back chevron, dots */}
        <div style={{
          padding: '54px 18px 0 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onNext} style={{
            background: p.surface, border: `0.5px solid ${p.line}`,
            backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
            width: 36, height: 36, borderRadius: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <svg width="8" height="14" viewBox="0 0 8 14"><path d="M6 1 L1 7 L6 13" stroke={p.muted} strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCreate(true)} style={{
              background: p.surface, border: `0.5px solid ${p.line}`,
              backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
              height: 36, padding: '0 14px', borderRadius: 36,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.ink,
            }}>
              <span style={{ fontSize: 15, lineHeight: 1, marginTop: -1 }}>+</span>
              {lang === 'en' ? 'open a room' : '開房間'}
            </button>
            <button onClick={onSafety} style={{
              background: p.surface, border: `0.5px solid ${p.line}`,
              backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
              height: 36, padding: '0 14px', borderRadius: 36,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.muted,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill="none" stroke={p.muted} strokeWidth="1"/>
                <path d="M6 3 V 6.5 M6 8.5 V 9" stroke={p.muted} strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {lang === 'en' ? 'safety' : '安全'}
            </button>
          </div>
        </div>

        {/* HEADER — the room's mood + room status */}
        <div style={{ padding: '20px 24px 12px' }}>
          <div style={{
            fontFamily: 'Inter', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: p.muted, fontWeight: 500,
          }}>{lang === 'en' ? 'Room' : '房間'} · 015</div>
          <div style={{
            marginTop: 6,
            fontFamily: '"Noto Serif TC", serif', fontSize: 28, color: p.ink, lineHeight: 1.25,
            fontWeight: 400,
          }}>
            {t('room_partner', lang)}
          </div>
          <div style={{
            marginTop: 2,
            fontFamily: '"EB Garamond", serif', fontStyle: lang === 'zh' ? 'italic' : 'normal',
            fontSize: 14, color: p.muted, opacity: 0.7,
          }}>
            {tAlt('room_partner', lang)}
          </div>
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: 'Inter', fontSize: 11, color: p.muted,
          }}>
            {/* live circles */}
            <div style={{ display: 'flex' }}>
              {['s1','s2','s3','s4'].map((s, i) => (
                <div key={s} style={{
                  marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i,
                  border: `1.5px solid ${p.dark ? '#0d1224' : '#fff'}`,
                  borderRadius: 999, width: 22, height: 22,
                  background: p.surfaceSolid,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Identity kind="sigil" seed={s} size={18} palette={p} />
                </div>
              ))}
              <div style={{
                marginLeft: -10, zIndex: 0,
                border: `1.5px solid ${p.dark ? '#0d1224' : '#fff'}`,
                borderRadius: 999, width: 22, height: 22,
                background: p.accent, color: p.dark ? '#15172e' : '#fbf5e4',
                fontFamily: 'Inter', fontSize: 9, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+8</div>
            </div>
            <span>12 {t('roomPeople', lang)}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{t('roomEphemeral', lang)}</span>
          </div>
        </div>

        {/* MESSAGE FEED */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 24px 12px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {messages.map((m, i) => (
            <RoomMessage key={i} p={p} lang={lang} m={m} identityKind={identityKind}
              onInvite={() => setInvite(m)} />
          ))}
          {/* echo divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', opacity: 0.5 }}>
            <Hairline p={p} style={{ flex: 1 }} />
            <span style={{
              fontFamily: '"EB Garamond", serif', fontStyle: 'italic',
              fontSize: 11, color: p.muted,
            }}>{lang === 'en' ? 'earlier' : '更早'}</span>
            <Hairline p={p} style={{ flex: 1 }} />
          </div>
          <div style={{
            fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: p.muted, opacity: 0.55,
            textAlign: 'center', padding: '8px 24px', lineHeight: 1.6,
          }}>
            {lang === 'en' ? 'older fragments dissolve into the room.' : '更早的片段已融入房間之中。'}
          </div>
        </div>

        {/* COMPOSER + INVITE */}
        <div style={{
          padding: '12px 18px 18px',
          background: p.dark
            ? 'linear-gradient(to top, rgba(13,18,36,0.9) 30%, transparent)'
            : 'linear-gradient(to top, rgba(255,255,255,0.7) 30%, transparent)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          {/* WHO YOU ARE IN THIS ROOM — stable within the room, reshuffle before speaking */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 10,
          }}>
            <Identity kind={identityKind === 'character' ? 'sigil' : identityKind}
              seed={roomSeed} size={22} palette={p} lang={lang} trust={0.15} />
            <span style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.muted,
            }}>
              {lang === 'en' ? 'here you are ' : '你在這個房間是 '}
              <span style={{ color: p.ink }}><ColorAdj seed={roomSeed} lang={lang} showSwatch={false} /></span>
            </span>
            <button onClick={() => setRoomSeed(Math.random().toString(36).slice(2, 8))} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: '"Noto Serif TC", serif', fontSize: 11, color: p.accent,
              padding: '2px 6px',
            }}>↻ {lang === 'en' ? 'reshuffle' : '換一個'}</button>
          </div>
          <GlassCard p={p} padding={6} radius={28} style={{
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <input placeholder={lang === 'en' ? 'whisper into the room…' : '對房間說一句⋯⋯'}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                color: p.ink, fontFamily: '"Noto Serif TC", serif',
                fontSize: 15, padding: '12px 14px',
              }} />
            <button onClick={onNext} style={{
              width: 38, height: 38, borderRadius: 38,
              background: p.ink, color: p.dark ? '#1a1530' : '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 2 V 12 M3 6 L7 2 L11 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </GlassCard>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.muted,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill="none" stroke={p.accent} strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
                <circle cx="6" cy="6" r="2" fill={p.accent}/>
              </svg>
              {lang === 'en' ? 'tap any message to invite that person to talk' : '輕點任一則訊息，邀請那個人私聊'}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ROOM SHEET */}
      {showCreate && (
        <CreateRoomSheet p={p} lang={lang} onClose={() => setShowCreate(false)} />
      )}

      {/* INVITE SHEET — the 1:1 consent flow, sender side */}
      {invite && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 92,
          background: p.dark ? 'rgba(10,12,28,0.7)' : 'rgba(160,150,170,0.4)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          <div onClick={() => !inviteSent && setInvite(null)} style={{ flex: 1 }}/>
          <div style={{
            background: p.bgSolid, borderRadius: '28px 28px 0 0',
            padding: '22px 24px 34px', borderTop: `0.5px solid ${p.line}`,
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 4, background: p.line, margin: '0 auto 18px' }}/>
            {!inviteSent ? (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Identity kind={identityKind === 'character' ? 'sigil' : identityKind} seed={invite.seed} size={44} palette={p} lang={lang} trust={0.15}/>
                <div>
                  <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 15, color: p.ink }}>
                    <ColorAdj seed={invite.seed} lang={lang} showSwatch={false}/>
                  </div>
                  <div style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 11, color: p.muted, marginTop: 2 }}>
                    {lang === 'en' ? 'in this room · anonymous' : '在這個房間裡 · 匿名'}
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: 14, padding: '12px 16px', borderRadius: 14,
                background: p.surface, border: `0.5px solid ${p.line}`,
                fontFamily: '"Noto Serif TC", serif', fontSize: 14, color: p.inkSoft, lineHeight: 1.6,
              }}>「{lang === 'en' ? invite.text_en : invite.text_zh}」</div>
              <div style={{
                marginTop: 14, fontFamily: '"Noto Serif TC", serif', fontSize: 12.5,
                color: p.muted, lineHeight: 1.7,
              }}>
                {lang === 'en'
                  ? 'They will see your sigil and tonight\u2019s line \u2014 nothing else. If they accept, a 30-minute window opens. If they decline, they never know who asked twice.'
                  : '對方只會看到你的識別與今晚寫的那句話。同意後開啟 30 分鐘窗口；拒絕的話，不會留下任何痕跡。'}
              </div>
              <SoftButton p={p} variant="primary" size="lg" full style={{ marginTop: 18 }}
                onClick={() => setInviteSent(true)}>
                {lang === 'en' ? 'Send the invitation' : '送出邀請'}
              </SoftButton>
              <button onClick={() => setInvite(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                color: p.muted, fontFamily: '"Noto Serif TC", serif', fontSize: 13, padding: '12px 0 0',
              }}>{lang === 'en' ? 'not now' : '不了'}</button>
            </>) : (
              <div style={{ textAlign: 'center', padding: '12px 0 6px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 14 }}>
                  {[0,1,2].map(i => <div key={i} style={{
                    width: 6, height: 6, borderRadius: 6, background: p.accent,
                    animation: `pulse 1.4s ${i*0.2}s infinite`,
                  }}/>)}
                </div>
                <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 16, color: p.ink }}>
                  {lang === 'en' ? 'Invitation sent · waiting' : '邀請已送出 · 等待對方'}
                </div>
                <div style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 12, color: p.muted, marginTop: 6 }}>
                  {lang === 'en' ? 'you can leave — we\u2019ll open the window if they say yes' : '你可以先離開，對方同意時窗口會自動開啟'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </VaporBackground>
  );
}

function CreateRoomSheet({ p, lang, onClose }) {
  const [name, setName] = React.useState('');
  const [hours, setHours] = React.useState(3);
  const [cap, setCap] = React.useState(12);
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90,
      background: p.dark ? 'rgba(10,12,28,0.7)' : 'rgba(160,150,170,0.4)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div onClick={onClose} style={{ flex: 1, cursor: 'pointer' }}/>
      <div style={{
        background: p.bgSolid, borderRadius: '28px 28px 0 0',
        padding: '22px 24px 32px', borderTop: `0.5px solid ${p.line}`,
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 4, background: p.line, margin: '0 auto 18px' }}/>
        <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: 20, color: p.ink, fontWeight: 500 }}>
          {lang === 'en' ? 'Open a room' : '開一個房間'}
        </div>
        <div style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 12, color: p.muted, marginTop: 4 }}>
          {lang === 'en' ? '開一個房間' : 'open a room'} · {lang === 'en' ? 'it dissolves when the time is up' : '時間到了會自己消失'}
        </div>

        {/* room feeling */}
        <div style={{ marginTop: 18 }}>
          <Cap p={p}>{lang === 'en' ? 'Name the feeling' : '給這個感覺一個名字'}</Cap>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={lang === 'en' ? 'e.g. "the house is too quiet tonight"' : '例：「今晚家裡太安靜」'}
            style={{
              marginTop: 8, width: '100%', boxSizing: 'border-box',
              padding: '13px 16px', borderRadius: 14,
              border: `0.5px solid ${p.line}`, outline: 'none',
              background: p.surface, color: p.ink,
              fontFamily: '"Noto Serif TC", serif', fontSize: 15,
            }}/>
        </div>

        {/* duration + cap */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Cap p={p}>{lang === 'en' ? 'Closes after' : '多久後關門'}</Cap>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              {[1, 3, 6].map(h => (
                <button key={h} onClick={() => setHours(h)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: hours === h ? p.ink : p.surface,
                  color: hours === h ? (p.dark ? '#1a1530' : '#fff') : p.ink,
                  border: `0.5px solid ${hours === h ? p.ink : p.line}`,
                  fontFamily: 'Inter', fontSize: 13, cursor: 'pointer',
                }}>{h}h</button>
              ))}
            </div>
          </div>
          <div>
            <Cap p={p}>{lang === 'en' ? 'Max people' : '人數上限'}</Cap>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              {[6, 12, 30].map(c => (
                <button key={c} onClick={() => setCap(c)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: cap === c ? p.ink : p.surface,
                  color: cap === c ? (p.dark ? '#1a1530' : '#fff') : p.ink,
                  border: `0.5px solid ${cap === c ? p.ink : p.line}`,
                  fontFamily: 'Inter', fontSize: 13, cursor: 'pointer',
                }}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        {/* rules note */}
        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: p.accentSoft, borderRadius: 12,
          fontFamily: '"Noto Serif TC", serif', fontSize: 12, color: p.inkSoft, lineHeight: 1.6,
        }}>
          {lang === 'en'
            ? 'Rooms are anonymous and unlogged. You moderate: long-press any message to mist it.'
            : '房間匿名、不留紀錄。你是房主：長按任何訊息可以讓它起霧（隱藏）。'}
        </div>

        <button onClick={onClose} disabled={!name.trim()} style={{
          marginTop: 18, width: '100%', height: 54, borderRadius: 999,
          background: name.trim() ? p.ink : p.line,
          color: name.trim() ? (p.dark ? '#1a1530' : '#fff') : p.muted,
          border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed',
          fontFamily: '"Noto Serif TC", serif', fontSize: 15, fontWeight: 500,
        }}>{lang === 'en' ? 'Open · free' : '開房 · 免費'}</button>
      </div>
    </div>
  );
}

function RoomMessage({ p, lang, m, identityKind, onInvite }) {
  const fade = Math.max(0.35, 1 - m.age * 0.04);
  return (
    <div onClick={onInvite} style={{ display: 'flex', gap: 12, opacity: fade, cursor: 'pointer' }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <Identity kind={identityKind === 'character' ? 'sigil' : identityKind}
          seed={m.seed} size={32} palette={p} lang={lang} trust={0.15} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          background: p.surface,
          backdropFilter: `blur(${p.glassBlur}px)`, WebkitBackdropFilter: `blur(${p.glassBlur}px)`,
          border: `0.5px solid ${p.line}`,
          borderRadius: '22px 22px 22px 6px',
          padding: '12px 16px',
          fontFamily: '"Noto Serif TC", serif',
          fontSize: 15, lineHeight: 1.55,
          color: p.ink,
        }}>
          {lang === 'en' ? m.text_en : m.text_zh}
        </div>
        <div style={{
          marginTop: 4, paddingLeft: 6,
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'Inter', fontSize: 10, color: p.muted, opacity: 0.7,
        }}>
          <ColorAdj seed={m.seed} lang={lang} showSwatch={false} />
          <span>·</span>
          <span>{m.age}m {lang === 'en' ? 'ago' : '前'}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenRoom });
