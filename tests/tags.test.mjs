import test from 'node:test';
import assert from 'node:assert/strict';
import {splitTagPath,normalizeTagPath,tagPath,ensureTagPath,recordTagPaths,flattenedTagTree,includesTagPath,matchesResourceSearch} from '../src/tags.mjs';
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

test('current-folder search finds names and stable-ID nested tag paths',()=>{
  let n=0;
  const t=ensureTagPath([],'Architecture / Facades / Timber',()=> 'stable-'+(++n));
  const paths=recordTagPaths({tagIds:[t.id]},t.tags);
  assert.equal(matchesResourceSearch('Envelope Study.svg',paths,'envelope'),true);
  assert.equal(matchesResourceSearch('Envelope Study.svg',paths,'Timber'),true);
  assert.equal(matchesResourceSearch('Envelope Study.svg',paths,'#timber'),true);
  assert.equal(matchesResourceSearch('Envelope Study.svg',paths,'#ARCHITECTURE/facades'),true);
  assert.equal(matchesResourceSearch('Envelope Study.svg',paths,'#envelope'),false);
  assert.equal(matchesResourceSearch('Envelope Study.svg',paths,'#roofs'),false);
});
test('tag-only search supports legacy labels and excludes untagged files',()=>{
  const paths=recordTagPaths({tags:['Design / Canopies']},[]);
  assert.equal(matchesResourceSearch('Study.pdf',paths,'#canop'),true);
  assert.equal(matchesResourceSearch('Study.pdf',paths,'design/canopies'),true);
  assert.equal(matchesResourceSearch('Study.pdf',paths,'#'),true);
  assert.equal(matchesResourceSearch('Study.pdf',[],'#'),false);
  assert.equal(matchesResourceSearch('Study.pdf',[],'study'),true);
  assert.equal(matchesResourceSearch('Study.pdf',[],' '),true);
});

import {toggleTagPin,pinnedTagShortcuts} from '../src/tags.mjs';
test('pinning nested tags retains IDs and never creates separate memberships',()=>{
  let n=0;
  const original=ensureTagPath([],'Collections / Temp-01',()=> 'id-'+(++n));
  const pinned=toggleTagPin(original.tags,original.id);
  assert.equal(original.tags.some(x=>x.pinned),false);
  assert.equal(pinned.length,original.tags.length);
  assert.deepEqual(pinnedTagShortcuts(pinned).map(t=>[t.id,t.path]),[[original.id,'Collections / Temp-01']]);
  assert.deepEqual(toggleTagPin(pinned,original.id),original.tags);
});
test('pin shortcuts preserve hierarchy, resource tag references and legacy catalogs',()=>{
  let n=0;
  const a=ensureTagPath([],'Architecture / Facades / Timber',()=> 'p-'+(++n));
  const b=ensureTagPath(a.tags,'Architecture / Roofs',()=> 'p-'+(++n));
  const pinned=toggleTagPin(toggleTagPin(b.tags,a.id),b.id);
  assert.deepEqual(recordTagPaths({tagIds:[a.id]},pinned),['Architecture / Facades / Timber']);
  assert.deepEqual(pinnedTagShortcuts(pinned).map(t=>t.path),['Architecture / Facades / Timber','Architecture / Roofs']);
  assert.deepEqual(flattenedTagTree(pinned).map(t=>t.id),flattenedTagTree(b.tags).map(t=>t.id));
  assert.deepEqual(pinnedTagShortcuts(b.tags),[]);
  assert.throws(()=>toggleTagPin(pinned,'missing'));
  assert.throws(()=>toggleTagPin([{id:'duplicate'},{id:'duplicate'}],'duplicate'));
});

import {assertTagSnapshotUnchanged} from '../src/tags.mjs';
test('catalog save refuses stale tag snapshots without changing either taxonomy',()=>{
  let n=0;
  const current=ensureTagPath([],'Architecture / Facades',()=> 'stable-'+(++n)).tags;
  const disk=current.map(t=>({...t}));
  assert.doesNotThrow(()=>assertTagSnapshotUnchanged(current,disk));
  const renamed=disk.map(t=>t.name==='Facades'?{...t,name:'Envelopes'}:t);
  assert.throws(()=>assertTagSnapshotUnchanged(current,renamed),/Tags changed on disk/);
  const repinned=disk.map(t=>({...t,pinned:true}));
  assert.throws(()=>assertTagSnapshotUnchanged(current,repinned),/Tags changed on disk/);
  const external=[...disk,{id:'new-external',name:'Material',parentId:null}];
  assert.throws(()=>assertTagSnapshotUnchanged(current,external),/Tags changed on disk/);
  assert.throws(()=>assertTagSnapshotUnchanged(current,null),/Tags changed on disk/);
  assert.deepEqual(current,disk);
  assert.equal(current.some(t=>t.name==='Envelopes'),false);
});
