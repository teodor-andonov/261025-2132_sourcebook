import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTagLabel,mergeTagInput,ensureTagPath,suggestTagPaths,nextTagSuggestionIndex} from '../src/tags.mjs';

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

test('hashtag suggestions find nested existing paths without creating tags',()=>{
  let n=0;
  const a=ensureTagPath([],'Generative / Geometry',()=> 't'+(++n));
  const b=ensureTagPath(a.tags,'Materials / Timber',()=> 't'+(++n));
  const before=JSON.stringify(b.tags);
  assert.deepEqual(suggestTagPaths(b.tags,[],'#generative/geo').map(t=>t.path),['Generative / Geometry']);
  assert.deepEqual(suggestTagPaths(b.tags,[],'#TIMBER').map(t=>t.path),['Materials / Timber']);
  assert.equal(suggestTagPaths(b.tags,[],'').length,0);
  assert.equal(suggestTagPaths(b.tags,[],'#').length,4);
  assert.deepEqual(suggestTagPaths(b.tags,['materials/timber'],'#timber'),[]);
  assert.deepEqual(suggestTagPaths(b.tags,[],'#not-a-tag'),[]);
  assert.equal(JSON.stringify(b.tags),before);
});
test('arrow navigation enters, wraps and handles empty tag suggestions',()=>{
  assert.equal(nextTagSuggestionIndex(-1,1,3),0);
  assert.equal(nextTagSuggestionIndex(-1,-1,3),2);
  assert.equal(nextTagSuggestionIndex(2,1,3),0);
  assert.equal(nextTagSuggestionIndex(0,-1,3),2);
  assert.equal(nextTagSuggestionIndex(0,1,0),-1);
});
