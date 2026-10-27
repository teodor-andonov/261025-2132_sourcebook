import test from 'node:test';
import assert from 'node:assert/strict';
import {plainRoot,PLAIN_ROOT_ID} from '../src/workspace.mjs';
test('standalone folder registration never mutates its handle',()=>{
  let writes=0;
  const handle={kind:'directory',name:'References',async *entries(){},getFileHandle(){writes++;}};
  assert.deepEqual(plainRoot(handle),{id:PLAIN_ROOT_ID,name:'References'});
  assert.equal(writes,0);
});
test('only readable directories are valid standalone roots',()=>{
  for(const handle of [null,{kind:'file',name:'a.png'},{kind:'directory',name:'broken'}])assert.throws(()=>plainRoot(handle),/directory/i);
});
