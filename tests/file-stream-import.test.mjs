import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {copyAndVerifyStreamedFile,STREAM_CHUNK_BYTES} from '../src/file-stream-import.mjs';
import {planOrdinaryFileImport,importOrdinaryFiles,MAX_IMPORT_FILE_BYTES,MAX_IMPORT_TOTAL_BYTES} from '../src/file-import.mjs';

function source(name,bytes){
  const blob=new Blob([bytes]);
  return {name,size:blob.size,lastModified:1234,slice:(start,end)=>blob.slice(start,end),
    arrayBuffer:()=>{throw Error('Full-file allocation is forbidden in streaming test');}};
}
function destination({corrupt=false,failAt=Infinity}={}){
  let contents=new Blob(),chunks=[],writes=0,aborts=0;
  const handle={
    async getFile(){return contents;},
    async createWritable(){
      chunks=[];return {
        async write(bytes){writes++;if(writes>=failAt)throw Error('provider write failure');chunks.push(new Uint8Array(bytes));},
        async close(){contents=new Blob(chunks);if(corrupt){const bytes=new Uint8Array(await contents.arrayBuffer());bytes[bytes.length-1]^=1;contents=new Blob([bytes]);}},
        async abort(){aborts++;}
      };
    }
  };
  return {handle,get writes(){return writes;},get aborts(){return aborts;},get contents(){return contents;}};
}
test('bounded streaming copy and byte-for-byte readback never allocate the whole source',async()=>{
  const data=Uint8Array.from({length:12000},(_,i)=>i%251);
  const d=destination(),progress=[];
  const result=await copyAndVerifyStreamedFile(d.handle,source('sample.bin',data),{
    chunkBytes:1024,onProgress:event=>progress.push(event)});
  assert.equal(result.verification,'bytewise');
  assert.equal(result.sha256,null);
  assert.equal(result.size,data.length);
  assert.equal(d.writes,12);
  assert.deepEqual(new Uint8Array(await d.contents.arrayBuffer()),data);
  assert.equal(progress.at(-1).phase,'verify');
  assert.equal(progress.at(-1).bytes,data.length);
  assert.equal(STREAM_CHUNK_BYTES,1024*1024);
});
test('readback corruption fails rather than reporting verified copy',async()=>{
  const d=destination({corrupt:true});
  await assert.rejects(copyAndVerifyStreamedFile(d.handle,source('bad.bin',new Uint8Array(5000)),{chunkBytes:1024}),/Readback bytes differ/);
});
test('source short read fails closed and aborts writer',async()=>{
  const d=destination(),f={name:'short.bin',size:4000,slice:()=>new Blob([new Uint8Array(2)])};
  await assert.rejects(copyAndVerifyStreamedFile(d.handle,f,{chunkBytes:1024}),/short read/);
  assert.equal(d.aborts,1);
});
test('provider failure reports possible partial file and aborts writer',async()=>{
  const d=destination({failAt:2});
  await assert.rejects(copyAndVerifyStreamedFile(d.handle,source('broken.bin',new Uint8Array(4000)),{chunkBytes:1024}),/partial file may remain/);
  assert.equal(d.aborts,1);
});
test('cancel mid-copy stops before writing another chunk; no automatic file deletion',async()=>{
  const d=destination(),controller=new AbortController();
  await assert.rejects(copyAndVerifyStreamedFile(d.handle,source('cancel.bin',new Uint8Array(5000)),{
    chunkBytes:1024,signal:controller.signal,
    onProgress:event=>{if(event.phase==='copy')controller.abort();}
  }),/cancelled/);
  assert.equal(d.writes,1);assert.equal(d.aborts,1);
});
test('cancel during readback preserves written file and does not claim verification',async()=>{
  const d=destination(),controller=new AbortController();
  await assert.rejects(copyAndVerifyStreamedFile(d.handle,source('cancel.bin',new Uint8Array(5000)),{
    chunkBytes:1024,signal:controller.signal,
    onProgress:event=>{if(event.phase==='verify')controller.abort();}
  }),/cancelled/);
  assert.equal(d.contents.size,5000);
});
test('large ordinary file uses chunked import and does not require a whole-file digest',async()=>{
  const big=source('large.bin',new Uint8Array(25*1024*1024+1));
  const entries=new Map();
  const directory={kind:'directory',
    async *entries(){for(const name of entries.keys())yield [name,{}];},
    async getFileHandle(name,{create=false}={}){
      if(!entries.has(name)){
        if(!create)throw Object.assign(Error('missing'),{name:'NotFoundError'});
        entries.set(name,destination());
      }
      return entries.get(name).handle;
    }
  };
  const events=[];
  const result=await importOrdinaryFiles(directory,[big],{cryptoApi:{},onProgress:event=>events.push(event)});
  assert.equal(result.verified,true);
  assert.equal(result.saved[0].verification,'bytewise');
  assert.equal(result.saved[0].sha256,null);
  assert.equal(entries.get('large.bin').contents.size,big.size);
  assert.ok(events.some(e=>e.phase==='copy'));
  assert.ok(events.some(e=>e.phase==='verify'));
  assert.equal(events.at(-1).fileIndex,1);
  assert.equal(events.at(-1).phase,'done');
});
test('large file bounds and source slice capability are validated before touching destination',()=>{
  assert.equal(MAX_IMPORT_FILE_BYTES,512*1024*1024);
  assert.equal(MAX_IMPORT_TOTAL_BYTES,1024*1024*1024);
  assert.throws(()=>planOrdinaryFileImport([{name:'huge.bin',size:MAX_IMPORT_FILE_BYTES+1,arrayBuffer:async()=>new ArrayBuffer(0),slice:()=>{}}]),/Unsupported/);
  assert.throws(()=>planOrdinaryFileImport([{name:'missing-slice.bin',size:26*1024*1024,arrayBuffer:async()=>new ArrayBuffer(0)}]),/Unsupported/);
});
test('UI exposes explicit progress/cancellation and precaches streaming module',async()=>{
  const [app,sw]=await Promise.all(['../src/app.mjs','../sw.js'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(app,/id="import-progress"/);
  assert.match(app,/id="cancel-import"/);
  assert.match(app,/fileImportController\.abort\(\)/);
  assert.match(app,/signal:controller\.signal,onProgress/);
  assert.match(sw,/\.\/src\/file-stream-import\.mjs/);
});
