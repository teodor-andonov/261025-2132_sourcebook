import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createM0CaptureFixture,verifyM0CaptureFixture,normalizeCaptureProbe} from '../src/m0-capture-acceptance.mjs';

const UUID='12345678-1234-4123-8123-123456789abc';
const missing=()=>Object.assign(Error('not found'),{name:'NotFoundError'});
class Directory {
  constructor(name='Empty disposable parent',grant='granted'){
    this.name=name;this.kind='directory';this.grant=grant;
    this.files=new Map();this.directories=new Map();this.writes=0;this.failMarkdown=false;
  }
  async queryPermission(){return this.grant;}
  async getDirectoryHandle(name,{create=false}={}){
    if(!this.directories.has(name)){
      if(!create)throw missing();
      this.directories.set(name,new Directory(name,this.grant));
    }
    return this.directories.get(name);
  }
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){
      if(!create)throw missing();
      this.files.set(name,{text:''});
    }
    const entry=this.files.get(name);
    return {kind:'file',name,
      getFile:async()=>({size:entry.text.length,text:async()=>entry.text}),
      createWritable:async()=>{
        let pending='';
        return {write:async text=>{pending=text;},close:async()=>{
          if(this.failMarkdown&&name.endsWith('.md'))throw Error('provider write failure');
          entry.text=pending;this.writes++;
        },abort:async()=>{}};
      }
    };
  }
  async *entries(){
    for(const name of this.files.keys())yield [name,{kind:'file'}];
    for(const name of this.directories.keys())yield [name,{kind:'directory'}];
  }
  async *values(){
    for(const name of this.files.keys())yield {kind:'file',name};
    for(const [name,handle] of this.directories)yield {kind:'directory',name,handle};
  }
}
const opts={confirmed:true,randomUUID:()=>UUID};
const create=dir=>createM0CaptureFixture(async options=>{assert.equal(options.mode,'readwrite');return dir;},opts);
test('requires explicit confirmation before opening any picker',async()=>{
  let called=false;
  const r=await createM0CaptureFixture(async()=>{called=true;});
  assert.equal(r.status,'not-run');assert.equal(called,false);
  assert.equal((await createM0CaptureFixture(null,opts)).status,'unsupported');
});
test('empty disposable parent is mandatory and existing entries remain untouched',async()=>{
  const dir=new Directory();await dir.getFileHandle('valuable.pdf',{create:true});
  const r=await create(dir);
  assert.equal(r.status,'not-empty');assert.equal(dir.directories.size,0);
  assert.equal(dir.files.get('valuable.pdf').text,'');
});
test('cancelled and denied providers never create fixtures',async()=>{
  const cancel=await createM0CaptureFixture(async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});},opts);
  assert.equal(cancel.status,'cancelled');
  const denied=new Directory('Parent','denied');
  assert.equal((await create(denied)).status,'denied');
  assert.equal(denied.directories.size,0);
});
test('invalid UUID refuses any write',async()=>{
  const dir=new Directory();
  const r=await createM0CaptureFixture(async()=>dir,{confirmed:true,randomUUID:()=> '../private'});
  assert.equal(r.status,'error');assert.equal(dir.directories.size,0);
});
test('successful fixture creates exactly two physical files with exact URL and Markdown bytes',async()=>{
  const dir=new Directory(),result=await create(dir);
  assert.equal(result.status,'ok');
  assert.equal(result.created,true);assert.equal(result.cleanupRequired,false);
  assert.equal(result.urlVerified,true);assert.equal(result.textVerified,true);
  assert.match(result.fixtureProof,/^[a-f0-9]{64}$/);
  const fixture=dir.directories.get(result.fixtureName);
  assert.ok(fixture);assert.equal(fixture.files.size,2);
  assert.equal(fixture.writes,2);
  const names=[...fixture.files.keys()];
  assert.ok(names.some(n=>n.endsWith('.url')));
  assert.ok(names.some(n=>n.endsWith('.md')));
  assert.match(fixture.files.get(names.find(n=>n.endsWith('.url'))).text,/^\[InternetShortcut\]\r\nURL=https:\/\/example.org\/sourcebook-m0-capture\//);
  assert.match(fixture.files.get(names.find(n=>n.endsWith('.md'))).text,/^# Sourcebook M0 capture\n/);
  const verify=await verifyM0CaptureFixture(async options=>{assert.equal(options.mode,'read');return fixture;});
  assert.equal(verify.status,'ok');assert.equal(verify.fixtureProof,result.fixtureProof);
  assert.equal(fixture.writes,2,'read-only verification must not write');
});
test('verification of a transferred copy works without Catalog or source handles',async()=>{
  const parent=new Directory(),created=await create(parent),source=parent.directories.get(created.fixtureName);
  const copied=new Directory(source.name);
  for(const [name,value] of source.files)copied.files.set(name,{text:value.text});
  const r=await verifyM0CaptureFixture(async()=>copied);
  assert.equal(r.status,'ok');assert.equal(copied.writes,0);
});
test('tampering, missing and extra entries are rejected read-only',async()=>{
  for(const variant of ['tamper-url','tamper-md','remove','extra']){
    const parent=new Directory(),created=await create(parent),fixture=parent.directories.get(created.fixtureName);
    const names=[...fixture.files.keys()];
    if(variant==='tamper-url')fixture.files.get(names.find(n=>n.endsWith('.url'))).text+='tampered';
    if(variant==='tamper-md')fixture.files.get(names.find(n=>n.endsWith('.md'))).text+='tampered';
    if(variant==='remove')fixture.files.delete(names[0]);
    if(variant==='extra')fixture.files.set('extra.txt',{text:'private'});
    const r=await verifyM0CaptureFixture(async()=>fixture);
    assert.equal(r.status,'invalid',variant);
    assert.equal(fixture.writes,2);
  }
});
test('malformed fixture names, missing picker and denied reads fail closed',async()=>{
  assert.equal((await verifyM0CaptureFixture(null)).status,'unsupported');
  assert.equal((await verifyM0CaptureFixture(async()=>new Directory('private'))).status,'invalid');
  const parent=new Directory(),created=await create(parent),fixture=parent.directories.get(created.fixtureName);
  fixture.grant='denied';
  assert.equal((await verifyM0CaptureFixture(async()=>fixture)).status,'denied');
});
test('interrupted second write leaves partial fixture and reports manual inspection',async()=>{
  const dir=new Directory();
  const original=dir.getDirectoryHandle.bind(dir);
  dir.getDirectoryHandle=async(...args)=>{
    const child=await original(...args);
    child.failMarkdown=true;return child;
  };
  const r=await create(dir);
  assert.equal(r.status,'error');assert.equal(r.cleanupRequired,true);
  assert.equal(r.created,true);assert.equal(dir.directories.size,1);
  const child=dir.directories.get(r.fixtureName);
  assert.ok([...child.files.keys()].some(name=>name.endsWith('.url')));
  assert.equal((await verifyM0CaptureFixture(async()=>child)).status,'invalid');
});
test('sanitized report snapshot cannot leak fixture names or provider errors',()=>{
  const normalized=normalizeCaptureProbe({status:'error',permission:'granted',created:true,cleanupRequired:true,
    fixtureName:'Sourcebook-M0-Capture-private',error:'private/path',fixtureProof:'not-a-hash'});
  assert.equal(normalized.status,'error');assert.equal(normalized.cleanupRequired,true);
  assert.ok(!JSON.stringify(normalized).includes('private'));
  assert.equal(normalized.fixtureProof,'');
});
test('device UI, report export and scoped service worker include the provider gate',async()=>{
  const [ui,sw]=await Promise.all([
    readFile(new URL('../src/device-readiness.mjs',import.meta.url),'utf8'),
    readFile(new URL('../sw.js',import.meta.url),'utf8')
  ]);
  assert.match(ui,/physicalCaptureCreateProbe:value\.captureCreateProbe/);
  assert.match(ui,/data-m0-capture-create/);
  assert.match(ui,/data-m0-capture-verify/);
  assert.match(ui,/createM0CaptureFixture/);
  assert.match(ui,/verifyM0CaptureFixture/);
  assert.match(ui,/env\.confirm/);
  assert.match(sw,/\.\/src\/m0-capture-acceptance\.mjs/);
  assert.match(sw,/k\.startsWith\('sourcebook-shell-'\)/);
});
