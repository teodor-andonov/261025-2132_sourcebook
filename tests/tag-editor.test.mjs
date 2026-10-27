import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTagLabel,mergeTagInput} from '../src/tags.mjs';

test('tag editor uses the shared nested path normalization',()=>{
  assert.equal(normalizeTagLabel(' #Architecture / Facades / Timber '),'Architecture / Facades / Timber');
  assert.equal(normalizeTagLabel('Бургас/Детайли'),'Бургас / Детайли');
});
test('new labels deduplicate legacy slash spellings and case',()=>{
  assert.deepEqual(mergeTagInput(['Architecture/Facades'],'#architecture / facades, Materials, materials'),['Architecture/Facades','Materials']);
});
test('empty input preserves unusual existing labels unchanged',()=>{
  const old=['Legacy tag','Old,unusual'];
  assert.deepEqual(mergeTagInput(old,' , '),old);
  assert.deepEqual(old,['Legacy tag','Old,unusual']);
});
test('reject invalid paths, overly long names and excessive tags',()=>{
  for(const bad of ['', 'A//B','/B','A/','A\nB','x'.repeat(121)]){
    assert.throws(()=>normalizeTagLabel(bad),{name:'Error'},bad);
  }
  const old=Array.from({length:64},(_,i)=>'Tag '+i);
  assert.throws(()=>mergeTagInput(old,'New tag'),/at most 64/);
  assert.equal(old.length,64);
});
