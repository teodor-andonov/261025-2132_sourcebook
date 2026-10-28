import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planOrdinaryFileImport} from '../src/file-import.mjs';
import {collectPastedImageBlobs,prepareClipboardImages,readClipboardImages,
  MAX_CLIPBOARD_IMAGE_BYTES,MAX_CLIPBOARD_IMAGE_FILES} from '../src/clipboard-images.mjs';
const blob=(type,bytes=4)=>new Blob([new Uint8Array(bytes)],{type});
const opts={now:'2026-10-28T13:31:00.000Z',idFactory:()=> '12345678-1234-1234-1234-123456789abc'};
test('clipboard PNG/JPEG/WebP/GIF become reviewable ordinary Files, not Catalog rows',()=>{
  const files=prepareClipboardImages(['image/png','image/jpeg','image/webp','image/gif'].map(t=>blob(t)),opts);
  assert.deepEqual(files.map(f=>f.name),['png','jpg','webp','gif'].map((ext,i)=>
    'Clipboard-20261028-133100-12345678123412341234123456789abc-'+(i+1)+'.'+ext));
  assert.equal(planOrdinaryFileImport(files).items.length,4);
  assert.equal(files[0].size,4);
});
test('image names are unique per capture and preserve original blob bytes',async()=>{
  const source=blob('image/png',9);
  const [file]=prepareClipboardImages([source],opts);
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()),new Uint8Array(await source.arrayBuffer()));
  const [other]=prepareClipboardImages([source],{...opts,idFactory:()=> 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'});
  assert.notEqual(other.name,file.name);
});
test('clipboard intake rejects SVG and unsupported image formats without conversion',()=>{
  for(const type of ['image/svg+xml','image/heic','text/plain']){
    assert.throws(()=>prepareClipboardImages([blob(type)],opts),/Unsupported/);
  }
});
test('clipboard intake enforces count, per-file size, total size and nonempty bytes',()=>{
  assert.throws(()=>prepareClipboardImages([],opts),/Select/);
  assert.throws(()=>prepareClipboardImages(Array.from({length:MAX_CLIPBOARD_IMAGE_FILES+1},()=>blob('image/png')),opts),/Select/);
  assert.throws(()=>prepareClipboardImages([blob('image/png',0)],opts),/nonempty/);
  assert.throws(()=>prepareClipboardImages([blob('image/png',MAX_CLIPBOARD_IMAGE_BYTES+1)],opts),/25 MiB/);
  assert.throws(()=>prepareClipboardImages([blob('image/png',11*1024*1024),blob('image/png',21*1024*1024),blob('image/png',21*1024*1024)],opts),/50 MiB/);
});
test('invalid capture timestamp or weak identifier is rejected',()=>{
  assert.throws(()=>prepareClipboardImages([blob('image/png')],{...opts,now:'bad'}),/timestamp/);
  assert.throws(()=>prepareClipboardImages([blob('image/png')],{...opts,idFactory:()=> 'a'}),/identity/);
});
test('paste uses clipboard files once, or item fallback when files unavailable',()=>{
  const png=blob('image/png'),webp=blob('image/webp');
  assert.deepEqual(collectPastedImageBlobs({files:[png],items:[{kind:'file',type:'image/png',getAsFile:()=>png}]}),[png]);
  assert.deepEqual(collectPastedImageBlobs({files:[],items:[{kind:'file',type:'image/webp',getAsFile:()=>webp}]}),[webp]);
  assert.deepEqual(collectPastedImageBlobs({files:[],items:[{kind:'string',type:'text/plain'}]}),[]);
});
test('explicit clipboard.read chooses one supported raster representation per item',async()=>{
  const requested=[];
  const files=await readClipboardImages({read:async()=>[
    {types:['text/plain','image/png','image/jpeg'],getType:async t=>{requested.push(t);return blob(t);}},
    {types:['image/webp'],getType:async t=>{requested.push(t);return blob(t);}}
  ]},opts);
  assert.deepEqual(requested,['image/png','image/webp']);
  assert.equal(files.length,2);
});
test('denied, missing and unsupported clipboard reads never produce a file',async()=>{
  await assert.rejects(readClipboardImages({},opts),/unavailable/);
  await assert.rejects(readClipboardImages({read:async()=>{throw Error('NotAllowedError');}},opts),/NotAllowedError/);
  await assert.rejects(readClipboardImages({read:async()=>[{types:['text/plain']}]},opts),/no supported image/);
  await assert.rejects(readClipboardImages({read:async()=>[{types:['image/svg+xml']}]},opts),/Unsupported/);
});
test('app routes pasted images and explicit clipboard reads through reviewed import only',()=>{
  const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
  assert.match(app,/collectPastedImageBlobs\(event\.clipboardData\)/);
  assert.match(app,/showFileImport\(prepareClipboardImages\(imageBlobs\),\{origin:'clipboard'\}\)/);
  assert.match(app,/const files=await readClipboardImages\(navigator\.clipboard\)/);
  assert.match(app,/showFileImport\(files,\{origin:'clipboard'\}\)/);
  assert.match(app,/case 'capture-clipboard-image'/);
  assert.match(app,/Review clipboard images/);
  assert.doesNotMatch(app,/writeCapturedFile\(.*imageBlobs/);
});
test('clipboard module is precached without changing scoped SW cache cleanup',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/\.\/src\/clipboard-images\.mjs/);
  assert.match(sw,/k\.startsWith\('sourcebook-shell-'\)/);
  const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.id,'/261025-2132_sourcebook/');
});
