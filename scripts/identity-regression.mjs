// Identity-system regression tests. Run: node scripts/identity-regression.mjs
//
// identity.ts imports expo-crypto (native), so this script re-reads the pools
// and pure helpers from the source text instead of importing the module. The
// seed digest is replicated with node:crypto — same SHA-256, same input shape.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const src = readFileSync(new URL('../src/lib/identity.ts', import.meta.url), 'utf8');
const grab = (name) => {
  const m = src.match(new RegExp(name + String.raw` = \[([\s\S]*?)\];`));
  if (!m) throw new Error('array not found: ' + name);
  return eval('[' + m[1] + ']');
};

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

// ── pure helpers copied from identity.ts (keep in sync) ─────────────
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
function rand(seed, n = 1) { const out = []; let h = hash(seed); for (let i = 0; i < n; i++) { h = (h * 1664525 + 1013904223) >>> 0; out.push(h / 4294967295); } return out; }
const dailySeed = (deviceId, dateStr) =>
  createHash('sha256').update(`cw-identity-v2|${deviceId}|${dateStr}`).digest('hex').slice(0, 20);

// ── 1. pool integrity ────────────────────────────────────────────────
const CZ = grab('COLOR_NAMES_ZH'), CE = grab('COLOR_NAMES_EN'), AZ = grab('ADJ_ZH'), AE = grab('ADJ_EN'), SW = grab('SWATCHES');
check('colour pools index-aligned', new Set([CZ.length, CE.length, AZ.length, AE.length, SW.length]).size === 1,
  `lengths ${[CZ, CE, AZ, AE, SW].map(a => a.length).join('/')}`);
for (const [n, a] of [['COLOR_ZH', CZ], ['COLOR_EN', CE], ['ADJ_ZH', AZ], ['ADJ_EN', AE], ['SWATCHES', SW]]) {
  const dups = a.filter((x, i) => a.indexOf(x) !== i);
  check(`${n} has no duplicates`, dups.length === 0, dups.join(','));
}

// ── 2. seed traceability ─────────────────────────────────────────────
const LEGACY = /^[a-z0-9]{8,}-\d{4}-\d{1,2}-\d{1,2}$/;
const dev = 'c0ffee11-2222-3333-4444-555566667777';
const d1 = dailySeed(dev, '2026-6-11'), d2 = dailySeed(dev, '2026-6-12');
check('seed carries no deviceId substring', !d1.includes(dev.slice(0, 8)) && !LEGACY.test(d1));
check('same device, different days → unrelated seeds', d1 !== d2 &&
  [...d1].filter((c, i) => c === d2[i]).length < 8, `${d1} vs ${d2}`);
check('seed deterministic within a day', d1 === dailySeed(dev, '2026-6-11'));

// ── 3. collision rates at scale ──────────────────────────────────────
const colorAdj = (seed) => { const r = rand(seed, 3); return CZ[Math.floor(r[0] * CZ.length)] + '的' + AZ[Math.floor(r[1] * AZ.length)]; };
const LA = grab('LOFT_ADJ_ZH'), LN = grab('LOFT_NOUN_ZH'), LT = grab('LOFT_TIME_ZH'), LR = grab('LOFT_ROLE_ZH'), LS = grab('LOFT_SOLO_ZH'), LP = grab('LOFT_PREFIX_ZH');
function loftName(seed) {
  const r = rand(seed, 4);
  const adj = LA[Math.floor(r[0] * LA.length)], noun = LN[Math.floor(r[1] * LN.length)];
  const pick = Math.floor(r[3] * 8);
  if (pick <= 1) return adj + '的' + noun;
  if (pick === 2) return LT[Math.floor(r[0] * LT.length)] + '的' + LR[Math.floor(r[1] * LR.length)];
  if (pick === 3) return LS[Math.floor(r[0] * LS.length)];
  return LP[Math.floor(r[2] * LP.length)] + '·' + adj + '的' + noun;
}
console.log('\nscale simulation (unique names / users; seeds are real daily digests):');
for (const n of [100, 500, 1000, 5000, 10000]) {
  const loft = new Set(), ca = new Set();
  for (let i = 0; i < n; i++) {
    const s = dailySeed(`device-${i}`, '2026-6-11');
    loft.add(loftName(s)); ca.add(colorAdj(s));
  }
  console.log(`  ${String(n).padStart(5)} users → loft ${loft.size} (${(100 * loft.size / n).toFixed(0)}%) · colorAdj ${ca.size} (${(100 * ca.size / n).toFixed(0)}%)`);
}
// Hard floors: what matters is names-in-one-view, not global uniqueness. A Loft
// night realistically shows ≤500 people; require ≥85% unique there and ≥85%
// for colour+adj at 100 (a very large list view).
{
  const loft = new Set(), ca = new Set();
  for (let i = 0; i < 500; i++) loft.add(loftName(dailySeed(`d${i}`, '2026-6-11')));
  for (let i = 0; i < 100; i++) ca.add(colorAdj(dailySeed(`e${i}`, '2026-6-11')));
  check('loft: ≥85% unique among 500 concurrent', loft.size >= 425, `${loft.size}/500`);
  check('colorAdj: ≥85% unique among 100 in a list', ca.size >= 85, `${ca.size}/100`);
}

// ── 4. no legacy seed format anywhere in source ──────────────────────
check('source no longer builds `${deviceId}-${date}` seeds', !src.includes('`${deviceId}-${dateStr}`'));

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
