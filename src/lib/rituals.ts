// rituals.ts — The Loft's nightly ritual ("今夜之題").
//
// Each night the whole Loft sees the same deep, gentle prompt, chosen
// deterministically from the local date so everyone is answering the same
// question at the same time — a quiet shared ritual. Emotional and reflective,
// never sexual or affair-oriented.

export interface RitualPrompt {
  zh: string;
  en: string;
}

export const RITUAL_PROMPTS: RitualPrompt[] = [
  { zh: '今晚，你最想被誰理解？', en: 'Tonight, who do you most wish understood you?' },
  { zh: '有什麼是你白天不敢說的？', en: "What's something you don't dare say in daylight?" },
  { zh: '上一次覺得被好好聽見，是什麼時候？', en: 'When did you last feel truly heard?' },
  { zh: '此刻，你的心需要什麼？', en: 'What does your heart need right now?' },
  { zh: '你最近在硬撐的是什麼？', en: 'What have you been holding together lately?' },
  { zh: '如果今晚能對一個人說真話，你會說什麼？', en: 'If you could tell one person the truth tonight, what would it be?' },
  { zh: '你有多久沒為自己留一點時間了？', en: 'How long since you kept a little time for yourself?' },
  { zh: '今晚讓你睡不著的，是什麼？', en: "What's keeping you awake tonight?" },
  { zh: '你希望有人問你哪一個問題？', en: 'What question do you wish someone would ask you?' },
  { zh: '對現在的自己，你想說一句什麼？', en: 'What would you say to the person you are right now?' },
];

/** Days since epoch in local time — rotates the prompt once per local night. */
function localDayNumber(now: Date = new Date()): number {
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(local.getTime() / 86400000);
}

/** Tonight's ritual prompt — deterministic, so the whole Loft sees the same one. */
export function getTonightRitual(now: Date = new Date()): RitualPrompt {
  return RITUAL_PROMPTS[localDayNumber(now) % RITUAL_PROMPTS.length];
}
