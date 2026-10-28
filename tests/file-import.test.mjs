import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {planOrdinaryFileImport,importOrdinaryFiles} from '../src/file-import.mjs';
const file=(name,content)=>({name,size:new TextEncoder().encode(content).length,
  arrayBuffer:async()=>new TextEncoder().encode(content).buffer});
function directory(){
  const files=new Map();let writes=0,fail='',corrupt='',onCreate=null;
  const d={kind:'directory',files,get writes(){return writes;},
    set fail(name){fail=name;},set corrupt(name){corrupt=name;},set onCreate(fn){onCreate=fn;},
    async *entries(){for(const name of files.keys())yield [name,{}];},
    async getFileHandle(name,{create=false}={}){
      if(!files.has(name)){
        if(!create)throw Object.assign(Error('missing'),{name:'NotFoundError'});
        files.set(name,new Uint8Array());onCreate?.(name,files);
      }
      return {async getFile(){const value=files.get(name);return {size:value.byteLength,arrayBuffer:async()=>value.slice().buffer};},
        async createWritable(){return {async write(bytes){writes++;if(fail===name)throw Error('provider failure');
          files.set(name,new Uint8Array(bytes));},
          async close(){if(corrupt===name)files.set(name,new Uint8Array([42]));},async abort(){}};}};
    }};
  return d;
}
test('explicit batch imports bytes unchanged with SHA-256 readback',async()=>{
  const d=directory(),files=[file('image.png','binary'),file('notes.md','# hello')];
  const result=await importOrdinaryFiles(d,files,{cryptoApi:webcrypto});
  assert.equal(result.verified,true);assert.equal(result.saved.length,2);
  assert.equal(new TextDecoder().decode(d.files.get('image.png')),'binary');
  assert.equal(result.saved[0].sha256.length,64);assert.equal(d.writes,2);
});
test('case-insensitive existing destination collision rejects whole batch before writes',async()=>{
  const d=directory();d.files.set('PHOTO.JPG',new Uint8Array([1]));
  await assert.rejects(importOrdinaryFiles(d,[file('photo.jpg','x'),file('new.md','y')],{cryptoApi:webcrypto}),/already contains/);
  assert.equal(d.writes,0);assert.equal(d.files.has('new.md'),false);
});
test('batch duplicate names reject before touching destination',async()=>{
  const d=directory();
  await assert.rejects(importOrdinaryFiles(d,[file('a.md','1'),file('A.MD','2')],{cryptoApi:webcrypto}),/colliding/);
  assert.equal(d.files.size,0);
});
test('unsafe filenames and Windows reserved names are rejected',()=>{
  for(const name of ['../secret','CON.txt','a\\b.md','trailing.',' hidden ','x'.repeat(181),'.sourcebook-pending.json']){
    assert.throws(()=>planOrdinaryFileImport([file(name,'x')]),/Unsupported/);
  }
});
test('file and batch size limits reject before writing',()=>{
  assert.throws(()=>planOrdinaryFileImport(Array.from({length:11},(_,i)=>file(i+'.md','x'))),/1–10/);
  assert.throws(()=>planOrdinaryFileImport([{name:'large.bin',size:26*1024*1024,arrayBuffer:async()=>new ArrayBuffer(0)}]),/Unsupported/);
});
test('missing enumeration or SHA-256 fails closed',async()=>{
  const d=directory();
  await assert.rejects(importOrdinaryFiles({...d,entries:undefined},[file('a.md','x')],{cryptoApi:webcrypto}),/enumerated/);
  await assert.rejects(importOrdinaryFiles(d,[file('a.md','x')],{cryptoApi:{}}),/SHA-256/);
  assert.equal(d.writes,0);
});
test('provider failure leaves partial file and reports verified progress',async()=>{
  const d=directory();d.fail='b.md';
  await assert.rejects(importOrdinaryFiles(d,[file('a.md','a'),file('b.md','b')],{cryptoApi:webcrypto}),/after 1\/2 verified/);
  assert.equal(d.files.has('a.md'),true);assert.equal(d.files.has('b.md'),true);
});
test('readback corruption is not reported as success',async()=>{
  const d=directory();d.corrupt='a.md';
  await assert.rejects(importOrdinaryFiles(d,[file('a.md','a')],{cryptoApi:webcrypto}),/checksum differs/);
});
test('last-moment nonempty race refuses overwrite',async()=>{
  const d=directory();d.onCreate=(name,files)=>files.set(name,new Uint8Array([55]));
  await assert.rejects(importOrdinaryFiles(d,[file('a.md','a')],{cryptoApi:webcrypto}),/unexpectedly contains data/);
  assert.equal(d.writes,0);assert.equal(d.files.get('a.md')[0],55);
});
test('source bytes changing between selection and write are refused',async()=>{
  const d=directory(),f={name:'a.md',size:3,arrayBuffer:async()=>new Uint8Array([1]).buffer};
  await assert.rejects(importOrdinaryFiles(d,[f],{cryptoApi:webcrypto}),/changed before import/);
  assert.equal(d.writes,0);
});
test('app offers explicit file selection, drop review, and precaches importer',async()=>{
  const [app,sw]=await Promise.all(['../src/app.mjs','../sw.js'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(app,/planOrdinaryFileImport/);assert.match(app,/importOrdinaryFiles/);
  assert.match(app,/id="import-files-form"/);
  assert.match(app,/event\.dataTransfer\?\.types\?\.includes\('Files'\)/);
  assert.match(app,/case 'import':importFiles\(\)/);
  assert.match(sw,/\.\/src\/file-import\.mjs/);
});
