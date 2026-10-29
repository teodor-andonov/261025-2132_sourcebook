import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareIncomingShare,normalizeIncomingRecord,SHARE_INBOX_LIMIT} from '../src/share-inbox.mjs';

const id='123e4567-e89b-42d3-a456-426614174000';
const opts={idFactory:()=>id,now:()=> '2026-10-28T03:25:00Z'};
const prepare=x=>prepareIncomingShare(x,opts);
test('accepts an explicit HTTP(S) shared URL and preserves shared context',()=>{
  const x=prepare({title:'Article',text:'Look at this',url:'https://Example.org:443/p?q=1'});
  assert.equal(x.candidate,'https://example.org/p?q=1');
  assert.equal(x.title,'Article');assert.equal(x.text,'Look at this');
  assert.equal(x.kind,'url');assert.deepEqual(normalizeIncomingRecord(x),x);
});
test('extracts a single URL from Android shared text without silently saving it',()=>{
  const x=prepare({text:'Interesting: https://example.org/p\nSent via Android'});
  assert.equal(x.candidate,'https://example.org/p');assert.equal(x.kind,'url');
});
test('ambiguous shares are retained for manual review, not assigned an arbitrary link',()=>{
  const x=prepare({text:'https://one.org/ and https://two.org/'});
  assert.equal(x.kind,'ambiguous');assert.equal(x.candidate,null);
});
test('text-only share remains reviewable without inventing a URL',()=>{
  const x=prepare({title:'A note',text:'A short note'});
  assert.equal(x.kind,'text');assert.equal(x.candidate,null);
});
test('unsafe and credential-bearing URLs cannot become save candidates',()=>{
  for(const value of ['javascript:alert(1)','file:///secret','https://user:pass@example.org/']){
    const x=prepare({url:value});assert.equal(x.candidate,null);assert.equal(x.kind,'text');
  }
});
test('rejects empty, oversized, control-bearing, nontext and malformed share records',()=>{
  for(const fields of [{},{text:'x'.repeat(8193)},{title:'x'.repeat(121)},{text:'abc\u0000def'},{url:{bad:1}}]){
    assert.throws(()=>prepare(fields));
  }
  const x=prepare({url:'https://example.org/'});
  assert.throws(()=>normalizeIncomingRecord({...x,candidate:'https://evil.org/'}));
  assert.throws(()=>normalizeIncomingRecord({...x,id:'wrong'}));
});
test('share target is a POST within this PWA scope and never a query-string data transfer',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.id,'/261025-2132_sourcebook/');
  assert.deepEqual(manifest.share_target,{action:'./share-target',method:'POST',enctype:'multipart/form-data',params:{title:'title',text:'text',url:'url',files:[{name:'files',accept:['*/*']}]}});
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/request\.method==='POST'/);
  assert.match(sw,/request\.formData\(\)/);
  assert.match(sw,/enqueueIncomingShare/);
  assert.match(sw,/Response\.redirect/);
  assert.doesNotMatch(sw,/URLSearchParams\(.*(?:text|url|title)/);
  assert.match(sw,/startsWith\('sourcebook-shell-'\)/);
  assert.equal(SHARE_INBOX_LIMIT,12);
});
test('app presents incoming shares for explicit review; no source-file mutations',async()=>{
  const app=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  const capture=await readFile(new URL('../src/link-capture.mjs',import.meta.url),'utf8');
  const inbox=await readFile(new URL('../src/share-inbox.mjs',import.meta.url),'utf8');
  assert.match(app,/createShareInboxUI/);
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const updates=await readFile(new URL('../pwa-update.js',import.meta.url),'utf8');
  assert.match(html,/pwa-update\.js" data-worker-type="module"/);
  assert.match(updates,/type:script.dataset.workerType/);
  assert.match(capture,/onSaved/);
  assert.match(sw,/\.\/src\/share-inbox\.mjs/);
  assert.doesNotMatch(inbox,/showDirectoryPicker|createWritable|removeEntry|requestPermission/);
});
