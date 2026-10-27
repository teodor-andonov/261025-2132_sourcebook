import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySourceIndex,sourceIndexKey,validateSourceIndex,restoreSourceIndex,refreshSourceIndex,sourceIndexOverlay,SOURCE_INDEX_LIMIT} from '../src/source-index.mjs';
import {catalogQueryWithScan} from '../src/catalog-search.mjs';
function handle(key){
  return {kind:'directory',name:key,async isSameEntry(other){return other?.key===key;},key};
}
const a=handle('physical-a'),b=handle('physical-b');
const sources=[{id:'a',name:'Images'},{id:'b',name:'Papers'}];
const map=new Map([['a',a],['b',b]]);
const file=(sourceId,path,kind='file')=>({sourceId,path,kind});
const scan=(entries,completeRootIds,problems=[])=>({entries,completeRootIds,problems,cancelled:false});
test('device index uses a catalog-scoped key and rejects foreign or malformed caches',()=>{
  assert.equal(sourceIndexKey('cat-1'),'source-index-v1:cat-1');
  assert.throws(()=>sourceIndexKey(''),/identity/);
  const empty=emptySourceIndex('cat-1');
  assert.deepEqual(validateSourceIndex(empty,'cat-1',new Set(['a','b'])),empty);
  assert.throws(()=>validateSourceIndex(empty,'cat-2',new Set(['a'])),/foreign/);
  assert.throws(()=>validateSourceIndex({version:1,catalogId:'cat-1',roots:[{sourceId:'a',handle:a,scannedAt:1,entries:[file('a','../bad')]}]},'cat-1',new Set(['a'])),/path/);
  assert.throws(()=>validateSourceIndex({version:1,catalogId:'cat-1',roots:[{sourceId:'a',handle:a,scannedAt:1,entries:[file('a','x'),file('a','x')]}]},'cat-1',new Set(['a'])),/duplicate/);
});
test('initial complete scan produces a bounded device snapshot without touching files',()=>{
  const original=emptySourceIndex('cat');
  const result=refreshSourceIndex(original,scan([file('a','images'),file('a','images/one.png')],['a']),['a'],map,1000);
  assert.equal(original.roots.length,0);
  assert.deepEqual(result.changes,[{sourceId:'a',initial:true,added:0,removed:0,typeChanged:0}]);
  assert.equal(result.index.roots[0].handle,a);
  assert.equal(result.index.roots[0].scannedAt,1000);
  assert.deepEqual(sourceIndexOverlay(result.index,{freshRootIds:['a']}).completeRootIds,['a']);
  assert.throws(()=>refreshSourceIndex(original,scan([file('a','x')],['a']),['a'],new Map([['a',{kind:'directory'}]])),/verify/);
});
test('targeted refresh keeps other root and reports path deltas, including type drift',()=>{
  let index=refreshSourceIndex(emptySourceIndex('cat'),scan([file('a','old'),file('a','switch'),file('b','keep')],['a','b']),['a','b'],map,100).index;
  const result=refreshSourceIndex(index,scan([file('a','new'),file('a','switch','directory')],['a']),['a'],map,200);
  assert.equal(result.index.roots.find(r=>r.sourceId==='b').entries[0].path,'keep');
  assert.deepEqual(result.changes,[{sourceId:'a',initial:false,added:1,removed:1,typeChanged:1}]);
  assert.deepEqual(sourceIndexOverlay(result.index,{freshRootIds:['a']}).staleRootIds,['b']);
});
test('partial scan retains old snapshot but never asserts missing',()=>{
  const index=refreshSourceIndex(emptySourceIndex('cat'),scan([file('a','retained.pdf')],['a']),['a'],map,100).index;
  const result=refreshSourceIndex(index,scan([],[],['permission denied']),['a'],map,200);
  assert.deepEqual(result.index.roots[0].entries,[file('a','retained.pdf')]);
  const overlay=sourceIndexOverlay(result.index,{freshRootIds:['a'],partialRootIds:result.partialRootIds,problems:result.problems});
  assert.deepEqual(overlay.completeRootIds,[]);
  assert.deepEqual(overlay.staleRootIds,['a']);
  assert.deepEqual(overlay.problems,['permission denied']);
  const cataloged=[{id:'ab1',sourceId:'a',path:'missing.pdf',kind:'file'}];
  const results=catalogQueryWithScan(cataloged,sources,[],{},overlay);
  assert.equal(results.find(x=>x.name==='missing.pdf').missing,false);
  assert.equal(results.find(x=>x.name==='retained.pdf').staleIndex,true);
});
test('partial new root remains transient and does not become a persisted complete root',()=>{
  const result=refreshSourceIndex(emptySourceIndex('cat'),scan([file('b','partial.txt')],[],['read failed']),['b'],map,100);
  assert.deepEqual(result.index.roots,[]);
  assert.deepEqual(result.partialEntries,[file('b','partial.txt')]);
  const overlay=sourceIndexOverlay(result.index,{partialRootIds:result.partialRootIds,partialEntries:result.partialEntries});
  assert.equal(overlay.entries.length,1);
  assert.deepEqual(overlay.completeRootIds,[]);
  assert.deepEqual(overlay.staleRootIds,['b']);
});
test('restoring a cache requires isSameEntry; same names and IDs are insufficient',async()=>{
  const index=refreshSourceIndex(emptySourceIndex('cat'),scan([file('a','study.png'),file('b','paper.pdf')],['a','b']),['a','b'],map,100).index;
  const restored=await restoreSourceIndex(index,'cat',sources,new Map([['a',handle('physical-a')],['b',handle('different-root')]]));
  assert.deepEqual(restored.index.roots.map(r=>r.sourceId),['a']);
  assert.deepEqual(restored.skippedRootIds,['b']);
  assert.deepEqual(sourceIndexOverlay(restored.index).completeRootIds,[]);
  assert.deepEqual(sourceIndexOverlay(restored.index).staleRootIds,['a']);
  const noProof=await restoreSourceIndex(index,'cat',sources,new Map([['a',{kind:'directory',name:'physical-a'}]]));
  assert.deepEqual(noProof.index.roots,[]);
  assert.deepEqual(noProof.skippedRootIds,['a','b']);
});
test('cache cannot claim a missing path until a fresh complete scan this session',async()=>{
  const index=refreshSourceIndex(emptySourceIndex('cat'),scan([file('a','present.png')],['a']),['a'],map,100).index;
  const restored=await restoreSourceIndex(index,'cat',sources,map);
  const record=[{id:'ab1',sourceId:'a',path:'lost.pdf',kind:'file'}];
  const cached=catalogQueryWithScan(record,sources,[],{},sourceIndexOverlay(restored.index));
  assert.equal(cached.find(x=>x.name==='lost.pdf').missing,false);
  assert.equal(cached.find(x=>x.name==='present.png').staleIndex,true);
  const fresh=catalogQueryWithScan(record,sources,[],{},sourceIndexOverlay(restored.index,{freshRootIds:['a']}));
  assert.equal(fresh.find(x=>x.name==='lost.pdf').missing,true);
  assert.equal(fresh.find(x=>x.name==='present.png').staleIndex,false);
});
test('invalid scans cannot poison existing snapshots',()=>{
  const index=emptySourceIndex('cat');
  assert.throws(()=>refreshSourceIndex(index,scan([file('b','foreign')],['a']),['a'],map),/entry/);
  assert.throws(()=>refreshSourceIndex(index,scan([file('a','x'),file('a','x')],['a']),['a'],map),/Duplicate/);
  assert.throws(()=>refreshSourceIndex(index,{entries:[],completeRootIds:['a'],cancelled:true},['a'],map),/cancelled/);
  assert.throws(()=>refreshSourceIndex(index,scan([],['b']),['a'],map),/Incomplete/);
  assert.throws(()=>refreshSourceIndex(index,scan([],['a']),['a','a'],map),/targets/);
  assert.ok(SOURCE_INDEX_LIMIT>=50000);
});

