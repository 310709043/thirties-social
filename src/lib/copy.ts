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

  // Close
  closeHeader:     { zh: '今天的窗口關了',   en: "Today's window is closed" },
  closeBody:       { zh: '你和八個人說了話。沒有留下任何記錄。', en: 'You spoke with eight people. Nothing was kept.' },
  closeReturn:     { zh: '明天 03:00 之後再回來', en: 'Come back after 03:00 tomorrow' },
  closeRest:       { zh: '先去休息',         en: 'Rest for now' },
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
