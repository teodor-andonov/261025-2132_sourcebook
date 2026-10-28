import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planFileCapture} from '../src/file-capture.mjs';
import {makeCapturedShareFile,inspectFileShareCapability,shareCapturedPlan,shareIncomingFiles} from '../src/file-share-out.mjs';

class TestFile extends Blob{
  constructor(parts,name,options={}){super(parts,options);this.name=name;}
}
const settings={now:new Date('2026-10-28T18:27:00Z'),random:'abc123def4'};
const plan=planFileCapture({kind:'url',value:'https://example.org/reference'},settings);
function environment({canShare=true,share=async()=>{}}={}){
  const calls=[];
  return {env:{File:TestFile,navigator:{
    canShare(payload){calls.push(['canShare',payload]);return canShare;},
    async share(payload){calls.push(['share',payload]);return share(payload);}
  }},calls};
}
test('outbound .url is an actual File with exact Internet Shortcut bytes',async()=>{
  const f=makeCapturedShareFile(plan,{fileFactory:(...args)=>new TestFile(...args)});
  assert.equal(f.name,plan.name);
  assert.equal(f.type,'text/plain');
  assert.equal(await f.text(),plan.text);
});
test('outbound .md preserves Unicode and trailing newline',async()=>{
  const md=planFileCapture({kind:'text',value:'# Фасади\nБележка'},settings);
  const f=makeCapturedShareFile(md,{fileFactory:(...args)=>new TestFile(...args)});
  assert.ok(f.name.endsWith('.md'));
  assert.equal(f.type,'text/markdown');
  assert.equal(await f.text(),md.text);
});
test('malformed or non-file plans never reach share sheet',async()=>{
  const {env,calls}=environment();
  for(const invalid of [{...plan,name:'../unsafe.url'},{...plan,text:'URL=javascript:alert(1)'},{...plan,kind:'text'}]){
    await assert.rejects(shareCapturedPlan(invalid,{env}),/Invalid/);
  }
  assert.equal(calls.length,0);
});
test('API capability probe is synthetic and never invokes share',()=>{
  const {env,calls}=environment();
  assert.equal(inspectFileShareCapability(env).available,true);
  assert.deepEqual(calls.map(c=>c[0]),['canShare']);
  assert.equal(inspectFileShareCapability({navigator:{share(){}}}).available,false);
  assert.equal(inspectFileShareCapability(environment({canShare:false}).env).available,false);
});
test('explicit handoff passes files, never a text-only URL',async()=>{
  const {env,calls}=environment();
  const result=await shareCapturedPlan(plan,{env});
  assert.deepEqual(result,{delivery:'system-share',verified:false,count:1});
  const payload=calls.find(c=>c[0]==='share')[1];
  assert.equal(Object.keys(payload).join(','),'files');
  assert.equal(payload.files[0].name,plan.name);
});
test('unsupported file share fails without calling navigator.share',async()=>{
  const {env,calls}=environment({canShare:false});
  await assert.rejects(shareCapturedPlan(plan,{env}),/cannot share/);
  assert.deepEqual(calls.map(c=>c[0]),['canShare']);
});
test('cancelled or failed OS handoff is propagated, not called saved',async()=>{
  const error=Object.assign(Error('Cancelled'),{name:'AbortError'});
  const {env}=environment({share:async()=>{throw error;}});
  await assert.rejects(shareCapturedPlan(plan,{env}),e=>e===error);
});
test('incoming file batch uses exact original files without renaming or writing',async()=>{
  const a=new TestFile(['one'],'reference.pdf',{type:'application/pdf'});
  const b=new TestFile(['two'],'photo.png',{type:'image/png'});
  const {env,calls}=environment();
  const result=await shareIncomingFiles([a,b],{env});
  assert.equal(result.count,2);assert.equal(result.verified,false);
  assert.deepEqual(calls.find(c=>c[0]==='share')[1].files,[a,b]);
});
test('unsafe, colliding, empty incoming batches are rejected before handoff',async()=>{
  const {env,calls}=environment();
  await assert.rejects(shareIncomingFiles([],{env}),/No shared files/);
  await assert.rejects(shareIncomingFiles([new TestFile(['x'],'../bad.txt')],{env}),/Unsupported file name/);
  await assert.rejects(shareIncomingFiles([new TestFile(['x'],'A.txt'),new TestFile(['x'],'a.TXT')],{env}),/colliding names/);
  assert.equal(calls.length,0);
});
test('UI offers explicit file handoff but cannot clear pending shares on handoff',async()=>{
  const [app,inbox,sw,device]=await Promise.all(['app.mjs','share-inbox.mjs','../sw.js','device-readiness.mjs'].map(n=>readFile(new URL('../src/'+n,import.meta.url),'utf8')));
  assert.match(app,/data-delivery="share"/);
  assert.match(app,/shareCapturedPlan/);
  assert.match(inbox,/data-share="share-file"/);
  assert.match(inbox,/data-share="share-files"/);
  const handoff=inbox.slice(inbox.indexOf("['share-file','share-files']"),inbox.indexOf("button.dataset.share==='download-file'",inbox.indexOf("['share-file','share-files']")));
  assert.match(handoff,/getIncomingShareFiles/);
  assert.match(handoff,/handoff.prepare/);
  assert.match(inbox,/data-share="send-prepared"/);
  assert.doesNotMatch(handoff,/removeIncomingShare/);
  assert.match(device,/Web Share files \(API only\)/);
  assert.match(sw,/\.\/src\/file-share-out\.mjs/);
});
