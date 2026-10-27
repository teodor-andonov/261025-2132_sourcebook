import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOverlapRecordReview,verifyOverlapRecordBindings} from '../src/overlap-review.mjs';
import {inspectIndexedRootOverlaps} from '../src/source-overlap.mjs';

const overlaps=[{ancestorId:'outer',descendantId:'inner',prefix:'Nested'}];
const sources=[{id:'outer',name:'Projects'},{id:'inner',name:'References'}];
const records=[
  {id:'ab1',sourceId:'outer',path:'Nested/photo.jpg',kind:'file',tagIds:['tag-a'],notes:'A'},
  {id:'ab2',sourceId:'inner',path:'photo.jpg',kind:'file',tagIds:['tag-b'],notes:'B'}
];
const tags=[{id:'tag-a',name:'Architecture',parentId:null},{id:'tag-b',name:'Detail',parentId:null}];
function handle(kind,name,key,children={}){
  return {kind,name,key,
    async queryPermission({mode}){assert.equal(mode,'read');return 'granted';},
    async isSameEntry(other){return other?.key===key;},
    async getDirectoryHandle(part){const next=children[part];if(next?.kind==='directory')return next;throw Object.assign(Error('Missing'),{name:'NotFoundError'});},
    async getFileHandle(part){const next=children[part];if(next?.kind==='file')return next;throw Object.assign(Error('Missing'),{name:'NotFoundError'});}
  };
}
test('review compares all Catalog records under a verified root mapping, without mutating input',()=>{
  const before=JSON.stringify({records,sources,tags,overlaps});
  const report=buildOverlapRecordReview(records,sources,tags,overlaps);
  assert.equal(report.counts.groups,1);
  assert.equal(report.counts.differing,1);
  assert.deepEqual(report.groups[0].flags,['Notes differ','Tags differ']);
  assert.equal(report.groups[0].records[0].sourceName,'References');
  assert.equal(report.groups[0].records[1].sourceName,'Projects');
  assert.equal(report.groups[0].records[0].tagPaths.length,1);
  assert.equal(JSON.stringify({records,sources,tags,overlaps}),before);
});
test('same names and paths in unrelated Folders do not become overlap groups',()=>{
  const report=buildOverlapRecordReview(records,sources,tags,[]);
  assert.equal(report.counts.groups,0);
});
test('matching metadata is reported without proposing deletion or a winner',()=>{
  const same=records.map(r=>({...r,notes:'Same',tagIds:['tag-a']}));
  const report=buildOverlapRecordReview(same,sources,tags,overlaps);
  assert.equal(report.groups[0].status,'metadata-matches');
  assert.deepEqual(report.groups[0].flags,[]);
  assert.equal(report.groups[0].records.length,2);
});
test('review detects type, extra metadata and unresolved Tag differences',()=>{
  const changed=[{...records[0],kind:'directory',rating:3,tagIds:['unknown']},
    {...records[1],rating:4,notes:'A',tagIds:['tag-b']}];
  const report=buildOverlapRecordReview(changed,sources,tags,overlaps);
  assert.ok(report.groups[0].flags.includes('Kinds differ'));
  assert.ok(report.groups[0].flags.includes('Other metadata differs'));
  assert.ok(report.groups[0].flags.includes('Missing Tag references'));
});
test('invalid IDs, paths, duplicate records and oversized reviews fail closed',()=>{
  assert.throws(()=>buildOverlapRecordReview([...records,records[0]],sources,tags,overlaps),/duplicate Catalog resource/);
  assert.throws(()=>buildOverlapRecordReview([{...records[0],path:'../bad'}],sources,tags,overlaps),/Invalid/);
  assert.throws(()=>buildOverlapRecordReview(records,sources,tags,overlaps,{maxRecords:1}),/oversized/);
  assert.throws(()=>buildOverlapRecordReview(records,sources,tags,overlaps,{maxGroups:0}),/Invalid/);
});
test('same live file handles confirm an overlap without requesting writes',async()=>{
  const file=handle('file','photo.jpg','physical-photo');
  const nested=handle('directory','Nested','physical-nested',{'photo.jpg':file});
  const outer=handle('directory','Projects','physical-outer',{Nested:nested});
  const inner=handle('directory','References','physical-nested',{'photo.jpg':file});
  const index={roots:[
    {sourceId:'outer',handle:outer,entries:[{sourceId:'outer',path:'Nested',kind:'directory'}]},
    {sourceId:'inner',handle:inner,entries:[]}
  ]};
  const proof=await inspectIndexedRootOverlaps(index,new Map([['outer',outer],['inner',inner]]));
  assert.equal(proof.overlaps.length,1);
  const report=buildOverlapRecordReview(records,sources,tags,proof.overlaps);
  const checked=await verifyOverlapRecordBindings(report,new Map([['outer',outer],['inner',inner]]));
  assert.equal(checked.groups[0].binding,'same-entry');
  assert.equal(checked.counts.verified,1);
});
test('different live files, missing paths and permission loss remain explicit',async()=>{
  const fileA=handle('file','photo.jpg','a');
  const fileB=handle('file','photo.jpg','b');
  const nested=handle('directory','Nested','nested',{'photo.jpg':fileA});
  const outer=handle('directory','Projects','outer',{Nested:nested});
  const inner=handle('directory','References','inner',{'photo.jpg':fileB});
  const report=buildOverlapRecordReview(records,sources,tags,overlaps);
  const different=await verifyOverlapRecordBindings(report,new Map([['outer',outer],['inner',inner]]));
  assert.equal(different.groups[0].binding,'different-entry');
  assert.equal(different.counts.different,1);
  const missing=await verifyOverlapRecordBindings(report,new Map([['outer',outer],['inner',handle('directory','References','inner',{})]]));
  assert.equal(missing.groups[0].binding,'missing');
  const denied={...inner,async queryPermission(){return 'prompt';}};
  const disconnected=await verifyOverlapRecordBindings(report,new Map([['outer',outer],['inner',denied]]));
  assert.equal(disconnected.groups[0].binding,'unverified');
  assert.equal(disconnected.counts.unresolved,1);
  await assert.rejects(verifyOverlapRecordBindings(report,new Map(),{maxEntries:1}),/limit/);
});
test('read-only inspection refuses to invent file identity when isSameEntry is unavailable',async()=>{
  const bareFile={kind:'file',name:'photo.jpg'};
  const nested=handle('directory','Nested','nested',{'photo.jpg':bareFile});
  const outer=handle('directory','Projects','outer',{Nested:nested});
  const inner=handle('directory','References','inner',{'photo.jpg':bareFile});
  const report=buildOverlapRecordReview(records,sources,tags,overlaps);
  assert.equal((await verifyOverlapRecordBindings(report,new Map([['outer',outer],['inner',inner]]))).groups[0].binding,'unverified');
});
