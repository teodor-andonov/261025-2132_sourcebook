import test from 'node:test';
import assert from 'node:assert/strict';
import {scanRegisteredSubfolder} from '../src/source-scan.mjs';
import {emptySourceIndex,refreshSourceIndex,refreshSourceSubtreeIndex,assertIndexedRootIdentity,sourceIndexOverlay,restoreSourceIndex} from '../src/source-index.mjs';
import {catalogQueryWithScan} from '../src/catalog-search.mjs';

function directory(name,children=[],key=name){
  const self={kind:'directory',name,key,
    async queryPermission({mode}){assert.equal(mode,'read');return 'granted';},
    async isSameEntry(other){return other?.key===key;},
    async getDirectoryHandle(part){
      const child=children.find(x=>x.name===part&&x.kind==='directory');
      if(!child)throw Object.assign(Error('Folder missing'),{name:'NotFoundError'});
      return child;
    },
    async *entries(){for(const child of children)yield [child.name,child];}
  };
  return self;
}
const file=name=>({name,kind:'file'});
const entry=(path,kind='file')=>({sourceId:'a',path,kind});
const source={id:'a',name:'Images'};
const full=(entries,complete=['a'])=>({entries,completeRootIds:complete,cancelled:false,problems:[]});
function seeded(root){
  const handles=new Map([['a',root]]);
  const index=refreshSourceIndex(emptySourceIndex('cat'),full([
    entry('gallery','directory'),entry('gallery/old.png'),entry('gallery/swap','file'),
    entry('elsewhere','directory'),entry('elsewhere/keep.pdf')
  ]),['a'],handles,100).index;
  return {index,handles};
}
test('targeted read-only scan resolves an existing subfolder and prefixes all entries',async()=>{
  const nested=directory('nested',[file('inner.svg')]);
  const gallery=directory('gallery',[file('new.png'),nested]);
  const root=directory('Images',[gallery,file('outside.pdf')]);
  const scanned=await scanRegisteredSubfolder(source,root,'gallery');
  assert.deepEqual(scanned.entries.map(x=>x.path),['gallery','gallery/new.png','gallery/nested','gallery/nested/inner.svg']);
  assert.deepEqual(scanned.completeRootIds,[]);
  assert.deepEqual(scanned.completeSubtreePaths,[{sourceId:'a',path:'gallery'}]);
  assert.deepEqual(scanned.problems,[]);
});
test('scoped refresh preserves unrelated siblings, updates subtree, and computes changes',async()=>{
  const root=directory('Images',[directory('gallery',[file('new.png'),directory('swap',[])])]);
  const {index,handles}=seeded(root);
  const scanned=await scanRegisteredSubfolder(source,root,'gallery');
  const result=await refreshSourceSubtreeIndex(index,scanned,'a','gallery',handles,200);
  assert.deepEqual(result.index.roots[0].entries.map(e=>e.path).sort(),
    ['elsewhere','elsewhere/keep.pdf','gallery','gallery/new.png','gallery/swap']);
  assert.deepEqual(result.changes,[{sourceId:'a',path:'gallery',initial:false,added:1,removed:1,typeChanged:1}]);
  assert.equal(result.index.roots[0].scannedAt,100,'subfolder scan must not upgrade root freshness');
  assert.deepEqual(index.roots[0].entries.map(e=>e.path).sort(),
    ['elsewhere','elsewhere/keep.pdf','gallery','gallery/old.png','gallery/swap']);
});
test('verified subtree missing/type drift never marks stale sibling missing',async()=>{
  const root=directory('Images',[directory('gallery',[directory('swap',[]),file('new.png')])]);
  const {index,handles}=seeded(root);
  const scanned=await scanRegisteredSubfolder(source,root,'gallery');
  const updated=await refreshSourceSubtreeIndex(index,scanned,'a','gallery',handles,200);
  const overlay=sourceIndexOverlay(updated.index,{freshSubtreePaths:updated.completeSubtreePaths});
  assert.deepEqual(overlay.completeRootIds,[]);
  assert.deepEqual(overlay.staleRootIds,['a']);
  const records=[
    {id:'ab1',sourceId:'a',path:'gallery/old.png',kind:'file'},
    {id:'ab2',sourceId:'a',path:'gallery/swap',kind:'file'},
    {id:'ab3',sourceId:'a',path:'elsewhere/absent.pdf',kind:'file'}
  ];
  const results=catalogQueryWithScan(records,[source],[],{},overlay);
  assert.equal(results.find(r=>r.path==='gallery/old.png').missing,true);
  assert.equal(results.find(r=>r.path==='gallery/swap').changedKind,true);
  assert.equal(results.find(r=>r.path==='gallery/swap').staleIndex,false);
  assert.equal(results.find(r=>r.path==='elsewhere/absent.pdf').missing,false);
  assert.equal(results.find(r=>r.path==='elsewhere/absent.pdf').staleIndex,true);
  assert.equal(results.find(r=>r.path==='gallery/new.png').staleIndex,false);
  assert.equal(results.find(r=>r.path==='elsewhere/keep.pdf').staleIndex,true);
});
test('a restored cache is stale even when it was previously refreshed',async()=>{
  const root=directory('Images',[directory('gallery',[file('new.png')])]);
  const {index,handles}=seeded(root);
  const scan=await scanRegisteredSubfolder(source,root,'gallery');
  const refreshed=await refreshSourceSubtreeIndex(index,scan,'a','gallery',handles,200);
  const restored=await restoreSourceIndex(refreshed.index,'cat',[source],handles);
  const overlay=sourceIndexOverlay(restored.index);
  assert.deepEqual(overlay.completeSubtreePaths,[]);
  const results=catalogQueryWithScan([{id:'ab1',sourceId:'a',path:'gallery/old.png',kind:'file'}],[source],[],{},overlay);
  assert.equal(results[0].missing,false);
  assert.equal(results[0].staleIndex,true);
});
test('a changed physical root identity fails closed even with matching display name',async()=>{
  const root=directory('Images',[directory('gallery',[])],'root-one');
  const {index}=seeded(root);
  const other=directory('Images',[directory('gallery',[])],'root-two');
  await assert.rejects(assertIndexedRootIdentity(index,'a',new Map([['a',other]])),/identity changed/);
  const scan=await scanRegisteredSubfolder(source,other,'gallery');
  await assert.rejects(refreshSourceSubtreeIndex(index,scan,'a','gallery',new Map([['a',other]])),/identity changed/);
});
test('partial subtree enumeration retains prior snapshot without claiming missing entries',async()=>{
  const gallery=directory('gallery',[file('new.png')]);
  gallery.entries=async function*(){yield ['new.png',file('new.png')];throw Error('IO error');};
  const root=directory('Images',[gallery]);
  const {index,handles}=seeded(root);
  const scan=await scanRegisteredSubfolder(source,root,'gallery');
  assert.deepEqual(scan.completeSubtreePaths,[]);
  assert.match(scan.problems[0],/IO error/);
  const updated=await refreshSourceSubtreeIndex(index,scan,'a','gallery',handles);
  assert.equal(updated.index,index);
  assert.deepEqual(updated.partialRootIds,['a']);
  assert.deepEqual(updated.changes,[]);
});
test('invalid subtree paths and absent directories are rejected without writes',async()=>{
  const root=directory('Images',[directory('gallery',[])]);
  for(const bad of ['', '../x','gallery//x','/gallery','gallery\\escape']){
    await assert.rejects(scanRegisteredSubfolder(source,root,bad),/Invalid/);
  }
  await assert.rejects(scanRegisteredSubfolder(source,root,'missing'),/Folder missing/);
  const {index,handles}=seeded(root);
  await assert.rejects(refreshSourceSubtreeIndex(index,full([]),'a','gallery',handles),/Invalid indexed subfolder scan/);
  await assert.rejects(refreshSourceSubtreeIndex(index,{entries:[entry('elsewhere/hijack')],completeRootIds:[],completeSubtreePaths:[{sourceId:'a',path:'gallery'}]},'a','gallery',handles),/escaped/);
  await assert.rejects(refreshSourceSubtreeIndex(index,{entries:[],completeRootIds:[],completeSubtreePaths:[{sourceId:'a',path:'gallery'}]},'a','gallery',handles),/omitted/);
  await assert.rejects(refreshSourceSubtreeIndex(index,{entries:[],completeRootIds:[],completeSubtreePaths:[{sourceId:'b',path:'gallery'}]},'a','gallery',handles),/Foreign/);
});
test('subfolder cannot be refreshed before its parent root is indexed',async()=>{
  const root=directory('Images',[directory('gallery',[])]);
  const scan=await scanRegisteredSubfolder(source,root,'gallery');
  await assert.rejects(refreshSourceSubtreeIndex(emptySourceIndex('cat'),scan,'a','gallery',new Map([['a',root]])),/complete Catalog Folder/);
});
test('failed traversal and limits cannot publish a completed subtree',async()=>{
  const gallery=directory('gallery',[file('one'),file('two'),file('three')]);
  const root=directory('Images',[gallery]);
  const limited=await scanRegisteredSubfolder(source,root,'gallery',{maxEntries:1});
  assert.deepEqual(limited.completeSubtreePaths,[]);
  assert.equal(limited.entries[0].path,'gallery');
  await assert.rejects(scanRegisteredSubfolder(source,root,'gallery',{maxDepth:1}),/depth/);
});
test('stale cached kind drift cannot be reported without a verified scan',()=>{
  const result=catalogQueryWithScan([{id:'ab1',sourceId:'a',path:'gallery/swap',kind:'file'}],[source],[],{},{
    entries:[entry('gallery/swap','directory')],completeRootIds:[],staleRootIds:['a']
  });
  assert.equal(result[0].changedKind,false);
  assert.equal(result[0].staleIndex,true);
});
