import test from 'node:test';
import assert from 'node:assert/strict';
import {readPhysicalShortcut,readPhysicalTextPreview,MAX_SHORTCUT_BYTES} from '../src/file-preview.mjs';
import {planFileCapture} from '../src/file-capture.mjs';
const asFile=text=>new Blob([text],{type:'text/plain'});
test('physical .url preview reads ordinary shortcut bytes without network or Catalog',async()=>{
  const plan=planFileCapture({kind:'url',value:'https://example.org/resource',title:'Reference'},
    {now:new Date('2026-10-29T00:00:00Z'),random:'abc123def456'});
  assert.deepEqual(await readPhysicalShortcut(asFile(plan.text)),{status:'ok',url:'https://example.org/resource'});
});
test('malicious, ambiguous, empty and oversized shortcuts fail closed',async()=>{
  for(const value of ['[InternetShortcut]\nURL=javascript:alert(1)','[InternetShortcut]\nURL=https://example.org\nURL=https://other.org',
    '[InternetShortcut]\n[Other]\nURL=https://example.org','[InternetShortcut]\nURL=file:///private','nonsense']){
    assert.equal((await readPhysicalShortcut(asFile(value))).status,'invalid',value);
  }
  const oversized=asFile('[InternetShortcut]\nURL=https://example.org\n'+'x'.repeat(MAX_SHORTCUT_BYTES));
  assert.match((await readPhysicalShortcut(oversized)).reason,/8 KiB/);
});
test('text preview reads bounded slice only, never entire file',async()=>{
  const slices=[];let fullReads=0;
  const file={size:9000000,slice(start,end){slices.push([start,end]);return asFile('safe text');},
    async text(){fullReads++;throw Error('unbounded read');}};
  const preview=await readPhysicalTextPreview(file);
  assert.deepEqual(slices,[[0,200000]]);assert.equal(fullReads,0);
  assert.deepEqual(preview,{text:'safe text',truncated:true});
  await assert.rejects(()=>readPhysicalTextPreview(file,{limit:300000}),/Invalid bounded/);
});
test('short text is not marked truncated',async()=>{
  assert.deepEqual(await readPhysicalTextPreview(asFile('# Notes\n')),{text:'# Notes\n',truncated:false});
});
