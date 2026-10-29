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
  assert.match(script,/real Chromium OPFS \.url\/\.md file writes/);
  assert.match(script,/fixture survives reload and IndexedDB handle restoration/);
  assert.match(script,/portable \.sb journal, Tags, View and physical \.url reopen/);
  assert.match(script,/sourcebook-opfs-m0-smoke-handle/);
  assert.match(script,/corrupted\.status,'invalid'/);
  assert.match(script,/origin-private; external Folder/);
  assert.match(script,/two-tab Chromium Web Locks serialize physical capture/);
  assert.match(script,/navigator\.locks\.query/);
  assert.match(script,/two-tab Chromium Catalog journal lock rejects stale competing edits/);
  assert.match(script,/sourcebook-catalog-write-v1/);
  assert.match(script,/physical \.url preview and bounded Markdown preview use real Chromium files/);
  assert.match(script,/Folder selection supports keyboard ranges, touch mode and filtered safety/);
  assert.match(script,/Folder paging bounds DOM, supports keyboard jumps and page-local bulk selection/);
  assert.doesNotMatch(script,/\.screenshot\(|recordVideo|tracing\.start/);
  assert.match(script,/NOT physical Windows\/Pixel 8 acceptance/);
});
