import { readFileSync } from 'node:fs';
import ts from 'typescript';

const sourceUrl = new URL('../src/lib/timeBuckets.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
const { localProductDayKey, localProductWeekKey } = await import(moduleUrl);

let failures = 0;
function equal(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}`);
  if (!ok) {
    console.log(`  expected ${expected}, got ${actual}`);
    failures++;
  }
}

// Local date constructors keep the assertions correct in every CI timezone.
equal('02:59 belongs to the previous product day',
  localProductDayKey(new Date(2026, 6, 31, 2, 59)), '2026-07-30');
equal('03:00 starts a new product day',
  localProductDayKey(new Date(2026, 6, 31, 3, 0)), '2026-07-31');
equal('Monday 02:59 remains in the prior product week',
  localProductWeekKey(new Date(2026, 7, 3, 2, 59)), '2026-07-27');
equal('Monday 03:00 starts the new product week',
  localProductWeekKey(new Date(2026, 7, 3, 3, 0)), '2026-08-03');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall time-bucket checks passed');
process.exit(failures ? 1 : 0);
