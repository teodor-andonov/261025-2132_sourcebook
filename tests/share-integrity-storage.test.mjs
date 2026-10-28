import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fingerprintSharedFiles,verifySharedFileIntegrity,validateSharedFileDescriptors} from '../src/shared-files.mjs';
import {inspectShareStorage,requestShareStoragePersistence,normalizeShareStorageProbe} from '../src/share-storage.mjs';
import {normalizeM0Record,exportM0Report,inspectDeviceCapabilities} from '../src/device-readiness.mjs';
const makeFile=(name,data,type='text/plain')=>{
  const b=new Blob([data],{type});
  return {name,size:b.size,type:b.type,arrayBuffer:()=>b.arrayBuffer(),slice:(...args)=>b.slice(...args)};
};
const fileFactory=(parts,name,opts)=>({name,type:opts.type,size:parts[0].size});
test('share payload is hashed before staging and verified on review',async()=>{
  const f=makeFile('note.md','hello');
  const {files,descriptors}=await fingerprintSharedFiles([f],{cryptoApi:webcrypto});
  assert.equal(files.length,1);
  assert.match(descriptors[0].sha256,/^[a-f0-9]{64}$/);
  const result=await verifySharedFileIntegrity([new Blob(['hello'],{type:'text/plain'})],descriptors,{cryptoApi:webcrypto,fileFactory});
  assert.equal(result[0].name,'note.md');
});
test('same-size tampering and swapped equal-size attachments are rejected',async()=>{
  const files=[makeFile('a.md','abc'),makeFile('b.md','xyz')];
  const {descriptors}=await fingerprintSharedFiles(files,{cryptoApi:webcrypto});
  const swapped=[new Blob(['xyz'],{type:'text/plain'}),new Blob(['abc'],{type:'text/plain'})];
  await assert.rejects(()=>verifySharedFileIntegrity(swapped,descriptors,{cryptoApi:webcrypto,fileFactory}),/checksum mismatch/);
  await assert.rejects(()=>verifySharedFileIntegrity([new Blob(['abd'],{type:'text/plain'}),new Blob(['xyz'],{type:'text/plain'})],descriptors,{cryptoApi:webcrypto,fileFactory}),/checksum mismatch/);
});
test('digest unavailable fails closed for new share staging and verified reopens',async()=>{
  const f=makeFile('a.md','abc');
  await assert.rejects(()=>fingerprintSharedFiles([f],{cryptoApi:{}}),/SHA-256 unavailable/);
  const {descriptors}=await fingerprintSharedFiles([f],{cryptoApi:webcrypto});
  await assert.rejects(()=>verifySharedFileIntegrity([new Blob(['abc'],{type:'text/plain'})],descriptors,{cryptoApi:{},fileFactory}),/SHA-256 unavailable/);
});
test('legacy un-hashed inbox remains readable; invalid checksums are rejected',async()=>{
  const d=[{name:'old.md',size:3,type:'text/plain'}];
  const result=await verifySharedFileIntegrity([new Blob(['abc'],{type:'text/plain'})],d,{cryptoApi:{},fileFactory});
  assert.equal(result[0].name,'old.md');
  assert.throws(()=>validateSharedFileDescriptors([{...d[0],sha256:'bad'}]),/checksum/);
});
test('read-only storage diagnostic returns coarse nonidentifying buckets',async()=>{
  const env={navigator:{storage:{estimate:async()=>({usage:80*1048576,quota:100*1048576}),persisted:async()=>false}}};
  assert.deepEqual(await inspectShareStorage(env),{status:'ok',persisted:'no',available:'under-50-MiB',pressure:'medium'});
  assert.equal((await inspectShareStorage({navigator:{}})).status,'unsupported');
  assert.equal((await inspectShareStorage({navigator:{storage:{estimate:async()=>{throw Error('/private/path')}}}})).status,'error');
});
test('persistence request is explicit and does not claim device acceptance',async()=>{
  let called=0;
  const env={navigator:{storage:{persist:async()=>{called++;return true;},estimate:async()=>({usage:1,quota:500*1048576}),persisted:async()=>true}}};
  assert.equal(called,0);
  const result=await requestShareStoragePersistence(env);
  assert.equal(called,1);assert.equal(result.persisted,'yes');
  assert.equal(result.available,'over-250-MiB');
  assert.equal((await requestShareStoragePersistence({navigator:{}})).status,'unsupported');
});
test('report normalizes and exports only coarse storage fields',()=>{
  const record=normalizeM0Record({shareStorageProbe:{status:'ok',persisted:'yes',available:'over-250-MiB',pressure:'low',privatePath:'/secret'}});
  const report=exportM0Report(record,inspectDeviceCapabilities({navigator:{userAgent:'Android Chrome/154'}}));
  assert.equal(report.shareInboxStorageProbe.persisted,'yes');
  assert.ok(!JSON.stringify(report).includes('privatePath'));
  assert.equal(report.results['M0-08'].status,'Not tested');
  assert.equal(normalizeShareStorageProbe({status:'ok',available:123}).available,'unknown');
});
test('service worker and Device checks wire digest and storage without screenshots',async()=>{
  const [sw,ui,inbox]=await Promise.all(['../sw.js','../src/device-readiness.mjs','../src/share-inbox.mjs'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(sw,/fingerprintSharedFiles\(shared\.files\)/);
  assert.match(sw,/\.\/src\/share-storage\.mjs/);
  assert.match(inbox,/verifySharedFileIntegrity/);
  assert.match(ui,/data-m0-storage/);
  assert.match(ui,/data-m0-persist/);
  assert.doesNotMatch(sw,/caches\.keys\(\).*?filter\(k=>k!==CACHE/);
});
