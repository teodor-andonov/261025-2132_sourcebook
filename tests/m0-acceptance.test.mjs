import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createM0PortableCatalogFixture,verifyM0PortableCatalogFixture,inspectM0OfflineShell,normalizePortableProbe,normalizeOfflineProbe} from '../src/m0-acceptance.mjs';
const UUID='12345678-1234-4123-8123-123456789abc';
const missing=()=>Object.assign(Error('missing'),{name:'NotFoundError'});
class Directory {
  constructor(name='Disposable',grant='granted'){this.name=name;this.kind='directory';this.grant=grant;this.files=new Map();this.directories=new Map();this.writes=[];this.failName=null;}
  async queryPermission(){return this.grant;}
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){if(!create)throw missing();this.files.set(name,{value:''});}
    const file=this.files.get(name);
    return {kind:'file',name,getFile:async()=>({text:async()=>file.value}),
      createWritable:async()=>{let buffer;return {write:async value=>{buffer=value;},
        close:async()=>{if(this.failName===name)throw Error('interrupted');file.value=buffer;this.writes.push(name);},
        abort:async()=>{}};}};
  }
  async getDirectoryHandle(name,{create=false}={}){
    if(!this.directories.has(name)){if(!create)throw missing();this.directories.set(name,new Directory(name,this.grant));}
    return this.directories.get(name);
  }
  async *values(){for(const name of this.files.keys())yield {kind:'file',name};for(const [name,dir] of this.directories)yield {kind:'directory',name,...dir};}
  async *entries(){for(const name of this.files.keys())yield [name,{kind:'file'}];for(const [name] of this.directories)yield [name,{kind:'directory'}];}
  async removeEntry(name){if(!this.files.delete(name))throw missing();}
}
const options={confirmed:true,randomUUID:()=>UUID,now:()=> '2026-10-28T06:24:00.000Z'};
const create=async dir=>createM0PortableCatalogFixture(async opts=>{assert.equal(opts.mode,'readwrite');return dir;},options);
test('requires explicit consent before picker, and rejects missing picker',async()=>{
  let called=false;
  assert.equal((await createM0PortableCatalogFixture(async()=>{called=true;})).status,'not-run');
  assert.equal(called,false);
  assert.equal((await createM0PortableCatalogFixture(null,options)).status,'unsupported');
});
test('rejects nonempty disposable parent and denied permissions without writing',async()=>{
  const nonempty=new Directory();await nonempty.getFileHandle('existing.txt',{create:true});
  assert.equal((await create(nonempty)).status,'not-empty');
  assert.equal(nonempty.directories.size,0);
  const denied=new Directory('Disposable','denied');
  assert.equal((await create(denied)).status,'denied');
  assert.equal(denied.directories.size,0);
});
test('cancellation and synthetic fixture name collision fail closed',async()=>{
  const cancel=await createM0PortableCatalogFixture(async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});},options);
  assert.equal(cancel.status,'cancelled');
  const dir=new Directory();
  await dir.getDirectoryHandle('Sourcebook-M0-'+UUID+'.sb',{create:true});
  // Parent is no longer empty, so no new fixture is created.
  assert.equal((await create(dir)).status,'not-empty');
});
test('creates a journaled portable Catalog, nested stable Tags, URL and saved View',async()=>{
  const parent=new Directory(),result=await create(parent);
  assert.equal(result.status,'ok');
  assert.equal(result.transactionVerified,true);
  assert.equal(result.portableVerified,true);
  assert.equal(result.journalClear,true);
  assert.match(result.fixtureProof,/^[a-f0-9]{64}$/);
  const fixture=parent.directories.get(result.fixtureName);
  assert.ok(fixture);
  assert.equal(fixture.files.has('.sourcebook-pending.json'),false);
  assert.equal(JSON.parse(fixture.files.get('catalog.json').value).nextSequence,2);
  assert.equal(JSON.parse(fixture.files.get('tags.json').value).length,2);
  assert.equal(JSON.parse(fixture.files.get('views.json').value).length,1);
  assert.equal(JSON.parse(fixture.directories.get('resources').files.get('mt1.json').value).id,'mt1');
  assert.equal((await verifyM0PortableCatalogFixture(async opts=>{assert.equal(opts.mode,'read');return fixture;})).status,'ok');
});
test('verification is read-only, including independent synced copy of metadata',async()=>{
  const parent=new Directory(),created=await create(parent),original=parent.directories.get(created.fixtureName);
  const clone=new Directory(created.fixtureName);
  for(const [name,file] of original.files)clone.files.set(name,{value:file.value});
  const resources=new Directory('resources');
  for(const [name,file] of original.directories.get('resources').files)resources.files.set(name,{value:file.value});
  clone.directories.set('resources',resources);
  const result=await verifyM0PortableCatalogFixture(async()=>clone);
  assert.equal(result.status,'ok');
  assert.equal(clone.writes.length,0);assert.equal(resources.writes.length,0);
});
test('tampered Tags, URLs, Views and pending journal prevent acceptance',async()=>{
  for(const target of ['tags.json','views.json','url','.sourcebook-pending.json']){
    const parent=new Directory(),created=await create(parent),fixture=parent.directories.get(created.fixtureName);
    if(target==='url')fixture.directories.get('resources').files.get('mt1.json').value='{"kind":"url","id":"mt1","url":"file:///secret"}';
    else if(target==='.sourcebook-pending.json')fixture.files.set(target,{value:'{}'});
    else fixture.files.get(target).value='[]';
    const result=await verifyM0PortableCatalogFixture(async()=>fixture);
    assert.notEqual(result.status,'ok',target);
    assert.equal(result.portableVerified,false);
  }
});
test('foreign directories, denied grants and missing picker cannot pass',async()=>{
  assert.equal((await verifyM0PortableCatalogFixture(null)).status,'unsupported');
  assert.equal((await verifyM0PortableCatalogFixture(async()=>new Directory('other'))).portableVerified,false);
  assert.equal((await verifyM0PortableCatalogFixture(async()=>new Directory('x','denied'))).status,'denied');
});
test('interrupted Catalog creation preserves partial fixture for manual review',async()=>{
  const parent=new Directory();
  const old=parent.getDirectoryHandle.bind(parent);
  parent.getDirectoryHandle=async(name,opts)=>{
    const dir=await old(name,opts);
    dir.failName='views.json';
    return dir;
  };
  const result=await create(parent);
  assert.equal(result.status,'error');
  assert.equal(result.cleanupRequired,true);
  assert.equal(result.catalogCreated,true);
  assert.ok(parent.directories.has(result.fixtureName));
  assert.ok(parent.directories.get(result.fixtureName).files.has('.sourcebook-pending.json'));
});
test('probe normalization excludes names and never auto-accepts M0',()=>{
  const value=normalizePortableProbe({status:'ok',portableVerified:true,fixtureName:'private-name',cleanupRequired:true});
  assert.equal(value.portableVerified,true);
  assert.ok(!JSON.stringify(value).includes('private'));
  assert.equal(normalizePortableProbe(null).status,'not-run');
  assert.equal(normalizeOfflineProbe({status:'cached',secret:'path'}).status,'cached');
});
test('offline cache diagnostic distinguishes active, inactive, missing and unsupported',async()=>{
  const fake=controller=>({location:{href:'https://example.org/261025-2132_sourcebook/'},
    navigator:{serviceWorker:{controller}},
    caches:{keys:async()=>['sourcebook-shell-test','other-app-cache'],
      open:async()=>({match:async url=>({ok:url.includes('sourcebook')})})}});
  assert.equal((await inspectM0OfflineShell(fake({}))).status,'cached');
  assert.equal((await inspectM0OfflineShell(fake(null))).status,'inactive');
  assert.equal((await inspectM0OfflineShell({location:{href:'https://example.org'},caches:{keys:async()=>[]}})).status,'missing');
  assert.equal((await inspectM0OfflineShell({})).status,'unsupported');
});
test('M0 fixture and offline probes are integrated and cached without screenshots',async()=>{
  const ui=await readFile(new URL('../src/device-readiness.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(ui,/createM0PortableCatalogFixture/);
  assert.match(ui,/verifyM0PortableCatalogFixture/);
  assert.match(ui,/inspectM0OfflineShell/);
  assert.match(ui,/data-m0-portable-create/);
  assert.match(ui,/data-m0-offline/);
  assert.match(sw,/\.\/src\/m0-acceptance\.mjs/);
  assert.match(sw,/k\.startsWith\('sourcebook-shell-'\)/);
});
