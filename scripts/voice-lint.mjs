#!/usr/bin/env node
// voice-lint — guards the product's written voice against two regressions that
// keep creeping back in (usually from an AI pass):
//   1. Dating / match-making framing — the app is a companion space, NOT a
//      dating app. The 1-on-1 mechanic may be called 配對 internally, but the
//      *narrative* must never romanticise it ("遇見對的人", "脫單", "meet someone").
//   2. AI-assistant voice — first-person "我幫你 / 讓我為你…" reads like a
//      chatbot. The product is not an assistant and has no AI features.
//
// Run: npm run lint:voice   (exit 1 on any hard violation)
// Scans user-facing copy only: src/lib/copy.ts + src/screens/*.tsx

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const FILES = [
  'src/lib/copy.ts',
  ...readdirSync(join(ROOT, 'src/screens'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `src/screens/${f}`),
];

// Hard violations — fail the build. Keep these narrow so they don't fire on the
// legitimate mechanic word 配對 / Match (screen names, allowance counters).
const DENY = [
  { re: /遇見(一個人|對的人|你|誰)/, why: '約會化：「遇見…」邂逅語氣 → 用「找一個人說說話」' },
  { re: /對的人|命中注定|靈魂伴侶|另一半(?!的距離)/, why: '約會化：把對方框成「命定對象」' },
  { re: /脫單|找對象|交友對象|戀愛對象|約會/, why: '約會化：交友/約會定位' },
  { re: /soulmate|the right (one|person)|match[- ]?making|find\s+love|meet\s+someone/i, why: '約會化（英）' },
  { re: /同頻的人|靈魂契合/, why: 'AI 買詞/約會化：「同頻」' },
  { re: /我幫你|我們幫你|我們替你|替你(找|配|挑)|讓我(幫|為)你|為你(找|配|挑|推薦)/, why: 'AI 助理口吻：第一人稱「幫你/替你」' },
  { re: /智能|人工智慧|\bAI\b|演算法(推薦|為你)|自動(配對|推薦)給你/, why: 'AI 感：不做任何 AI 功能，文案也別提' },
];

let violations = 0;
for (const rel of FILES) {
  let text;
  try { text = readFileSync(join(ROOT, rel), 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => {
    // Skip pure code lines that reference the Match *screen* / route by name.
    for (const { re, why } of DENY) {
      if (re.test(line)) {
        violations++;
        console.log(`❌ ${rel}:${i + 1}  [${why}]`);
        console.log(`   ${line.trim().slice(0, 140)}`);
      }
    }
  });
}

if (violations > 0) {
  console.log(`\nvoice-lint: ${violations} 個違規 — 違反「陪伴非約會 / 不做 AI」鐵律（見 AGENTS.md）`);
  process.exit(1);
}
console.log('voice-lint: ✅ 文案語氣乾淨（無約會化、無 AI 助理口吻）');
