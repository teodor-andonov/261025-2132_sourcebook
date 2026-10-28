import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {createPreparedShareSession,PREPARED_SHARE_TTL_MS} from '../src/prepared-share-handoff.mjs';
import {fingerprintSharedFiles,verifySharedFileIntegrity} from '../src/shared-files.mjs';

class TestFile extends Blob{
  constructor(parts,name,opts={}){super(parts,opts);this.name=name;}
}
const shareId='123e4567-e89b-42d3-a456-426614174000';
const file=(name='drawing.pdf')=>new TestFile(['reference bytes'],name,{type:'application/pdf'});
function environment(){
  const calls=[];
  return {calls,env:{navigator:{
    canShare(payload){calls.push(['canShare',payload]);return true;},
    share(payload){calls.push(['share',payload]);return Promise.resolve();}
  }}};
}
test('preparation is bounded, one-shot, and does not open OS share sheet',async()=>{
  let now=1000;
  const session=createPreparedShareSession({clock:()=>now});
  const one=file();
  const summary=session.prepare({shareId,files:[one]});
  assert.deepEqual(summary,{shareId,count:1,names:['drawing.pdf'],totalBytes:15});
  assert.equal(PREPARED_SHARE_TTL_MS,120000);
  const {env,calls}=environment();
  const handoff=session.send({env});
  assert.deepEqual(calls.map(c=>c[0]),['canShare','share'],'share must be invoked synchronously in the click stack');
  assert.equal(calls[1][1].files[0],one);
  assert.deepEqual(await handoff,{delivery:'system-share',verified:false,count:1});
  assert.throws(()=>session.send({env}),/Prepare files/);
});
test('batch is preserved, no renames, no storage write and no text-only fallback',async()=>{
  const session=createPreparedShareSession();
  const a=file('a.pdf'),b=file('b.pdf');
  session.prepare({shareId,files:[a,b]});
  const {env,calls}=environment();
  await session.send({env});
  assert.deepEqual(calls[1][1].files,[a,b]);
  assert.deepEqual(Object.keys(calls[1][1]),['files']);
});
test('cancel discards only in-memory preparation and never opens OS share',()=>{
  const session=createPreparedShareSession();
  session.prepare({shareId,files:[file()]});
  session.clear();
  assert.throws(()=>session.send(),/Prepare files/);
});
test('expired preparation fails closed and is consumed',()=>{
  let now=0;const session=createPreparedShareSession({clock:()=>now,ttlMs:1000});
  session.prepare({shareId,files:[file()]});now=1001;
  const {env,calls}=environment();
  assert.throws(()=>session.send({env}),/expired/);
  assert.equal(calls.length,0);
  assert.throws(()=>session.send({env}),/Prepare files/);
});
test('invalid identity, unsafe filename, duplicates, empty and oversized payloads are rejected',()=>{
  const session=createPreparedShareSession();
  for(const payload of [
    {shareId:'bad',files:[file()]},
    {shareId,files:[]},
    {shareId,files:[file('../escape.pdf')]},
    {shareId,files:[file('A.pdf'),file('a.PDF')]},
    {shareId,files:[new TestFile([new Uint8Array(25*1024*1024+1)],'huge.pdf')]}
  ])assert.throws(()=>session.prepare(payload));
  assert.throws(()=>session.send(),/Prepare files/);
});
test('unsupported and cancelled OS shares remain unverified and consume preparation',async()=>{
  const session=createPreparedShareSession();
  session.prepare({shareId,files:[file()]});
  const denied={navigator:{canShare:()=>false,share:()=>{throw Error('must not call');}}};
  await assert.rejects(session.send({env:denied}),/cannot share/);
  assert.throws(()=>session.send({env:denied}),/Prepare files/);
  session.prepare({shareId,files:[file()]});
  const cancel=Object.assign(Error('Cancelled'),{name:'AbortError'});
  await assert.rejects(session.send({env:{navigator:{canShare:()=>true,share:()=>Promise.reject(cancel)}}}),e=>e===cancel);
  assert.throws(()=>session.send(),/Prepare files/);
});
test('staged SHA-256 is checked before preparation, not deferred into the activation click',async()=>{
  const source=file();
  const hashed=await fingerprintSharedFiles([source],{cryptoApi:webcrypto});
  const verified=await verifySharedFileIntegrity([new Blob(['reference bytes'],{type:'application/pdf'})],hashed.descriptors,
    {cryptoApi:webcrypto,fileFactory:(parts,name,opts)=>new TestFile(parts,name,opts)});
  const session=createPreparedShareSession();
  session.prepare({shareId,files:verified});
  const {env,calls}=environment();
  await session.send({env});
  assert.equal(calls[1][1].files[0].name,'drawing.pdf');
  await assert.rejects(verifySharedFileIntegrity([new Blob(['reference byteX'],{type:'application/pdf'})],hashed.descriptors,
    {cryptoApi:webcrypto,fileFactory:(parts,name,opts)=>new TestFile(parts,name,opts)}),/checksum mismatch/);
});
test('UI uses a second explicit click and no await before sending prepared files',async()=>{
  const inbox=await readFile(new URL('../src/share-inbox.mjs',import.meta.url),'utf8');
  const block=inbox.slice(inbox.indexOf("if(button.dataset.share==='send-prepared')"),inbox.indexOf("if(button.dataset.share==='cancel-prepared')"));
  assert.ok(block.length>100);
  assert.match(block,/handoff.send\(\{env\}\)/);
  assert.doesNotMatch(block.split('handoff.send')[0],/\bawait\b/);
  assert.match(inbox,/await getIncomingShareFiles\(item.id\)/);
  assert.match(inbox,/data-share="send-prepared"/);
  assert.match(inbox,/handoff.clear\(\)/);
  assert.doesNotMatch(block,/removeIncomingShare/);
});
