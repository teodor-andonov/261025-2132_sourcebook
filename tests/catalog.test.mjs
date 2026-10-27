import test from 'node:test';
import assert from 'node:assert/strict';
import {planResourceIdentity} from '../src/catalog.mjs';
const catalog=(nextSequence=1)=>({id:'catalog',code:'ab',nextSequence});
test('allocates first catalog-only ID without renaming',()=>{
  assert.deepEqual(planResourceIdentity(catalog(),[],'Facade.pdf',['Facade.pdf']),{id:'ab1',nextSequence:2,fromFilename:false});
});
test('skips record collisions even when nextSequence is stale',()=>{
  assert.equal(planResourceIdentity(catalog(),[{id:'ab1'},{id:'ab2'}],'Other.png').id,'ab3');
});
test('skips filename IDs found among sibling files',()=>{
  assert.equal(planResourceIdentity(catalog(),[],'Other.png',['Facade[ab1].pdf','Other.png']).id,'ab2');
});
test('adopts existing own token and advances sequence',()=>{
  assert.deepEqual(planResourceIdentity(catalog(3),[],'Facade[ab967][c5].pdf',['Facade[ab967][c5].pdf']),{id:'ab967',nextSequence:968,fromFilename:true});
});
test('does not conflate other catalog tokens',()=>{
  assert.equal(planResourceIdentity(catalog(),[],'Facade[c5].pdf',['Facade[c5].pdf']).id,'ab1');
});
test('rejects own duplicate tokens',()=>{
  assert.throws(()=>planResourceIdentity(catalog(),[],'Facade[ab1][ab2].pdf'),/Multiple identities/);
});
test('rejects record collision when same token belongs to another resource',()=>{
  assert.throws(()=>planResourceIdentity(catalog(),[{id:'ab9'}],'Facade[ab9].pdf'),/already belongs/);
});
test('rejects duplicate sibling filename identities',()=>{
  assert.throws(()=>planResourceIdentity(catalog(),[],'New.pdf',['A[ab1].pdf','B[ab1].png']),/Duplicate filename/);
});
test('rejects invalid catalog code',()=>{
  assert.throws(()=>planResourceIdentity({code:'a!'},[],'X.pdf'),/Invalid catalog/);
});
