import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {M0_HANDLE_KEY,probeDisposableWriteFolder,rememberDisposableReadFolder,recheckDisposableReadFolder,forgetDisposableReadFolder,normalizeWriteProbe,normalizeReopenProbe} from '../src/m0-feasibility.mjs';

const UUID='12345678-1234-4123-8123-123456789abc';
const missing=()=>Object.assign(Error('missing'),{name:'NotFoundError'});
function fakeDirectory({grant='granted',readback=null,removeFails=false,writeFails=false,identity=true}={}){
  const files=new Map(),events=[];
  const dir={
    kind:'directory',events,files,
    async queryPermission(options){events.push('permission:'+options.mode);return grant;},
    async getFileHandle(name,options={}){
      events.push('get:'+(options.create?'create':'read'));
      if(!files.has(name)){if(!options.create)throw missing();files.set(name,{data:''});}
      const file=files.get(name);
      if(!file.handle)file.handle={
        async createWritable(){events.push('writable');return {
          async write(value){events.push('write');if(writeFails)throw Error('write failed');file.data=value;},
          async close(){events.push('close');},
          async abort(){events.push('abort');}
        };},
        async getFile(){events.push('getFile');return {text:async()=>readback===null?file.data:readback};},
        async isSameEntry(other){events.push('identity');return identity&&other===file.handle;}
      };
      return file.handle;
    },
    async removeEntry(name){events.push('remove');if(removeFails)throw Error('remove failed');files.delete(name);},
    async *values(){events.push('enumerate');yield {kind:'file',name:'private-name'};}
  };
  return dir;
}
const options={confirmed:true,randomUUID:()=>UUID};
test('write probe requires explicit confirmation and never opens a picker otherwise',async()=>{
  let called=false;
  const result=await probeDisposableWriteFolder(async()=>{called=true;});
  assert.equal(result.status,'not-confirmed');
  assert.equal(called,false);
});
test('unsupported picker, cancellation and denial do not create files',async()=>{
  assert.equal((await probeDisposableWriteFolder(null,options)).status,'unsupported');
  const cancel=await probeDisposableWriteFolder(async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});},options);
  assert.equal(cancel.status,'cancelled');
  const denied=fakeDirectory({grant:'denied'});
  const result=await probeDisposableWriteFolder(async()=>denied,options);
  assert.equal(result.status,'denied');
  assert.equal(denied.files.size,0);
});
test('successful disposable write checks exact bytes, handle identity, removes and confirms absence',async()=>{
  const dir=fakeDirectory(),modes=[];
  const result=await probeDisposableWriteFolder(async opts=>{modes.push(opts.mode);return dir;},options);
  assert.deepEqual(modes,['readwrite']);
  assert.deepEqual(result,{status:'ok',permission:'granted',writeVerified:true,cleanupVerified:true,cleanupRequired:false});
  assert.equal(dir.files.size,0);
  assert.ok(dir.events.includes('identity'));
  assert.ok(dir.events.includes('remove'));
});
test('collision does not overwrite an existing file',async()=>{
  const dir=fakeDirectory();
  const name='.sourcebook-m0-probe-'+UUID+'.txt';
  await dir.getFileHandle(name,{create:true});
  const result=await probeDisposableWriteFolder(async()=>dir,options);
  assert.equal(result.status,'collision');
  assert.equal(dir.events.includes('writable'),false);
  assert.equal(dir.events.includes('remove'),false);
});
test('changed readback is never deleted and leftover is clearly reported',async()=>{
  const dir=fakeDirectory({readback:'unexpected'});
  const result=await probeDisposableWriteFolder(async()=>dir,options);
  assert.equal(result.status,'error');
  assert.equal(result.cleanupRequired,true);
  assert.equal(result.writeVerified,false);
  assert.match(result.leftoverName,/^\.sourcebook-m0-probe-/);
  assert.equal(dir.events.includes('remove'),false);
});
test('identity failure prevents cleanup even when marker matches',async()=>{
  const dir=fakeDirectory({identity:false});
  const result=await probeDisposableWriteFolder(async()=>dir,options);
  assert.equal(result.cleanupRequired,true);
  assert.equal(dir.events.includes('remove'),false);
});
test('cleanup failure is not reported as a successful test',async()=>{
  const dir=fakeDirectory({removeFails:true});
  const result=await probeDisposableWriteFolder(async()=>dir,options);
  assert.equal(result.status,'error');
  assert.equal(result.writeVerified,true);
  assert.equal(result.cleanupVerified,false);
  assert.equal(result.cleanupRequired,true);
});
test('failed writes are not blindly removed',async()=>{
  const dir=fakeDirectory({writeFails:true});
  const result=await probeDisposableWriteFolder(async()=>dir,options);
  assert.equal(result.status,'error');
  assert.equal(result.cleanupRequired,true);
  assert.equal(dir.events.includes('remove'),false);
});
test('read handle can be stored, checked after reload without a picker, and forgotten',async()=>{
  const db=new Map(),dir=fakeDirectory();
  const stored=await rememberDisposableReadFolder(async opts=>{assert.equal(opts.mode,'read');return dir;},async(k,v)=>db.set(k,v));
  assert.equal(stored.status,'saved');
  assert.equal(db.get(M0_HANDLE_KEY),dir);
  const result=await recheckDisposableReadFolder(async k=>db.get(k));
  assert.deepEqual(result,{status:'ok',permission:'granted',enumerated:true});
  assert.equal(dir.events.includes('enumerate'),true);
  await forgetDisposableReadFolder(async k=>db.delete(k));
  assert.equal((await recheckDisposableReadFolder(async k=>db.get(k))).status,'not-saved');
});
test('recheck never prompts and reports permission revocation without enumeration',async()=>{
  const dir=fakeDirectory({grant:'prompt'});
  const result=await recheckDisposableReadFolder(async()=>dir);
  assert.equal(result.status,'needs-regrant');
  assert.equal(result.permission,'prompt');
  assert.equal(dir.events.includes('enumerate'),false);
});
test('storage and provider errors fail closed without exposing private data',async()=>{
  assert.equal((await rememberDisposableReadFolder(async()=>fakeDirectory(),async()=>{throw Error('private path');})).status,'error');
  assert.equal((await recheckDisposableReadFolder(async()=>{throw Error('private path');})).status,'error');
  assert.equal((await recheckDisposableReadFolder(async()=>fakeDirectory({grant:'denied'}))).status,'needs-regrant');
});
test('normalizers strip unknown fields and do not persist synthetic names',()=>{
  const w=normalizeWriteProbe({status:'ok',permission:'granted',writeVerified:true,cleanupRequired:true,leftoverName:'private.txt',secret:'abc'});
  const r=normalizeReopenProbe({status:'ok',enumerated:true,handle:{name:'secret'}});
  assert.ok(!JSON.stringify(w).includes('private'));
  assert.ok(!JSON.stringify(r).includes('secret'));
});
test('offline service worker precaches the new probe module',async()=>{
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/\.\/src\/m0-feasibility\.mjs/);
  assert.match(sw,/k\.startsWith\('sourcebook-shell-'\)/);
});
