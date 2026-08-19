// copy.ts — bilingual strings (Chinese primary, English secondary)

export type Lang = 'zh' | 'en';

const COPY: Record<string, { zh: string; en: string }> = {
  appName:         { zh: '燭影私語',         en: 'Candle Whisper' },
  appTag:          { zh: '安靜地說',         en: 'Speak quietly' },

  // Onboarding
  ob1Title:        { zh: '這裡沒有人要你完美', en: 'No one needs you to be perfect here' },
  ob1Body:         { zh: '不用名字、不用照片。你只是一個今晚想被聽見的人。', en: 'No name, no face — just someone who wants to be heard tonight.' },
  ob2Title:        { zh: '說出口，就讓它慢慢熄滅', en: 'Say it — then let it fade' },
  ob2Body:         { zh: '和一個人靜靜說說話。結束了，對話就刪掉，誰都翻不回來。', en: 'Talk quietly with one person. When it ends, the conversation is gone — no one can scroll back.' },
  ob3Title:        { zh: '在這裡，大家都一樣', en: 'Here, everyone is the same' },
  ob3Body:         { zh: '待在火盆旁、找個人說話，或只是看著。沒事也能來。', en: 'Sit by a brazier, find someone to talk to, or just watch. No reason needed.' },
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
  moodGuide:       { zh: '寫下此刻、找個火盆待著，或找人靜靜說說話。', en: 'Write how you feel, sit by a brazier, or find someone to talk to.' },

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

  // Continuation drawer — W2-7 (fixes P1)
  continueTitle:   { zh: '這段還沒完',       en: "This isn't over yet" },
  continueExtend:  { zh: '今晚再多聊 30 分鐘', en: '30 more minutes tonight' },
  continueExtendSub:{ zh: '雙方都同意才續。你先提出。', en: 'Only if you both agree — you offer first.' },
  continueReunion: { zh: '約明晚同一時間',   en: 'Same time tomorrow night' },
  continueReunionSub:{ zh: '只留下這個約，不留對話紀錄。', en: 'Keeps the plan, not the conversation.' },
  continueKeep:    { zh: '留下彼此',         en: 'Keep each other' },
  continueKeepSub: { zh: '以後還找得到對方。最多 3 個人。', en: 'You can find each other again. Up to 3 people.' },
  continueKeepTag: { zh: '守夜會員',         en: 'Vigil' },
  continueEnd:     { zh: '就讓它結束',       en: 'Let it end' },
  continueWaiting: { zh: '等對方一起',       en: 'waiting for them' },
  continueDone:    { zh: '已約定',           en: 'set' },

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

  // Loft 夜閣 — redefined (W3-9): the "small hours" room for people who can't
  // sleep. NO photos, no lists, no invites. The old positioning (被想念/帶紗照片/
  // 交心/金錢警告) read like a hookup space and broke the companion mandate (P6).
  loftName:         { zh: '夜閣',             en: 'The Loft' },
  loftTagline:      { zh: '給每個睡不著的夜。',     en: 'For every sleepless night.' },
  loftSub:          { zh: '幾個同樣醒著的人，在同一個房間裡各自說話，誰想回應就回應。', en: 'A few people who are also awake, each speaking in one room — answer if you feel like it.' },
  loftEnter:        { zh: '進去坐著',         en: 'Go in and sit' },
  loftLocked:       { zh: '尚未開啟',         en: 'Not yet opened' },
  loftConsent:      { zh: '和火盆的差別',     en: 'How it differs from a firepit' },
  loftLine1:        { zh: '不分話題，只有一個房間。說出口的話 10 分鐘後就消失。', en: 'No topics, just one room. What you say fades ten minutes later.' },
  loftLine2:        { zh: '不能私訊、不能邀請、不能加人。女生免費進，男生要連續來滿 3 晚。', en: 'No DMs, no invites, no adding anyone. Free for women; men come three nights running first.' },
  loftAgree:        { zh: '進去坐著',         en: 'Go in and sit' },
  loftCost:         { zh: '今晚 5 燭芯',      en: 'Tonight · 5 wicks' },
  loftBack:         { zh: '改天',             en: 'Another night' },
  loftInside:       { zh: '在夜閣裡',         en: 'Inside the Loft' },
  loftPeople:       { zh: '今晚醒著的人',     en: 'awake tonight' },
  loftClose:        { zh: '每晚都開著',           en: 'Open every night' },
  loftWhisper:      { zh: '輕輕說一句',       en: 'Say something quietly' },
  loftPulse1:       { zh: '還在',             en: 'still here' },
  loftPulse2:       { zh: '繼續說',           en: 'go on' },
  loftPulse3:       { zh: '睡不著',           en: "can't sleep" },
  loftPulse4:       { zh: '謝謝你在',         en: 'glad you are around' },
  loftPulseCost:    { zh: '1 芯',             en: '1 wick' },
  loftGift:         { zh: '送出一根燭·謝謝對方', en: 'Send a candle · thank them' },
  loftGiftCost:     { zh: '5 芯',             en: '5 wicks' },

  // Honest waiting (0-online) — W1-2. No fake numbers, no fake liveliness.
  honestTitle0:    { zh: '現在還沒有人在',     en: 'No one is here yet' },
  honestSub:       { zh: '不騙你，這個時段最安靜。這裡的人大多在午夜之後才醒著。', en: "Honestly, this is the quietest hour. Most people here don't wake until after midnight." },
  honestChartTitle:{ zh: '多數人什麼時候醒著', en: 'When people are usually awake' },
  honestPeak:      { zh: '最熱的是 00:00–01:00。', en: 'Busiest around 00:00–01:00.' },
  honestGoFirepit: { zh: '先去火盆坐著',       en: 'Sit by a brazier for now' },
  honestGoFirepitSub:{ zh: '就算沒人在線，這幾天留下的話還在。', en: 'Even with no one online, the last few days of words are still here.' },
  honestWrite:     { zh: '先把話寫下來',       en: 'Just write it down first' },
  honestWriteSub:  { zh: '明晚有人讀到，會直接回你', en: 'Someone reads it tomorrow night and replies' },
  honestFooter:    { zh: '我們不會放假帳號讓這裡看起來熱鬧。沒有人，就是沒有人。', en: 'We never plant fake accounts to look busy. Empty is empty.' },
  honestCancel:    { zh: '先不等了',           en: 'Stop waiting' },

  // Guest "listen first" home — W1-3
  guestListenTitle:{ zh: '先聽聽這裡的人在說什麼', en: 'Just listen to what people are saying' },
  guestListenSub:  { zh: '不用填資料，也不用取名字。想開口的時候再說。', en: 'No profile, no name. Speak only when you want to.' },
  guestFirepitNote:{ zh: '火盆裡的話留三天才消失，所以就算現在沒人在線，你也不會進到一個空房間。一對一對話還是結束就刪。', en: "Words in a firepit linger three days, so even with no one online you won't walk into an empty room. One-to-one chats are still deleted when they end." },
  guestTapToReply: { zh: '想回應哪一句，點它就好。到那時我們才會問你是誰。', en: 'Tap any line you want to answer. Only then do we ask who you are.' },
  guestRegQuoteLabel:{ zh: '你想回應的是',       en: 'You want to answer' },
  guestRegTitle:   { zh: '要開口，需要一個只有今晚的名字', en: 'To speak, you need a name just for tonight' },
  guestRegWhy:     { zh: '不是為了認識你。是為了讓對方知道，回話的是同一個人。', en: "Not to know who you are — just so they know it's the same person replying." },
  guestRegFooter:  { zh: '性別和年齡等你進去之後再問，兩題就好。', en: 'Gender and age come after you enter — just two questions.' },
  guestRegCta:     { zh: '建立帳號',           en: 'Create an account' },
  guestRegCancel:  { zh: '再看看',             en: 'Not yet' },
  honestSearching: { zh: '還在等一個人來',     en: 'Still waiting for someone' },

  // Wick rules — the SINGLE source of truth (W1-4 / fixes P5). Every other
  // screen must agree with this page; no screen states a different rule.
  wickRulesTitle:  { zh: '燭芯只用在讓一段對話走得更久', en: 'Wicks only make one conversation last longer' },
  wickRulesLead:   { zh: '這一頁是唯一的規則，其他畫面不會再有別的說法。', en: "This page is the only rule — no other screen says anything different." },
  wickRuleInvite:  { zh: '邀一個人單獨聊',     en: 'Invite one person to talk alone' },
  wickRuleInviteSubF:{ zh: '女生收到邀請永遠免費。', en: 'Women are never charged to be invited.' },
  wickRuleInviteSubM:{ zh: '每天有免費額度，用完後才用到燭芯。對方沒接受不扣。', en: 'A daily free allowance first; wicks only after that. Not charged if they decline.' },
  wickRuleExtend:  { zh: '續 30 分鐘',         en: '+30 more minutes' },
  wickRuleExtendSub:{ zh: '雙方各 2 芯，任一方不同意就不扣。', en: '2 wicks each; if either declines, neither is charged.' },
  wickRuleReunion: { zh: '約明晚同一時間',     en: 'Meet again tomorrow night' },
  wickRuleReunionSub:{ zh: '3 芯，只保留一次見面的約定，不保留對話。', en: '3 wicks — keeps only the promise to meet, never the conversation.' },
  wickFreeTitle:   { zh: '永遠免費',           en: 'Always free' },
  wickFreeList:    { zh: '進火盆、在火盆說話、聽別人說話；收到邀請、接受邀請、整段 30 分鐘對話；封鎖、檢舉、隨時離開。', en: 'Entering firepits, speaking and listening in them; receiving and accepting an invite, the whole 30-minute talk; blocking, reporting, leaving anytime.' },
  wickCantTitle:   { zh: '燭芯買不到的事',     en: "What wicks can't buy" },
  wickCantList:    { zh: '不能提高曝光、不能排到別人前面、不能讓對方非得回你，也不能買到對方的真名。', en: "It can't raise your visibility, jump you ahead of others, force anyone to reply, or buy someone's real name." },

  // Morning review letter — W2-8. Honest: only what we truly know locally
  // (you came, how many lines you said, your streak). No fabricated "N people
  // remembered you" — that would need data we deliberately don't keep.
  letterEyebrow:   { zh: '燭影私語 · 昨晚',   en: 'Candle Whisper · last night' },
  letterOpen:      { zh: '昨晚，你來過',       en: 'You were here last night' },
  letterSaidUnit:  { zh: '句話',             en: 'lines' },
  letterSaidLabel: { zh: '你昨晚說出口的',     en: 'you said out loud last night' },
  letterStreakLabel:{ zh: '個晚上，你連續來了', en: 'nights, you kept coming back' },
  letterPrivacy:   { zh: '對話內容我們沒有留。這封信只記得你來過、說了幾句。', en: "We kept none of what was said. This letter only remembers that you came, and how many lines." },
  letterCta:       { zh: '今晚也來坐一下',     en: 'Come sit again tonight' },
  letterFooter:    { zh: '每天早上八點寄一次 · 可以在設定關掉', en: 'Sent at 8 each morning · you can turn it off in Settings' },
  letterQuiet:     { zh: '昨晚你只是靜靜待著。有時候，那樣就夠了。', en: 'Last night you just stayed quietly. Sometimes that is enough.' },

  // Wicks / subscription
  wickName:         { zh: '燭芯',             en: 'Wicks' },
  wickBalance:      { zh: '剩餘',             en: 'balance' },
  upgradeTitle:     { zh: '兩種陪你的方式',   en: 'Two ways to stay' },
  upgradeBlurb:     { zh: '沒有廣告，也不賣你的資料。付費只是多一點選擇。', en: 'No ads, and we never sell your data. Paying just gives you a bit more choice.' },
  tierFree:         { zh: '一根蠟燭',         en: 'One Candle' },
  tierFreeSub:      { zh: '每日 10 次一對一 · 每週夜閣 1 次 · 每日 2 芯', en: '10 one-to-one conversations/day · Loft weekly · 2 wicks/day' },
  tierVigil:        { zh: '守夜會員',         en: 'Vigil' },
  tierVigilPrice:   { zh: 'NT$ 390 / 月',     en: 'NT$ 390 / mo' },
  tierVigilBlurb:   { zh: '不限次一對一 · 夜閣無限進出 · 每日 5 芯 · 免費開火盆 · 可提出「留下彼此」', en: 'Unlimited one-to-one conversations · Loft every night · 5 wicks/day · free rooms · may propose "keeping each other"' },
  wicksTitle:       { zh: '一次性 · 燭芯',    en: 'One-off · Wicks' },
  wicksBlurb:       { zh: '訊息本身不用燭芯。燭芯只用在讓一段對話走得更久——規則就在下面。', en: 'Messages themselves are free. Wicks only make a conversation last longer — the rules are right below.' },
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
  tonightModeHint:    { zh: '對方會看到，好知道今晚怎麼陪你', en: 'They\'ll see this, so they know how to be there for you tonight' },
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
