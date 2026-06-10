// app.jsx — root: wires Tweaks panel, screen jumper, iOS frame, and 10 screens

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "mist",
  "identityKind": "sigil",
  "moodInputKind": "text",
  "lang": "zh",
  "expiryStyle": "countdown",
  "density": "calm",
  "viewpoint": "m"
}/*EDITMODE-END*/;

const SCREENS = [
  { id: 'onboarding', zh: '介紹',   en: 'Onboard', group: '·' },
  { id: 'setup',      zh: '建資料', en: 'Setup',   group: '·' },
  { id: 'mood',       zh: '心情',   en: 'Mood',    group: '公園' },
  { id: 'room',       zh: '房間',   en: 'Room',    group: '公園' },
  { id: 'match',      zh: '邀請',   en: 'Match',   group: '公園' },
  { id: 'chat',       zh: '對話',   en: 'Chat',    group: '公園' },
  { id: 'loft',       zh: '入口',   en: 'Loft',    group: '夜閣' },
  { id: 'loftChat',   zh: '夜閣對話', en: 'Loft 1:1', group: '夜閣' },
  { id: 'peek',       zh: '她的頁', en: 'Her page', group: '夜閣' },
  { id: 'profile',    zh: '我的頁', en: 'My page', group: '個人' },
  { id: 'upgrade',    zh: '訂閱',   en: 'Vigil',   group: '個人' },
  { id: 'safety',     zh: '安全',   en: 'Safety',  group: '·' },
  { id: 'settings',   zh: '設定',   en: 'Settings', group: '·' },
  { id: 'close',      zh: '結束',   en: 'Close',   group: '·' },
];

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [seed, setSeed] = React.useState('mistveil');
  const [wicks, setWicks] = React.useState(12);
  const [vigil, setVigil] = React.useState(false);
  const [current, setCurrent] = React.useState(() => {
    return localStorage.getItem('thirty_screen') || 'mood';
  });
  React.useEffect(() => {
    localStorage.setItem('thirty_screen', current);
  }, [current]);

  const p = DIRECTIONS[tw.direction] || DIRECTIONS.mist;
  const lang = tw.lang;

  const navTo = (id) => setCurrent(id);

  let screen = null;
  switch (current) {
    case 'onboarding':
      screen = <ScreenOnboarding p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        setSeed={setSeed} onNext={() => navTo('setup')} />;
      break;
    case 'setup':
      screen = <ScreenSetup p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        onDone={() => navTo('mood')} />;
      break;
    case 'mood':
      screen = <ScreenMood p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        moodInputKind={tw.moodInputKind} density={tw.density}
        wicks={wicks} vigil={vigil}
        onLoft={() => navTo('loft')} onUpgrade={() => navTo('upgrade')} onProfile={() => navTo('profile')}
        onNext={() => navTo('room')} />;
      break;
    case 'room':
      screen = <ScreenRoom p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        onNext={() => navTo('match')} onSafety={() => navTo('safety')}
        onInviteAccepted={() => navTo('chat')} />;
      break;
    case 'match':
      screen = <ScreenMatch p={p} lang={lang} identityKind={tw.identityKind}
        onAccept={() => navTo('chat')} onDecline={() => navTo('room')} />;
      break;
    case 'chat':
      screen = <ScreenChat p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        expiryStyle={tw.expiryStyle} density={tw.density}
        wicks={wicks} setWicks={setWicks} onUpgrade={() => navTo('upgrade')}
        onSafety={() => navTo('safety')} onClose={() => navTo('close')} />;
      break;
    case 'loft':
      screen = <ScreenLoft p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        wicks={wicks} setWicks={setWicks}
        onBack={() => navTo('mood')} onEnter={() => navTo('loftChat')}
        onUpgrade={() => navTo('upgrade')} />;
      break;
    case 'loftChat':
      screen = <ScreenLoftChat p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        wicks={wicks} setWicks={setWicks} viewpoint={tw.viewpoint}
        onBack={() => navTo('loft')} onPeek={() => navTo('peek')} />;
      break;
    case 'peek':
      screen = <ScreenProfile p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        wicks={wicks} setWicks={setWicks} vigil={vigil} mine={false}
        onBack={() => navTo('loftChat')} onUpgrade={() => navTo('upgrade')} />;
      break;
    case 'profile':
      screen = <ScreenProfile p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        wicks={wicks} setWicks={setWicks} vigil={vigil} mine={true}
        onBack={() => navTo('mood')} onUpgrade={() => navTo('upgrade')} />;
      break;
    case 'upgrade':
      screen = <ScreenUpgrade p={p} lang={lang}
        wicks={wicks} setWicks={setWicks}
        subscribed={vigil} setSubscribed={setVigil}
        onBack={() => navTo('mood')} />;
      break;
    case 'safety':
      screen = <ScreenSafety p={p} lang={lang} onBack={() => navTo('chat')} onLeave={() => navTo('close')} />;
      break;
    case 'settings':
      screen = <ScreenSettings p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        onBack={() => navTo('mood')} />;
      break;
    case 'close':
      screen = <ScreenClose p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        onRest={() => navTo('mood')} />;
      break;
    default:
      screen = <ScreenMood p={p} lang={lang} identityKind={tw.identityKind} seed={seed}
        moodInputKind={tw.moodInputKind} density={tw.density}
        wicks={wicks} vigil={vigil}
        onLoft={() => navTo('loft')} onUpgrade={() => navTo('upgrade')}
        onNext={() => navTo('room')} />;
  }

  return (
    <div className="stage">
      {/* Direction label */}
      <div className="direction-label">
        <span style={{ opacity: 0.5 }}>第卅者 · The Other</span>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <b>{p.nameZh} {p.nameEn}</b>
        &nbsp;<span style={{ opacity: 0.4 }}>{p.blurb}</span>
      </div>

      {/* Device with glow */}
      <div className="device-wrap" style={{ '--glow': p.glow }}>
        <IOSDevice width={390} height={844} dark={p.statusDark}>
          <div style={{
            position: 'absolute', inset: 0,
            background: p.bgSolid,
            overflow: 'hidden',
          }}>
            {screen}
          </div>
        </IOSDevice>
      </div>

      {/* Screen jumper — grouped */}
      <div className="jumper">
        {SCREENS.map((s, i) => {
          const prevGroup = i > 0 ? SCREENS[i-1].group : null;
          const newGroup = s.group !== prevGroup && i > 0;
          return (
            <React.Fragment key={s.id}>
              {newGroup && <div className="sep" />}
              <button
                className={current === s.id ? 'active' : ''}
                onClick={() => navTo(s.id)}>
                {lang === 'en' ? s.en : s.zh}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks · 微調">
        <TweakSection label="Aesthetic" />
        <TweakRadio  label="Direction" value={tw.direction}
          options={['mist', 'nocturne', 'ink']}
          onChange={(v) => setTweak('direction', v)} />

        <TweakSection label="Identity metaphor" />
        <TweakSelect label="Anonymous shape" value={tw.identityKind}
          options={[
            { value: 'sigil',      label: 'Generative sigil' },
            { value: 'silhouette', label: 'Blurred silhouette' },
            { value: 'color+adj',  label: 'Color + adjective' },
            { value: 'character',  label: 'Chinese character seal' },
            { value: 'text',       label: 'Just an adjective' },
          ]}
          onChange={(v) => setTweak('identityKind', v)} />

        <TweakSection label="Mood input" />
        <TweakSelect label="How to enter mood" value={tw.moodInputKind}
          options={[
            { value: 'text',   label: 'Free-text sentence' },
            { value: 'cards',  label: 'Pre-written feeling cards' },
            { value: 'slider', label: 'Emotion sliders' },
            { value: 'breath', label: 'Breath-paced check-in' },
          ]}
          onChange={(v) => setTweak('moodInputKind', v)} />

        <TweakSection label="Language" />
        <TweakRadio  label="Primary" value={tw.lang}
          options={[{ value: 'zh', label: '中文' }, { value: 'en', label: 'EN' }]}
          onChange={(v) => setTweak('lang', v)} />

        <TweakSection label="Message expiry" />
        <TweakSelect label="In-chat decay" value={tw.expiryStyle}
          options={[
            { value: 'countdown', label: 'Whole-convo countdown only' },
            { value: 'fade',      label: 'Per-message slow fade' },
            { value: 'ring',      label: 'Per-message timer ring' },
            { value: 'ink',       label: 'Ink-wash blur on age' },
          ]}
          onChange={(v) => setTweak('expiryStyle', v)} />

        <TweakSection label="Density" />
        <TweakRadio  label="Spacing" value={tw.density}
          options={['calm', 'dense']}
          onChange={(v) => setTweak('density', v)} />

        <TweakSection label="Demo state" />
        <TweakRadio  label="Viewpoint" value={tw.viewpoint}
          options={[{ value: 'm', label: '男生' }, { value: 'f', label: '女生' }]}
          onChange={(v) => setTweak('viewpoint', v)} />
        <TweakNumber label="Wicks balance" value={wicks}
          min={0} max={999} step={1}
          onChange={setWicks} />
        <TweakToggle label="Vigil subscription" value={vigil}
          onChange={setVigil} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
