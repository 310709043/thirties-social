// Security-policy regression checks. Run: npm run test:security
//
// This is intentionally a fast, dependency-free guard for the invariants that
// protect moderation and paid balances. It does not replace emulator tests, but
// it prevents a future rules edit from silently removing the ship-blocking
// protections below.
import { readFileSync } from 'node:fs';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const dbSource = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
const conversationRules = rules.slice(
  rules.indexOf('match /conversations/{convId}'),
  rules.indexOf('// ── Awake presence'),
);
const loftRules = rules.slice(
  rules.indexOf('match /loftConversations/{convId}'),
  rules.indexOf('// ── Match Queue'),
);
const roomRules = rules.slice(
  rules.indexOf('match /rooms/{roomId}'),
  rules.indexOf('// ── Conversations'),
);

let failures = 0;
function check(name, pattern, source = rules) {
  const ok = pattern.test(source);
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
check('new profiles start with gender unconfigured', /validNewUser\(\)[\s\S]*?request\.resource\.data\.gender == null/);
check('user create invokes the protected initializer', /allow create:[\s\S]*?validNewUser\(\);/);
check(
  'profile writes accept only the two supported gender values',
  /function validProfileGender\(\)[\s\S]*?gender == null[\s\S]*?gender == 'female'[\s\S]*?gender == 'male'[\s\S]*?allow update:[\s\S]*?validProfileGender\(\)/,
);
check('wick balances cannot go below zero', /request\.resource\.data\.wicks >= 0/);
check(
  'banned profiles cannot be deleted client-side',
  /allow delete:[\s\S]*?request\.auth\.uid == userId[\s\S]*?resource\.data\.isBanned != true/,
);
check('client wick ledger entries are spend-only', /request\.resource\.data\.amount < 0/);
check(
  'conversation close purges message payloads',
  /endConversation[\s\S]*?purgeConversationMessages\(conversationId\)/,
  dbSource,
);
check(
  'ended conversations reject new messages',
  /messages\/\{msgId\}[\s\S]*?allow create:[\s\S]*?endedAt == null/,
  conversationRules,
);
check(
  'expired conversations reject new messages',
  /messages\/\{msgId\}[\s\S]*?allow create:[\s\S]*?expiresAt > request\.time/,
  conversationRules,
);
check(
  'Loft close purges ephemeral message payloads',
  /endLoftConversation[\s\S]*?purgeLoftConversationMessages\(loftConversationId\)/,
  dbSource,
);
check(
  'ended Loft conversations reject new messages',
  /messages\/\{msgId\}[\s\S]*?allow create:[\s\S]*?endedAt == null/,
  loftRules,
);
check(
  'expired Loft conversations reject new messages',
  /messages\/\{msgId\}[\s\S]*?allow create:[\s\S]*?expiresAt > request\.time/,
  loftRules,
);
check(
  'expired rooms reject new messages',
  /messages\/\{msgId\}[\s\S]*?allow create:[\s\S]*?closesAt > request\.time/,
  roomRules,
);
check(
  'a failed paid room can be rolled back by its creator',
  /allow delete:[\s\S]*?creatorId == request\.auth\.uid[\s\S]*?isUserCreated == true/,
  roomRules,
);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall security-policy checks passed');
process.exit(failures ? 1 : 0);
