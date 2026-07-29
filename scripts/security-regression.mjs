// Security-policy regression checks. Run: npm run test:security
//
// This is intentionally a fast, dependency-free guard for the invariants that
// protect moderation and paid balances. It does not replace emulator tests, but
// it prevents a future rules edit from silently removing the ship-blocking
// protections below.
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

let failures = 0;
function check(name, pattern) {
  const ok = pattern.test(rules);
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}`);
  if (!ok) failures++;
}

check(
  'posting requires an existing user profile',
  /function notBanned\(\)[\s\S]*?exists\([^\n]*users\/\$\(request\.auth\.uid\)[^\n]*\)[\s\S]*?isBanned != true/,
);
check('new profiles start with exactly 3 wicks', /request\.resource\.data\.wicks == 3/);
check('new profiles cannot self-grant Vigil', /request\.resource\.data\.vigil == false/);
check('new profiles cannot start unmoderated', /request\.resource\.data\.isBanned == false/);
check('user create invokes the protected initializer', /allow create:[\s\S]*?validNewUser\(\);/);
check('wick balances cannot go below zero', /request\.resource\.data\.wicks >= 0/);
check(
  'banned profiles cannot be deleted client-side',
  /allow delete:[\s\S]*?request\.auth\.uid == userId[\s\S]*?resource\.data\.isBanned != true/,
);
check('client wick ledger entries are spend-only', /request\.resource\.data\.amount < 0/);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall security-policy checks passed');
process.exit(failures ? 1 : 0);
