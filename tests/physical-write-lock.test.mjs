import test from 'node:test';
import assert from 'node:assert/strict';
import {PHYSICAL_WRITE_LOCK,withPhysicalWriteLock} from '../src/physical-write-lock.mjs';

test('same-origin write lock serializes concurrent operations',async()=>{
  let previous=Promise.resolve();
  const requests=[];
  const locks={request(name,options,callback){
    requests.push({name,mode:options.mode});
    const wait=previous;
    let release;
    previous=new Promise(resolve=>{release=resolve;});
    return wait.then(async()=>{try{return await callback({name});}finally{release();}});
  }};
  const order=[];
  let unblock;
  const first=withPhysicalWriteLock(async()=>{
    order.push('first start');
    await new Promise(resolve=>{unblock=resolve;});
    order.push('first end');return 1;
  },{locks});
  await Promise.resolve();await Promise.resolve();
  const second=withPhysicalWriteLock(async()=>{order.push('second start');return 2;},{locks});
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(order,['first start']);
  unblock();
  assert.deepEqual(await Promise.all([first,second]),[1,2]);
  assert.deepEqual(order,['first start','first end','second start']);
  assert.deepEqual(requests,[{name:PHYSICAL_WRITE_LOCK,mode:'exclusive'},{name:PHYSICAL_WRITE_LOCK,mode:'exclusive'}]);
});
test('failed writer does not poison later requests',async()=>{
  let requests=0;
  const locks={async request(_name,_options,callback){requests++;return callback({name:PHYSICAL_WRITE_LOCK});}};
  await assert.rejects(withPhysicalWriteLock(()=>{throw Error('write failed');},{locks}),/write failed/);
  assert.equal(await withPhysicalWriteLock(()=>42,{locks}),42);
  assert.equal(requests,2);
});
test('abort before acquiring a lock does not execute writer',async()=>{
  const controller=new AbortController();controller.abort();
  let wrote=false;
  await assert.rejects(withPhysicalWriteLock(()=>{wrote=true;},{signal:controller.signal}),/cancelled/);
  assert.equal(wrote,false);
});
test('unsupported Web Locks retains existing guarded fallback',async()=>{
  assert.equal(await withPhysicalWriteLock(()=> 'fallback',{locks:null}),'fallback');
  await assert.rejects(withPhysicalWriteLock(null,{locks:null}),/required/);
});
