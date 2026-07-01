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

// ── Loft names ───────────────────────────────────────────
// The Loft (夜閣) gets its own richer, more poetic naming pool than the rest of
// the app — late-night, vigil-flavoured. Three sentence patterns are mixed for
// far more variety than colour+noun. Deterministic per seed (same person → same
// Loft name within a session).
const LOFT_ADJ_ZH = ['失眠','未眠','獨醒','夜行','沉默','將明','燈下','孤燈','霧裡','潮間','微醺','夜半','星沉','月下','擱淺','漂泊','逆光','晚風','薄霧','深海','微光','浮沉','靜默','恍惚','倦怠','朦朧','徘徊','守候','凝望','失溫','迷途','回望'];
const LOFT_ADJ_EN = ['sleepless','unsleeping','awake','night-walking','silent','near-dawn','lamplit','lone-lamp','fog-bound','tidal','tipsy','small-hours','star-fallen','moonlit','stranded','drifting','backlit','evening-wind','thin-mist','deep-sea','faint-glow','adrift','hushed','dazed','weary','hazy','wandering','waiting','gazing','cold-drift','lost','looking-back'];
const LOFT_NOUN_ZH = ['旅人','燈塔','收音機','月台','海','貓','信號','渡口','長夜','燈火','街角','鯨','碼頭','航班','島','煙火','回聲','候鳥','星圖','渡船','潮汐','霧笛','舊夢','雨聲','星群','末班車','信箋','琴聲','燭光','孤島','鐘聲','流星'];
const LOFT_NOUN_EN = ['traveler','lighthouse','radio','platform','sea','cat','signal','ferry-dock','long-night','firelight','street-corner','whale','pier','flight','island','fireworks','echo','migrant-bird','star-map','night-boat','tide','fog-horn','old-dream','rain-sound','star-cluster','last-train','letter','piano','candlelight','lone-isle','bell','shooting-star'];
const LOFT_TIME_ZH = ['凌晨三點','末班車','天亮前','午夜','破曉前','深夜','夜半','黎明前','日落後','星期天的夜','子夜','拂曉','雨夜','無眠的夜','月圓夜','長夜將盡'];
const LOFT_TIME_EN = ['3 a.m.','last-train','before-dawn','midnight','pre-daybreak','late-night','small-hours','before-sunrise','after-sunset','sunday-night','witching-hour','daybreak','rainy-night','sleepless-night','full-moon-night','nights-end'];
const LOFT_ROLE_ZH = ['守夜人','旅人','聽眾','乘客','訪客','夜貓','說書人','擺渡人','點燈人','陌生人','過客','守燈人','拾荒者','吟遊者','漂流者','尋光者','夜歸人','收信人','看海人','趕路人'];
const LOFT_ROLE_EN = ['night-watch','traveler','listener','passenger','visitor','night-owl','storyteller','ferryman','lamplighter','stranger','passerby','lamp-keeper','gleaner','wanderer','drifter','light-seeker','night-returner','letter-receiver','sea-watcher','road-hastener'];
const LOFT_SOLO_ZH = ['還沒睡的城市','睡不著的海','等天亮的人','夜裡的回聲','數羊的人','看月亮的貓','未寄出的信','熄不掉的燈','聽雨的人','迷路的星','深夜便利商店','最後一班船','沒有終點的散步','凌晨的潮聲','一個人的電影院','關不上的窗','忘了關的收音機','空蕩的月台','沒回的訊息','守著電話的人','沒說完的話','忘了名字的歌','飄很遠的風箏','等不到的人','沒寫完的日記','快沒電的手機','沒有回音的山谷','亮到天明的燈'];
const LOFT_SOLO_EN = ['the sleepless city','the restless sea','one who waits for dawn','an echo in the night','counting sheep','a cat watching the moon','an unsent letter','a light that won’t go out','one who hears the rain','a lost star','a midnight store','the last boat','a walk with no end','the dawn tide','a cinema for one','a window that won’t close','a radio left on','an empty platform','an unanswered message','one waiting by the phone','words left unsaid','a song whose name is lost','a kite drifting far','someone who never came','an unfinished diary','a phone almost dead','a valley with no echo','a lamp lit till dawn'];
// A short mood prefix multiplies the name space so names stay distinct even with
// hundreds of people online at once (see getLoftName pattern 3).
const LOFT_PREFIX_ZH = ['霧','夜','月','潮','星','風','雨','雪','火','海','煙','晨','暮','燈','影','光'];
const LOFT_PREFIX_EN = ['mist','night','moon','tide','star','wind','rain','snow','fire','sea','smoke','dawn','dusk','lamp','shadow','light'];

export function getLoftName(seed: string, lang: 'zh' | 'en' = 'zh'): string {
  const r = rand(seed, 4);
  const zh = lang !== 'en';
  const adj = (zh ? LOFT_ADJ_ZH : LOFT_ADJ_EN)[Math.floor(r[0] * LOFT_ADJ_ZH.length)];
  const noun = (zh ? LOFT_NOUN_ZH : LOFT_NOUN_EN)[Math.floor(r[1] * LOFT_NOUN_ZH.length)];
  const pick = Math.floor(r[3] * 5);
  if (pick === 0) return zh ? `${adj}的${noun}` : `${adj} ${noun}`;
  if (pick === 1) {
    const tm = (zh ? LOFT_TIME_ZH : LOFT_TIME_EN)[Math.floor(r[0] * LOFT_TIME_ZH.length)];
    const ro = (zh ? LOFT_ROLE_ZH : LOFT_ROLE_EN)[Math.floor(r[1] * LOFT_ROLE_ZH.length)];
    return zh ? `${tm}的${ro}` : `${tm} ${ro}`;
  }
  if (pick === 2) return (zh ? LOFT_SOLO_ZH : LOFT_SOLO_EN)[Math.floor(r[0] * LOFT_SOLO_ZH.length)];
  // pick 3 or 4 (~40% of names): a short mood prefix + adj-noun. This is the big
  // combinatorial space (prefix × adj × noun ≈ 16k) that keeps names distinct at
  // scale — collisions stay rare even with several hundred people online.
  const pre = (zh ? LOFT_PREFIX_ZH : LOFT_PREFIX_EN)[Math.floor(r[2] * LOFT_PREFIX_ZH.length)];
  return zh ? `${pre}·${adj}的${noun}` : `${pre} · ${adj} ${noun}`;
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
