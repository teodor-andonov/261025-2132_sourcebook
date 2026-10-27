import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTagLabel,mergeTagInput} from '../src/tags.mjs';
test('nested tag paths and Unicode',()=>{
  assert.equal(normalizeTagLabel('  #Architecture / Facades / Timber  '),'Architecture/Facades/Timber');
  assert.equal(normalizeTagLabel('  structural   design  '),'structural design');
  assert.equal(normalizeTagLabel('Бургас/Детайли'),'Бургас/Детайли');
});
test('comma input deduplicates case-insensitively',()=>{
  assert.deepEqual(mergeTagInput(['Architecture/Facades'],'#architecture / facades, Materials, materials, Timber'),['Architecture/Facades','Materials','Timber']);
});
test('empty input leaves legacy labels unchanged',()=>{
  const old=['Legacy tag','Old,unusual'];
  assert.deepEqual(mergeTagInput(old,'  ,  '),old);
  assert.deepEqual(old,['Legacy tag','Old,unusual']);
});
test('invalid path segments and controls are rejected',()=>{
  for(const value of ['','/Facades','Facades/','A//B','../B','A/../B','A/#B','##A','A\nB','A/B/C/D/E/F/G/H/I','x'.repeat(121)]){
    assert.throws(()=>normalizeTagLabel(value),{name:'Error'},value);
  }
});
test('64-tag limit does not mutate existing tags',()=>{
  const existing=Array.from({length:64},(_,i)=>'Tag '+i);
  assert.throws(()=>mergeTagInput(existing,'New tag'),/at most 64/);
  assert.equal(existing.length,64);
});
