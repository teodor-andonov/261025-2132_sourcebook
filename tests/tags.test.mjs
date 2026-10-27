import test from 'node:test';
import assert from 'node:assert/strict';
import {splitTagPath,normalizeTagPath,tagPath,ensureTagPath,recordTagPaths,flattenedTagTree,includesTagPath} from '../src/tags.mjs';
let sequence=0;const next=()=> 'tag-'+(++sequence);
test('nested slash paths normalize, hashtag syntax accepted',()=>{
  assert.deepEqual(splitTagPath('# Architecture / Facades / Timber'),['Architecture','Facades','Timber']);
  assert.equal(normalizeTagPath('Architecture/ Facades'),'Architecture / Facades');
});
test('stable hierarchical IDs and sibling deduplication',()=>{
  sequence=0;const a=ensureTagPath([],'Architecture / Facades / Timber',next);
  assert.equal(a.tags.length,3);
  const b=ensureTagPath(a.tags,'architecture / FACADES / timber',next);
  assert.equal(b.id,a.id);
  assert.equal(b.created,false);
  assert.equal(b.tags.length,3);
  const c=ensureTagPath(b.tags,'Design / Facades',next);
  assert.equal(c.tags.length,5);
  assert.notEqual(c.id,a.tags[1].id);
  assert.equal(tagPath(c.tags,a.id),'Architecture / Facades / Timber');
});
test('legacy plain-string tags remain readable',()=>{
  let id=0;
  const t=ensureTagPath([],'Architecture / Facades',()=> 'a'+(++id));
  assert.deepEqual(recordTagPaths({tagIds:['a2'],tags:['Landscape','Architecture / Facades']},t.tags),['Architecture / Facades','Landscape']);
});
test('tag tree preserves nesting',()=>{
  sequence=0;
  const x=ensureTagPath([],'Architecture / Facades',next);
  const y=ensureTagPath(x.tags,'Architecture / Roofs',next);
  assert.deepEqual(flattenedTagTree(y.tags).map(x=>[x.name,x.depth]),[['Architecture',0],['Facades',1],['Roofs',1]]);
});
test('filter root matches descendant but not similar word',()=>{
  assert.equal(includesTagPath(['Architecture / Facades / Timber'],'Architecture'),true);
  assert.equal(includesTagPath(['Architecture / Facades / Timber'],'Architecture / Roofs'),false);
  assert.equal(includesTagPath(['Architecture II'],'Architecture'),false);
});
test('reject invalid paths',()=>{
  assert.throws(()=>splitTagPath('Architecture//Timber'));
  assert.throws(()=>ensureTagPath([],'Materials / '));
});
