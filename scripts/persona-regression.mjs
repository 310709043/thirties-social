import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/personaPolicy.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
const { connectionPolicy } = await import(moduleUrl);

let failures = 0;
function check(name, condition) {
  console.log(`${condition ? '✓' : '✗ FAIL'} ${name}`);
  if (!condition) failures++;
}

const guest = connectionPolicy({ guest: true, vigil: false, gender: 'female', connectionsToday: 0, wicks: 99 });
check('guest stays browse-only even with cached female profile and wicks', !guest.canConnect && !guest.unlimited && !guest.costsWick);

const woman = connectionPolicy({ guest: false, vigil: false, gender: 'female', connectionsToday: 999, wicks: 0 });
check('registered women have unlimited zero-charge connections', woman.canConnect && woman.unlimited && !woman.costsWick);

const manFree = connectionPolicy({ guest: false, vigil: false, gender: 'male', connectionsToday: 4, wicks: 0 });
check('registered men consume the daily allowance first', manFree.canConnect && !manFree.unlimited && !manFree.costsWick && manFree.freeRemaining === 6);

const manNoFunds = connectionPolicy({ guest: false, vigil: false, gender: 'male', connectionsToday: 10, wicks: 0 });
check('registered men stop when allowance and wicks are exhausted', !manNoFunds.canConnect && manNoFunds.costsWick);

const manPaid = connectionPolicy({ guest: false, vigil: false, gender: 'male', connectionsToday: 10, wicks: 1 });
check('registered men may continue for the disclosed wick cost', manPaid.canConnect && manPaid.costsWick);

const vigil = connectionPolicy({ guest: false, vigil: true, gender: 'male', connectionsToday: 999, wicks: 0 });
check('Vigil overrides the registered daily quota', vigil.canConnect && vigil.unlimited && !vigil.costsWick);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall persona-policy checks passed');
process.exit(failures ? 1 : 0);
