import test from 'node:test';
import assert from 'node:assert/strict';
import {scanRegisteredFolders} from '../src/source-scan.mjs';
import {catalogQueryWithScan} from '../src/catalog-search.mjs';
import {ensureTagPath} from '../src/tags.mjs';

function file(name){return {kind:'file',name};}
function dir(name,children=[],permission='granted'){
  return {kind:'directory',name,
    async queryPermission({mode}){assert.equal(mode,'read');return permission;},
    async *entries(){for(const child of children)yield [child.name,child];}
  };
}
const sources=[{id:'a',name:'Images'},{id:'b',name:'Papers'}];
test('scan recursively discovers ordinary files without asking permission or writing',async()=>{
  const handles=new Map([
    ['a',dir('Images',[file('loose.png'),dir('gallery',[file('study.svg')]),dir('research.sb',[file('private.json')])])],
    ['b',dir('Papers',[file('paper.pdf')])]
  ]);
  const updates=[];
  const scan=await scanRegisteredFolders(sources,handles,{onProgress:p=>updates.push(p)});
  assert.deepEqual(scan.entries.map(x=>x.sourceId+':'+x.path),['a:loose.png','a:gallery','a:gallery/study.svg','b:paper.pdf']);
  assert.deepEqual(scan.completeRootIds,['a','b']);
  assert.equal(scan.problems.length,0);
  assert.equal(scan.cancelled,false);
  assert.equal(updates.at(-1).count,4);
});
test('denied and disconnected sources are incomplete, never treated as empty',async()=>{
  const scan=await scanRegisteredFolders(sources,new Map([['a',dir('Images',[],'prompt')]]));
  assert.deepEqual(scan.entries,[]);
  assert.deepEqual(scan.completeRootIds,[]);
  assert.equal(scan.problems.length,2);
});
test('scan limits, invalid entries and directory failures cannot mark a root complete',async()=>{
  const bad=dir('Images',[file('one.png'),file('two.png'),file('three.png')]);
  const limited=await scanRegisteredFolders([sources[0]],new Map([['a',bad]]),{maxEntries:2});
  assert.equal(limited.entries.length,2);
  assert.deepEqual(limited.completeRootIds,[]);
  const deep=await scanRegisteredFolders([sources[0]],new Map([['a',dir('Images',[dir('nested',[file('child')])])]]),{maxDepth:1});
  assert.deepEqual(deep.completeRootIds,[]);
  const invalid=await scanRegisteredFolders([sources[0]],new Map([['a',dir('Images',[file('../escape')])]]));
  assert.equal(invalid.entries.length,0);
  assert.deepEqual(invalid.completeRootIds,[]);
  const broken=dir('Images');broken.entries=async function*(){throw Error('disk offline');};
  const failed=await scanRegisteredFolders([sources[0]],new Map([['a',broken]]));
  assert.match(failed.problems[0],/disk offline/);
});
test('cancellation stops traversal and cannot publish a complete root',async()=>{
  let stop=false;
  const many=Array.from({length:300},(_,i)=>file('file-'+i));
  const scan=await scanRegisteredFolders([sources[0]],new Map([['a',dir('Images',many)]]),{
    onProgress(){stop=true;},isCancelled:()=>stop
  });
  assert.equal(scan.cancelled,true);
  assert.equal(scan.entries.length,250);
  assert.deepEqual(scan.completeRootIds,[]);
});
test('scanned unobjectified resources join unfiltered Views, but not tagged Views',()=>{
  let tagSequence=0;const tagged=ensureTagPath([],'Architecture / Timber',()=> 't'+(++tagSequence));
  const records=[{id:'ab1',sourceId:'a',path:'gallery/tagged.png',kind:'file',tagIds:[tagged.id]},
    {id:'ab2',sourceId:'b',path:'lost.pdf',kind:'file',tagIds:[]}];
  const scan={entries:[
    {sourceId:'a',path:'gallery/tagged.png',kind:'file'},
    {sourceId:'a',path:'gallery/loose.png',kind:'file'},
    {sourceId:'a',path:'gallery/loose.png',kind:'file'},
    {sourceId:'b',path:'notes.pdf',kind:'file'}],
    completeRootIds:['a','b'],problems:[]};
  const result=catalogQueryWithScan(records,sources,tagged.tags,{query:'',fileType:'all'},scan);
  assert.deepEqual(result.map(x=>x.name),['loose.png','lost.pdf','notes.pdf','tagged.png']);
  assert.equal(result.find(x=>x.name==='lost.pdf').missing,true);
  assert.equal(result.find(x=>x.name==='loose.png').unobjectified,true);
  assert.equal(result.find(x=>x.name==='loose.png').record,null);
  assert.deepEqual(catalogQueryWithScan(records,sources,tagged.tags,{tagIds:[tagged.id]},scan).map(x=>x.name),['tagged.png']);
  assert.deepEqual(catalogQueryWithScan(records,sources,tagged.tags,{query:'#Timber'},scan).map(x=>x.name),['tagged.png']);
  assert.deepEqual(catalogQueryWithScan(records,sources,tagged.tags,{sourceId:'a',folderPath:'gallery',fileType:'image'},scan).map(x=>x.name),['loose.png','tagged.png']);
  assert.equal(catalogQueryWithScan(records,sources,tagged.tags,{},null).length,2);
});
test('incomplete roots do not falsely mark old records missing',()=>{
  const records=[{id:'ab1',sourceId:'a',path:'maybe.pdf',kind:'file'}];
  const scan={entries:[],completeRootIds:[],problems:['permission denied']};
  assert.equal(catalogQueryWithScan(records,sources,[],{},scan)[0].missing,false);
});
