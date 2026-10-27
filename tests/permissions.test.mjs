import test from 'node:test';
import assert from 'node:assert/strict';
import {authorized} from '../src/storage.mjs';

test('already-granted read permission never triggers a prompt',async()=>{
  let requests=0;
  const handle={queryPermission:async()=> 'granted',requestPermission:async()=>{requests++;return 'granted';}};
  assert.equal(await authorized(handle,'read'),true);
  assert.equal(requests,0);
});
test('write permission is requested only when explicitly checked',async()=>{
  const calls=[];
  const handle={queryPermission:async({mode})=>{calls.push('query:'+mode);return mode==='read'?'granted':'prompt';},requestPermission:async({mode})=>{calls.push('request:'+mode);return 'granted';}};
  assert.equal(await authorized(handle,'read'),true);
  assert.deepEqual(calls,['query:read']);
  assert.equal(await authorized(handle,'readwrite'),true);
  assert.deepEqual(calls,['query:read','query:readwrite','request:readwrite']);
});
test('permission denial is reported without throwing',async()=>{
  assert.equal(await authorized({queryPermission:async()=> 'prompt',requestPermission:async()=> 'denied'},'readwrite'),false);
});
test('unsupported permission API fails closed',async()=>{
  assert.equal(await authorized({queryPermission:async()=>{throw Error('unsupported');}},'read'),false);
});
