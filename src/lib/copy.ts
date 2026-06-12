// copy.ts — bilingual strings (Chinese primary, English secondary)

export type Lang = 'zh' | 'en';

const COPY: Record<string, { zh: string; en: string }> = {
  appName:         { zh: '第卅者',           en: 'The Other' },
  appTag:          { zh: '安靜地說',         en: 'Speak quietly' },

  // Onboarding
  ob1Title:        { zh: '不用名字，也不用照片', en: 'No name. No face.' },
  ob1Body:         { zh: '在這裡，你只是一個今晚想說話的人。', en: 'Here, you are only someone who wanted to talk tonight.' },
  ob2Title:        { zh: '訊息會自己消失',   en: 'Messages dissolve' },
  ob2Body:         { zh: '對話結束後，沒有人能回頭翻看。', en: 'When it ends, no one can scroll back.' },
  ob3Title:        { zh: '一次只連結一個人', en: 'One person at a time' },
  ob3Body:         { zh: '每二十四小時，重置一次。', en: 'Every twenty-four hours, the cycle resets.' },
  obContinue:      { zh: '我準備好了',       en: 'I am ready' },
  obSigil:         { zh: '今晚的識別符',     en: "Tonight's sigil" },
  obSigilHint:     { zh: '這是你今天的樣子。明天它會換掉。', en: 'This is how you appear today. Tomorrow it changes.' },
  obShuffle:       { zh: '換一個',           en: 'Reshuffle' },

  // Mood
  moodHeader:      { zh: '今晚怎麼了？',     en: 'What is it tonight?' },
  moodPrompt:      { zh: '寫一句關於最近的事。可以是和另一半的，也可以不是。', en: 'A line about what is happening. About a partner, or not.' },
  moodPlaceholder: { zh: '最近和他⋯⋯',       en: 'Lately with them…' },
  moodEnter:       { zh: '進入',             en: 'Enter' },
  moodSkip:        { zh: '不想寫，給我一個房間', en: 'Skip — just find me a room' },
  moodSuggested:   { zh: '今晚有人在說',     en: 'People are talking about' },

  // Rooms
  room_lonely:     { zh: '今晚很孤單',       en: 'lonely tonight' },
  room_partner:    { zh: '和另一半的距離',   en: 'distance with a partner' },
  room_cant_sleep: { zh: '睡不著',           en: "can't sleep" },
  room_transition: { zh: '生活在變',         en: 'life is shifting' },
  room_quiet:      { zh: '只想有人在線',     en: 'someone just being here' },
  room_doubt:      { zh: '不確定還要不要繼續', en: 'unsure whether to stay' },

  // Room screen
  roomPeople:      { zh: '人在這個房間',     en: 'in this room' },
  roomEphemeral:   { zh: '這個房間 02:14 後關閉', en: 'this room closes in 02:14' },

  // Match
  matchHeader:     { zh: '有人想和你說話',   en: 'Someone wants to talk' },
  matchSubhead:    { zh: '他寫的是：',       en: 'They wrote:' },
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
  safetyFooter:    { zh: '我們不會儲存對話內容。', en: 'We never store conversation content.' },

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
  closeBody:        { zh: '你和八個人說了話。沒有留下任何記錄。', en: 'You spoke with eight people. Nothing was kept.' },
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
  loftLine1:        { zh: '可交換聯絡 · 可約見面 · 可傳私密照（雙方同意）', en: 'Contact, meeting, private photos — all by mutual consent' },
  loftLine2:        { zh: '金錢往來一律使用燭芯，私下交易永久封鎖', en: 'All value flows through wicks — off-app deals mean a permanent ban' },
  loftAgree:        { zh: '推門',             en: 'Push the door' },
  loftCost:         { zh: '今晚 5 燭芯',      en: 'Tonight · 5 wicks' },
  loftBack:         { zh: '改天',             en: 'Another night' },
  loftInside:       { zh: '在夜閣裡',         en: 'Inside the Loft' },
  loftPeople:       { zh: '今晚闋著的人',     en: 'who lingers tonight' },
  loftClose:        { zh: '夜閣 05:00 自動關門', en: 'Loft closes at 05:00' },
  loftWhisper:      { zh: '輕輕說一句·身體會記得', en: 'Whisper — the body remembers' },
  loftPulse1:       { zh: '想你',             en: 'thinking of you' },
  loftPulse2:       { zh: '繼續',             en: 'go on' },
  loftPulse3:       { zh: '躺下了',           en: 'lying down' },
  loftPulse4:       { zh: '有你真好',         en: 'glad you are here' },
  loftPulseCost:    { zh: '1 芯',             en: '1 wick' },
  loftGift:         { zh: '送出一根燭·謝謝他', en: 'Send a candle · thank them' },
  loftGiftCost:     { zh: '5 芯',             en: '5 wicks' },

  // Wicks / subscription
  wickName:         { zh: '燭芯',             en: 'Wicks' },
  wickBalance:      { zh: '剩餘',             en: 'balance' },
  upgradeTitle:     { zh: '兩種陪你的方式',   en: 'Two ways to stay' },
  upgradeBlurb:     { zh: '不收廣告。不賣資料。不用會員等級換取曝光。', en: 'No ads. No data sold. No tiers buy you visibility.' },
  tierFree:         { zh: '一根蠟燭',         en: 'One Candle' },
  tierFreeSub:      { zh: '免費',             en: 'Free' },
  tierVigil:        { zh: '守夜會員',         en: 'Vigil' },
  tierVigilPrice:   { zh: 'NT$ 168 / 月',     en: 'NT$ 168 / mo' },
  tierVigilBlurb:   { zh: '不限段對話 · 全部識別 · 夜閣通行 · 照片紗罩 · 每日一芯', en: 'Unlimited talks · all identities · Loft access · photo veils · 1 daily wick' },
  wicksTitle:       { zh: '一次性 · 燭芯',    en: 'One-off · Wicks' },
  wicksBlurb:       { zh: '只能花在「需要對方同意」的時刻。', en: 'Spendable only on consented moments.' },
  wick10:           { zh: '10 芯',            en: '10 wicks' },
  wick30:           { zh: '30 芯',            en: '30 wicks' },
  wick100:          { zh: '100 芯',           en: '100 wicks' },
  vigilCta:         { zh: '訂閱守夜',         en: 'Start Vigil' },

  // Settings
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
