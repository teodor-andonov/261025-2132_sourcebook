import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogTagResults} from '../src/catalog-search.mjs';
import {ensureTagPath} from '../src/tags.mjs';
const roots=[{id:'images',name:'Images'},{id:'papers',name:'Papers'}];
let i=0;const t1=ensureTagPath([],'Architecture/Facades/Timber',()=> 't'+(++i));
const t2=ensureTagPath(t1.tags,'Architecture/Roofs',()=> 't'+(++i));
const docs=[
  {id:'aa1',sourceId:'images',path:'gallery/canopy.png',kind:'file',tagIds:[t1.id]},
  {id:'aa2',sourceId:'papers',path:'reports/canopy.pdf',kind:'file',tagIds:[t1.id]},
  {id:'aa3',sourceId:'images',path:'roof.png',kind:'file',tagIds:[t2.id]}
];
test('catalog-wide tag search finds descendants across independent registered roots',()=>{
  const r=catalogTagResults(docs,roots,t2.tags,'#Architecture');
  assert.deepEqual(r.map(x=>[x.sourceId,x.path]),[['papers','reports/canopy.pdf'],['images','gallery/canopy.png'],['images','roof.png']]);
  assert.deepEqual(r.map(x=>x.parts),[['reports'],['gallery'],[]]);
  assert.equal(r[0].location,'Papers / reports');
});
test('exact tag branch does not include unrelated siblings or overlapping prefixes',()=>{
  const r=catalogTagResults(docs,roots,t2.tags,'Architecture/Facades');
  assert.equal(r.length,2);
  assert.deepEqual(catalogTagResults(docs,roots,t2.tags,'Architecture/Roofs').map(x=>x.name),['roof.png']);
});
test('legacy string tags remain searchable, without writing a catalog',()=>{
  const records=[{id:'ab7',sourceId:'images',path:'study.pdf',kind:'file',tags:['Concept/Sketch']}];
  const snapshot=JSON.stringify(records);
  assert.equal(catalogTagResults(records,roots,[], '#concept').length,1);
  assert.equal(JSON.stringify(records),snapshot);
});
test('invalid or unsupported paths and missing sources never create result entries',()=>{
  const records=[...docs,{sourceId:'images',path:'../other/file.png',kind:'file',tagIds:[t1.id]},
    {sourceId:'images',path:'C:\\windows\\test.png',kind:'file',tagIds:[t1.id]},
    {sourceId:'missing',path:'test.png',kind:'file',tagIds:[t1.id]},
    {sourceId:'images',path:'//escape.png',kind:'file',tagIds:[t1.id]}];
  assert.equal(catalogTagResults(records,roots,t2.tags,'Architecture/Facades').length,2);
  assert.throws(()=>catalogTagResults(records,roots,t2.tags,''),/Choose a tag/);
});
test('duplicate catalog source/path is presented once without mutation',()=>{
  const copy={...docs[0],id:'another-id'};
  const r=catalogTagResults([docs[0],copy],roots,t2.tags,'Architecture');
  assert.equal(r.length,1);
  assert.equal(r[0].record.id,'aa1');
});
test('results are deterministic despite input record enumeration order',()=>{
  const forward=catalogTagResults(docs,roots,t2.tags,'Architecture').map(x=>x.id);
  const reverse=catalogTagResults([...docs].reverse(),roots,t2.tags,'Architecture').map(x=>x.id);
  assert.deepEqual(forward,reverse);
});

test('ordinary .url shortcut files participate in Links Views without a fileless Catalog record',async()=>{
  const {catalogFileType,catalogQueryResults}=await import('../src/catalog-search.mjs');
  assert.equal(catalogFileType({kind:'file',name:'Reference.url'}),'url');
  assert.equal(catalogFileType({kind:'file',name:'Reference.md'}),'other');
  const results=catalogQueryResults([{id:'ab5',sourceId:'papers',path:'Reference.url',kind:'file',tagIds:[t1.id]}],
    roots,t2.tags,{fileType:'url',tagIds:[t1.id]});
  assert.equal(results.length,1);
  assert.equal(results[0].kind,'file');
  assert.equal(results[0].path,'Reference.url');
});
