import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectIndexedRootOverlaps,physicalResultKey,collapseVerifiedOverlaps} from '../src/source-overlap.mjs';
import {catalogQueryWithScan} from '../src/catalog-search.mjs';
import {viewTableMetadata} from '../src/view-layout.mjs';
function folder(name,key,children={}){
  const h={kind:'directory',name,key,
    async queryPermission({mode}){assert.equal(mode,'read');return 'granted';},
    async isSameEntry(other){return other?.key===key;},
    async getDirectoryHandle(part){if(!Object.hasOwn(children,part))throw Object.assign(Error('Not found'),{name:'NotFoundError'});return children[part];}
  };
  return h;
}
const leaf=folder('Nested','physical-nested');
const outer=folder('Outer','physical-outer',{Nested:leaf});
const unrelated=folder('Nested','other-physical');
const sources=[{id:'a',name:'Outer'},{id:'b',name:'Nested'}];
const entry=(sourceId,path,kind='file')=>({sourceId,path,kind});
const indexed=(roots)=>({roots:roots.map(([sourceId,handle,entries])=>({sourceId,handle,entries}))});
test('overlap proof uses live directory identity, not matching root names',async()=>{
  const index=indexed([['a',outer,[entry('a','Nested','directory'),entry('a','Nested/file.pdf')]],['b',leaf,[entry('b','file.pdf')]]]);
  const handles=new Map([['a',outer],['b',leaf]]);
  const result=await inspectIndexedRootOverlaps(index,handles);
  assert.deepEqual(result.overlaps,[{ancestorId:'a',descendantId:'b',prefix:'Nested'}]);
  assert.deepEqual(result.problems,[]);
  const wrong=await inspectIndexedRootOverlaps(index,new Map([['a',outer],['b',unrelated]]));
  assert.deepEqual(wrong.overlaps,[]);
  assert.ok(wrong.problems.length);
});
test('a stale candidate path or missing read permission never establishes overlap',async()=>{
  const moved=folder('Outer','physical-outer',{Nested:unrelated});
  const index=indexed([['a',moved,[entry('a','Nested','directory')]],['b',leaf,[]]]);
  assert.deepEqual((await inspectIndexedRootOverlaps(index,new Map([['a',moved],['b',leaf]]))).overlaps,[]);
  const denied={...outer,async queryPermission(){return 'prompt';}};
  assert.deepEqual((await inspectIndexedRootOverlaps(indexed([['a',outer,[entry('a','Nested','directory')]],['b',leaf,[]]]),new Map([['a',denied],['b',leaf]]))).overlaps,[]);
});
test('same physical root uses deterministic source IDs; unrelated same names stay separate',async()=>{
  const alias=folder('Outer','physical-outer');
  const index=indexed([['z',outer,[]],['a',alias,[]],['x',unrelated,[]]]);
  const proof=await inspectIndexedRootOverlaps(index,new Map([['z',outer],['a',alias],['x',unrelated]]));
  assert.deepEqual(proof.overlaps,[{ancestorId:'a',descendantId:'z',prefix:''}]);
  assert.equal(physicalResultKey(entry('z','file.png'),proof.overlaps).key,'a\u0000file.png');
  assert.equal(physicalResultKey(entry('x','file.png'),proof.overlaps).key,'x\u0000file.png');
});
test('candidate and comparison limits fail closed without filesystem mutation',async()=>{
  const index=indexed([['a',outer,[entry('a','Nested','directory'),entry('a','x/Nested','directory')]],['b',leaf,[]]]);
  const proof=await inspectIndexedRootOverlaps(index,new Map([['a',outer],['b',leaf]]),{maxCandidates:1});
  assert.deepEqual(proof.overlaps,[]);
  assert.match(proof.problems.join(' '),/Too many/);
  await assert.rejects(inspectIndexedRootOverlaps(index,new Map(),{maxCandidates:0}),/Invalid/);
});
test('global Views deduplicate only verified unobjectified paths, preserving nearest root',()=>{
  const overlaps=[{ancestorId:'a',descendantId:'b',prefix:'Nested'}];
  const records=[];
  const scan={entries:[entry('a','Nested/file.pdf'),entry('b','file.pdf')],completeRootIds:['a','b'],overlaps};
  const found=catalogQueryWithScan(records,sources,[],{},scan);
  assert.equal(found.length,1);
  assert.equal(found[0].sourceId,'b');
  assert.equal(found[0].unobjectified,true);
  assert.equal(catalogQueryWithScan(records,sources,[],{sourceId:'a'},scan).length,1);
  assert.equal(catalogQueryWithScan(records,sources,[],{sourceId:'b'},scan).length,1);
  assert.equal(catalogQueryWithScan(records,sources,[],{}, {...scan,overlaps:[]}).length,2);
});
test('cataloged metadata is preferred, without changing its original source binding',()=>{
  const overlaps=[{ancestorId:'a',descendantId:'b',prefix:'Nested'}];
  const record={id:'ab1',sourceId:'a',path:'Nested/file.pdf',kind:'file',tagIds:[]};
  const scan={entries:[entry('a','Nested/file.pdf'),entry('b','file.pdf')],completeRootIds:['a','b'],overlaps};
  const found=catalogQueryWithScan([record],sources,[],{},scan);
  assert.equal(found.length,1);
  assert.equal(found[0].record,record);
  assert.equal(found[0].sourceId,'a');
  assert.equal(catalogQueryWithScan([record],sources,[],{fileStatus:'unobjectified'},scan).length,0);
});
test('two independently cataloged metadata records are NEVER silently merged',()=>{
  const overlaps=[{ancestorId:'a',descendantId:'b',prefix:'Nested'}];
  const records=[{id:'ab1',sourceId:'a',path:'Nested/file.pdf',kind:'file',tagIds:[]},
    {id:'ab2',sourceId:'b',path:'file.pdf',kind:'file',tagIds:[]}];
  const scan={entries:[entry('a','Nested/file.pdf'),entry('b','file.pdf')],completeRootIds:['a','b'],overlaps};
  const found=catalogQueryWithScan(records,sources,[],{},scan);
  assert.equal(found.length,2);
  assert.ok(found.every(x=>x.overlapConflict));
  assert.equal(viewTableMetadata(found[0]).status,'Overlap · review metadata');
  assert.equal(catalogQueryWithScan(records,sources,[],{sourceId:'a'},scan)[0].overlapConflict,undefined);
});
test('missing/type-drift and mismatched kinds remain visible instead of being hidden',()=>{
  const overlaps=[{ancestorId:'a',descendantId:'b',prefix:'Nested'}];
  const records=[{id:'ab1',sourceId:'a',path:'Nested/file.pdf',kind:'file'}];
  const scan={entries:[entry('b','file.pdf')],completeRootIds:['a','b'],overlaps};
  const found=catalogQueryWithScan(records,sources,[],{},scan);
  assert.equal(found.length,2);
  assert.ok(found.every(x=>x.overlapConflict));
  assert.equal(found.find(x=>x.record).missing,true);
  const kinds=collapseVerifiedOverlaps([{...entry('a','Nested/x'),record:null,unobjectified:true},
    {...entry('b','x','directory'),record:null,unobjectified:true}],overlaps);
  assert.equal(kinds.length,2);
});
test('fresh scan wins over stale nested cache; transitive ancestry resolves stable physical keys',()=>{
  const edges=[{ancestorId:'a',descendantId:'b',prefix:'Nested'},
    {ancestorId:'b',descendantId:'c',prefix:'Deep'}];
  assert.equal(physicalResultKey(entry('c','file.png'),edges).key,'a\u0000Nested/Deep/file.png');
  const values=[{...entry('a','Nested/file.png'),record:null,unobjectified:true,staleIndex:false},
    {...entry('b','file.png'),record:null,unobjectified:true,staleIndex:true}];
  assert.equal(collapseVerifiedOverlaps(values,edges)[0].sourceId,'a');
  const before=JSON.stringify(values);
  collapseVerifiedOverlaps(values,edges);
  assert.equal(JSON.stringify(values),before);
});