test('stale table metadata explicitly labels restored cached entries',async()=>{
  const {viewTableMetadata}=await import('../src/view-layout.mjs');
  assert.equal(viewTableMetadata({name:'one.pdf',kind:'file',unobjectified:true,staleIndex:true}).status,'Cached · refresh');
  assert.equal(viewTableMetadata({name:'one.pdf',kind:'file',unobjectified:true,staleIndex:false}).status,'Not cataloged');
  assert.equal(viewTableMetadata({name:'one.pdf',kind:'file',missing:true,staleIndex:true}).status,'Missing');
});
test('partial refresh of another root never deletes its previously indexed entries',()=>{
  let index=refreshSourceIndex(emptySourceIndex('cat'),scan([file('a','one'),file('b','two')],['a','b']),['a','b'],map,100).index;
  const updated=refreshSourceIndex(index,scan([file('b','incomplete')],[],['disconnected']),['b'],map,200);
  assert.deepEqual(updated.index.roots.find(r=>r.sourceId==='b').entries,[file('b','two')]);
  assert.deepEqual(updated.index.roots.find(r=>r.sourceId==='a').entries,[file('a','one')]);
  assert.deepEqual(sourceIndexOverlay(updated.index,{freshRootIds:['a'],partialRootIds:updated.partialRootIds}).completeRootIds,['a']);
});
