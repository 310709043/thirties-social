// identity.ts — deterministic seed-based identity generation helpers

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

export function rand(seed: string, n: number = 1): number[] {
  const out: number[] = [];
  let h = hash(seed);
  for (let i = 0; i < n; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(h / 4294967295);
  }
  return out;
}

export const COLOR_NAMES_ZH = ['霧灰','青墨','砂金','苔綠','焦糖','沉藍','木棕','蘆白','炭','茶','杏','玫','靛','梅','雲','槐','琥珀','琉璃','薄荷','琥珀','薰衣草','珊瑚','翡翠','象牙','珊瑚','橄欖','栗子','橄欖','檸檬','巧克力','米色','玫瑰'];
export const COLOR_NAMES_EN = ['slate','umber','fawn','moss','caramel','indigo','walnut','reed','charcoal','tea','apricot','rose','mulberry','cloud','sage','ash','amber','lapis','mint','amber','lavender','coral','jade','ivory','coral','olive','chestnut','olive','lemon','chocolate','beige','rose'];
export const ADJ_ZH = ['漂木','靜物','夜雨','舊書','空房','清晨','末班','長椅','回音','走廊','抽屜','燈下','落葉','微光','深海','星空','潮汐','燭火','晨霧','暮色','微風','細雨','殘月','流雲','浮萍','苔蘚','藤蔓','櫻花','楓葉','雪花','露珠','星辰'];
export const ADJ_EN = ['driftwood','still-life','night-rain','old-book','empty-room','early-hour','last-train','long-bench','echo','corridor','drawer','lamp-light','fallen-leaf','glimmer','deep-sea','starry','tide','candlelight','dawn-mist','dusk','breeze','drizzle','waning-moon','floating-cloud','duckweed','moss','vine','cherry-blossom','maple','snowflake','dewdrop','starlight'];
export const SWATCHES = [
  '#7c7e84','#5d4a3a','#c8a87a','#7d8d6e','#a86c44',
  '#3f4a6a','#6b4a3a','#dcd2bd','#3a3a3a','#9c7a64',
  '#dab28a','#a87082','#5a4070','#7a4060','#c4c6cc','#94a482',
  '#b8860b','#4a6fa5','#98d4bb','#b8860b','#9370db','#ff7f7f','#50c878','#fffff0','#ff7f7f','#808000','#a0522d','#808000','#fff44f','#8b4513','#f5f5dc','#ff6b6b',
];

export const CHAR_POOL = '靜默霧雨夜冷暮歸潮影空惘茫渺渙寂晦悄忱忐悠寥曠淡涼涔淳潤湫渝沉惻悒愀慍憮憫黯沓徬徨惘徘徊靄';

export type IdentityKind = 'sigil' | 'silhouette' | 'color+adj' | 'character' | 'text';

export function getColorAdj(seed: string, lang: 'zh' | 'en' = 'zh'): { color: string; colorName: string; adj: string; label: string } {
  const r = rand(seed, 3);
  const ci = Math.floor(r[0] * COLOR_NAMES_ZH.length);
  const ai = Math.floor(r[1] * ADJ_ZH.length);
  const color = SWATCHES[ci];
  const colorName = lang === 'en' ? COLOR_NAMES_EN[ci] : COLOR_NAMES_ZH[ci];
  const adj = lang === 'en' ? ADJ_EN[ai] : ADJ_ZH[ai];
  const label = lang === 'en' ? `${colorName} ${adj}` : `${colorName}的${adj}`;
  return { color, colorName, adj, label };
}

export function getCharacter(seed: string): string {
  const r = rand(seed, 1);
  return CHAR_POOL[Math.floor(r[0] * CHAR_POOL.length)];
}

// Generate a daily seed from device ID + date
export function getDailySeed(deviceId: string): string {
  const date = new Date();
  // Reset at 03:00
  if (date.getHours() < 3) {
    date.setDate(date.getDate() - 1);
  }
  const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  return `${deviceId}-${dateStr}`;
}
