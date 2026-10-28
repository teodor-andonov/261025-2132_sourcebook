import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Chromium engine acceptance smoke is required in PR CI without screenshots',async()=>{
  const [ci,script]=await Promise.all([
    readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8'),
    readFile(new URL('../scripts/browser-smoke.mjs',import.meta.url),'utf8')
  ]);
  assert.match(ci,/name: Chromium M0 browser smoke/);
  assert.match(ci,/node scripts\/browser-smoke\.mjs/);
  assert.match(script,/multipart share target stages real File/);
  assert.match(script,/setOffline\(true\)/);
  assert.match(script,/no-directory-picker/);
  assert.doesNotMatch(script,/\.screenshot\(|recordVideo|tracing\.start/);
  assert.match(script,/NOT physical Windows\/Pixel 8 acceptance/);
});
