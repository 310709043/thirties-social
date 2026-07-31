// copy.ts — bilingual strings (Chinese primary, English secondary)

export type Lang = 'zh' | 'en';

const COPY: Record<string, { zh: string; en: string }> = {
  appName:         { zh: '燭影私語',         en: 'Candle Whisper' },
  appTag:          { zh: '安靜地說',         en: 'Speak quietly' },

  // Onboarding
  ob1Title:        { zh: '這裡沒有人要你完美', en: 'No one needs you to be perfect here' },
  ob1Body:         { zh: '不用名字、不用照片。你只是一個今晚想被聽見的人。', en: 'No name, no face — just someone who wants to be heard tonight.' },
  ob2Title:        { zh: '說出口，就讓它慢慢熄滅', en: 'Say it — then let it fade' },
  ob2Body:         { zh: '和一個人靜靜說說話，結束後對話就會刪除，沒有人能回頭翻看。隨時可以離開、封鎖或檢舉。', en: 'Talk quietly with one person; when it ends the conversation is deleted and no one can scroll back. Leave, block or report any time.' },
  ob3Title:        { zh: '在這裡，大家都一樣', en: 'Here, everyone is the same' },
  ob3Body:         { zh: '可以待在火盆旁、找一個人說說話，或只是靜靜看著。不用有事，也可以來。', en: 'Sit by a brazier, find one person to talk to, or just watch quietly. You don\'t need a reason to be here.' },
  obContinue:      { zh: '我準備好了',       en: 'I am ready' },
  obSigil:         { zh: '今晚的識別符',     en: "Tonight's sigil" },
  obSigilHint:     { zh: '這是你今天的樣子。明天它會換掉。', en: 'This is how you appear today. Tomorrow it changes.' },
  obShuffle:       { zh: '換一個',           en: 'Reshuffle' },

  // Mood
  moodHeader:      { zh: '此刻，你是什麼樣子都可以', en: 'Right now, you can be however you are' },
  moodPrompt:      { zh: '不用很難過，也不用假裝沒事。想說再說。', en: "No need to be sad, no need to pretend you're fine. Say it only if you want." },
  moodPlaceholder: { zh: '想說的、不想說的，都放這裡⋯⋯', en: 'What you want to say, or not — leave it here…' },
  moodEnter:       { zh: '和一個人說說話',   en: 'Talk with someone' },
  moodSkip:        { zh: '什麼都不想說，先待著就好', en: 'Nothing to say — just stay a while' },
  moodSuggested:   { zh: '今晚有人在說',     en: 'People are talking about' },
  // First-time guidance — answers "what can I do here?"
  moodGuide:       { zh: '可以寫下此刻、找個火盆待著，或和一個人靜靜說說話。', en: 'Write how you feel, sit by a brazier, or talk quietly with one person.' },

  // Rooms
  room_lonely:     { zh: '今晚很孤單',       en: 'lonely tonight' },
  room_partner:    { zh: '和另一半的距離',   en: 'distance with a partner' },
  room_cant_sleep: { zh: '睡不著',           en: "can't sleep" },
  room_transition: { zh: '生活在變',         en: 'life is shifting' },
  room_quiet:      { zh: '只想有人在線',     en: 'someone just being here' },
  room_doubt:      { zh: '不確定還要不要繼續', en: 'unsure whether to stay' },

  // Room screen
  roomPeople:      { zh: '人在這個火盆',     en: 'in this room' },
  roomEphemeral:   { zh: '這個火盆之後會關閉', en: 'this room will close later' },

  // Match
  matchHeader:     { zh: '有人想和你說話',   en: 'Someone wants to talk' },
  matchSubhead:    { zh: '對方寫的是：',     en: 'They wrote:' },
  matchAccept:     { zh: '接受 · 開始 30 分鐘', en: 'Accept · start 30 min' },
  matchDecline:    { zh: '不是現在',         en: 'Not now' },
  matchTime:       { zh: '30 分鐘窗口',      en: '30-minute window' },
  matchHint:       { zh: '任何一方可以隨時退出', en: 'Either side may leave any time' },

  // Chat
  chatRemaining:   { zh: '剩餘',             en: 'time left' },
  chatPlaceholder: { zh: '輕輕地說⋯⋯',       en: 'Say it softly…' },
  chatEnd:         { zh: '結束對話',         en: 'End the conversation' },

  // Safety
  safetyTitle:     { zh: '需要幫忙嗎？',     en: 'Need help?' },
  safetyBlurb:     { zh: '無論對方說什麼，你都可以隨時離開。', en: 'Whatever they say, you can leave at any moment.' },
  safetyBlock:     { zh: '封鎖並消失',       en: 'Block and disappear' },
  safetyReport:    { zh: '檢舉這次對話',     en: 'Report this conversation' },
  safetyExit:      { zh: '安靜地離開',       en: 'Leave quietly' },
  safetyFooter:    { zh: '對話進行中會同步訊息；結束時會刪除內容。', en: 'Messages sync while the conversation is active and are deleted when it ends.' },

  // Room extras
  roomEnter1on1:    { zh: '邀一個人聊',       en: 'invite one to talk' },
  roomLeave:        { zh: '安靜地離開',       en: 'leave quietly' },

  // Chat extras
  chatReveal:       { zh: '想讓對方看清楚一點？', en: 'Reveal a little more?' },
  chatRevealBtn:    { zh: '揭開一層',         en: 'Lift one veil' },
  chatExtend:       { zh: '雙方同意 +30 分',  en: 'Both agree · +30 min' },
  chatExpiring:     { zh: '這則訊息 30 秒後消失', en: 'this message fades in 30s' },

  // Safety extras
  safetyHotline:    { zh: '撥打 24 小時情緒專線', en: 'Call 24h emotional support' },

  // Close
  closeHeader:      { zh: '今天的窗口關了',   en: "Today's window is closed" },
  closeBody:        { zh: '今晚說過的話，沒有留下任何記錄。', en: 'What was said tonight was not kept.' },
  closeReturn:      { zh: '明天 03:00 之後再回來', en: 'Come back after 03:00 tomorrow' },
  closeTimer:       { zh: '下一個窗口',       en: 'next window' },
  closeRest:        { zh: '先去休息',         en: 'Rest for now' },

  // No-trace
  noShot:           { zh: '截圖已封鎖',       en: 'Screenshots blocked' },
  noShotSub:        { zh: '對方的裝置也是',   en: 'On their device too' },
  dailyWipe:        { zh: '每日 03:00 清空',  en: 'Wiped daily at 03:00' },
  noTrace:          { zh: '不留下任何痕跡',   en: 'No traces remain' },

  // Photo veil
  veilTitle:        { zh: '想讓對方看到嗎？', en: 'Want them to see you?' },
  veilBody:         { zh: '一張照片，覆上四層紗。對方每揭一層，要付出一點燭芯。', en: 'One photo, four veils. Each lift costs a wick from them.' },
  veilUpload:       { zh: '挑一張照片',       en: 'Choose a photo' },
  veilSend:         { zh: '送出·暫不揭曉',    en: 'Send · veiled' },
  veilLift1:        { zh: '第一層 · 輪廓',    en: 'Layer 1 · outline' },
  veilLift2:        { zh: '第二層 · 光與影',  en: 'Layer 2 · light & shadow' },
  veilLift3:        { zh: '第三層 · 局部',    en: 'Layer 3 · fragments' },
  veilLift4:        { zh: '第四層 · 全部',    en: 'Layer 4 · full' },
  veilCost:         { zh: '需 2 燭芯',        en: '2 wicks' },
  veilOnlyHere:     { zh: '此照片僅存在本次對話。對話結束即抹除。', en: 'This photo only exists in this conversation. Erased when it ends.' },

  // Loft 夜閣
  loftName:         { zh: '夜閣',             en: 'The Loft' },
  loftTagline:      { zh: '被想念一次。不用解釋什麼。', en: 'To be wanted once. Without explaining anything.' },
  loftSub:          { zh: '今晚。另一個人。陽台上看不見的那一面。', en: 'Tonight. Another person. The side that never shows in daylight.' },
  loftEnter:        { zh: '今晚進入夜閣',     en: 'Enter the Loft tonight' },
  loftLocked:       { zh: '尚未開啟',         en: 'Not yet opened' },
  loftConsent:      { zh: '進門前',           en: 'Before you enter' },
  loftLine1:        { zh: '願意的話，可以慢慢靠近一些——帶紗照片、交心（雙方同意）', en: 'If you both wish, come a little closer — veiled photos, by mutual consent' },
  loftLine2:        { zh: '一切都在燭影私語裡進行，私下金錢往來會被永久封鎖', en: 'Everything stays in the app — off-app money dealings mean a permanent ban' },
  loftAgree:        { zh: '推門',             en: 'Push the door' },
  loftCost:         { zh: '今晚 5 燭芯',      en: 'Tonight · 5 wicks' },
  loftBack:         { zh: '改天',             en: 'Another night' },
  loftInside:       { zh: '在夜閣裡',         en: 'Inside the Loft' },
  loftPeople:       { zh: '今晚闋著的人',     en: 'who lingers tonight' },
  loftClose:        { zh: '每晚 21:00–05:00 開放', en: 'Open nightly 21:00–05:00' },
  loftWhisper:      { zh: '輕輕說一句·身體會記得', en: 'Whisper — the body remembers' },
  loftPulse1:       { zh: '想你',             en: 'thinking of you' },
  loftPulse2:       { zh: '繼續',             en: 'go on' },
  loftPulse3:       { zh: '躺下了',           en: 'lying down' },
  loftPulse4:       { zh: '有你真好',         en: 'glad you are here' },
  loftPulseCost:    { zh: '1 芯',             en: '1 wick' },
  loftGift:         { zh: '送出一根燭·謝謝對方', en: 'Send a candle · thank them' },
  loftGiftCost:     { zh: '5 芯',             en: '5 wicks' },

  // Wicks / subscription
  wickName:         { zh: '燭芯',             en: 'Wicks' },
  wickBalance:      { zh: '剩餘',             en: 'balance' },
  upgradeTitle:     { zh: '兩種陪你的方式',   en: 'Two ways to stay' },
  upgradeBlurb:     { zh: '不收廣告。不賣資料。不用會員等級換取曝光。', en: 'No ads. No data sold. No tiers buy you visibility.' },
  tierFree:         { zh: '一根蠟燭',         en: 'One Candle' },
  tierFreeSub:      { zh: '每日 10 次一對一 · 每週夜閣 1 次 · 每日 2 芯', en: '10 one-to-one conversations/day · Loft weekly · 2 wicks/day' },
  tierVigil:        { zh: '守夜會員',         en: 'Vigil' },
  tierVigilPrice:   { zh: 'NT$ 390 / 月',     en: 'NT$ 390 / mo' },
  tierVigilBlurb:   { zh: '不限次一對一 · 夜閣無限進出 · 每日 5 芯 · 全部 16 種身份 · 免費開火盆 · 可提出「留下彼此」', en: 'Unlimited one-to-one conversations · Loft every night · 5 wicks/day · all 16 identities · free rooms · may propose "keeping each other"' },
  wicksTitle:       { zh: '一次性 · 燭芯',    en: 'One-off · Wicks' },
  wicksBlurb:       { zh: '燭芯只用於額外次數與雙方自願的靠近功能；一般聊天不扣燭芯。', en: 'Wicks are only for extra usage and mutually chosen closer features; ordinary talking costs no wicks.' },
  wick10:           { zh: '10 芯',            en: '10 wicks' },
  wick30:           { zh: '30 芯',            en: '30 wicks' },
  wick100:          { zh: '100 芯',           en: '100 wicks' },
  vigilCta:         { zh: '訂閱守夜',         en: 'Start Vigil' },

  // Settings
  setTitle:         { zh: '設定',             en: 'Settings' },
  setIdentity:      { zh: '識別',             en: 'Identity' },
  setIdentitySub:   { zh: '每天重新生成',     en: 'Regenerates daily' },
  setExpiry:        { zh: '訊息保存',         en: 'Message lifetime' },
  setExpirySub:     { zh: '對話結束後即消失', en: 'Gone when the chat ends' },
  setVisibility:    { zh: '可見度',           en: 'Visibility' },
  setVisibilitySub: { zh: '對方看到的模糊程度', en: 'How blurred you appear' },
  setCycle:         { zh: '24 小時循環',      en: '24-hour cycle' },
  setCycleSub:      { zh: '今晚 03:00 重設',  en: 'Resets tonight at 03:00' },
  setLanguage:      { zh: '語言',             en: 'Language' },
  setSafety:        { zh: '安全工具',         en: 'Safety tools' },
  setAbout:         { zh: '為什麼這樣設計',   en: 'Why this exists' },
  setLeave:         { zh: '刪除帳號',         en: 'Delete account' },

  // Tonight mode — state picker before entering match / loft
  tonightModeTitle:   { zh: '今晚你在哪個位置？', en: 'Where are you tonight?' },
  tonightModeHint:    { zh: '對方會看到這個，幫你們找到同頻的人', en: 'The other person sees this — so you find someone on the same wavelength' },
  modeJustHere:       { zh: '只想待著',       en: 'Just here' },
  modeJustHereDesc:   { zh: '不用說話，存在就好', en: 'No words needed — just being' },
  modeWantToTalk:     { zh: '想說說話',       en: 'Want to talk' },
  modeWantToTalkDesc: { zh: '聊聊就好，不往哪裡走', en: 'A good conversation — nothing more' },
  modeOpenToMore:     { zh: '願意靠近一點',   en: 'Open to more' },
  modeOpenToMoreDesc: { zh: '想要更深的連結', en: 'Looking for something deeper' },
  modeConfirm:        { zh: '就這樣',         en: 'That\'s me' },
  modeOtherIs:        { zh: '對方今晚',       en: 'They\'re' },
};

export function t(key: string, lang: Lang = 'zh'): string {
  const c = COPY[key];
  if (!c) return key;
  return lang === 'en' ? c.en : c.zh;
}

export function tAlt(key: string, lang: Lang = 'zh'): string {
  const c = COPY[key];
  if (!c) return '';
  return lang === 'en' ? c.zh : c.en;
}

export { COPY };
