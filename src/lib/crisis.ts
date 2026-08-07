// crisis.ts — 本機、保守的自傷念頭偵測，用來「溫柔浮現」求助資源。
//
// 設計原則（與產品鐵律一致）：
// 1. 純本機：只在裝置上比對字串，永遠不上傳、不記錄任何訊息內容。
// 2. 不阻擋：偵測到也照常送出訊息，只是把 1995 求助卡片推到眼前。
// 3. 高訊號優先：寧可漏、不要吵。清單只收「明確表達傷害自己」的語句，
//    避免對「難過/撐不住」這類日常情緒誤判——那正是這個 app 要承接的內容。
// 4. 灰度語氣：偵測本身不下判斷、不貼標籤，只是把資源放在旁邊。
//
// 這份清單刻意保守，是可調的旋鈕。要放寬或收緊，改這裡即可。

// 中文高訊號語句（不需字界，直接子字串比對）。
const ZH_PHRASES = [
  '不想活',
  '不想活了',
  '想死',
  '很想死',
  '活不下去',
  '不想再活',
  '結束生命',
  '結束自己的生命',
  '自殺',
  '想自殺',
  '傷害自己',
  '自我傷害',
  '割腕',
  '沒有活下去的理由',
  '活著沒有意義',
  '想從這個世界消失',
];

// 英文高訊號語句（小寫比對；用空白補邊避免 "skill" 命中 "kill"）。
const EN_PHRASES = [
  'kill myself',
  'want to die',
  'wanna die',
  'end my life',
  'end it all',
  'suicidal',
  'commit suicide',
  'hurt myself',
  'harm myself',
  'better off dead',
  'no reason to live',
  "don't want to live",
  'dont want to live',
];

/**
 * 保守判斷一段（使用者自己輸入的）文字是否透露自傷念頭。
 * 只做本機字串比對，不呼叫任何網路、不留存。
 */
export function looksLikeCrisis(text: string): boolean {
  if (!text) return false;
  const raw = text.trim();
  if (!raw) return false;

  // 中文：原文直接比對。
  for (const p of ZH_PHRASES) {
    if (raw.includes(p)) return true;
  }

  // 英文：正規化為小寫、前後補空白後比對片語。
  const en = ` ${raw.toLowerCase().replace(/[\n\r]+/g, ' ')} `;
  for (const p of EN_PHRASES) {
    if (en.includes(p)) return true;
  }

  return false;
}

/** 台灣求助資源。集中在此，UI 直接取用。 */
export const SUPPORT = {
  lineNumber: '1995',
  titleZh: '你不需要一個人撐',
  titleEn: 'You don’t have to carry this alone',
  bodyZh: '如果現在很難受，安心專線 1995 有人 24 小時願意聽你說。',
  bodyEn: 'If tonight feels too heavy, Taiwan’s Mental Health Line 1995 is open 24h.',
  dismissZh: '我知道了',
  dismissEn: 'Okay',
};
