import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseBulkURLTagPaths,planBulkCatalogURLTags,MAX_BULK_URLS} from '../src/catalog-url-bulk.mjs';
import {commitCatalogTransaction,CATALOG_JOURNAL,inspectPendingCatalogTransaction} from '../src/catalog-transactions.mjs';

const time='2026-10-28T05:00:00.000Z';
const link=(id,url,tagIds=[],extra={})=>({formatVersion:1,id,kind:'url',url,
  title:'Study',notes:'Keep these notes',tagIds,updatedAt:time,...extra});
const a=link('ab1','https://example.org/a',['timber']);
const b=link('ab2','https://example.org/b');
const taxonomy=[{id:'architecture',name:'Architecture',parentId:null},
  {id:'timber',name:'Timber',parentId:'architecture'}];
const plan=(extra={})=>planBulkCatalogURLTags({records:[a,b],taxonomy,selectedIds:['ab1','ab2'],
  paths:['Architecture / Facades'],mode:'add',idFactory:()=> 'facades',
  timestamp:'2026-10-28T04:00:00.000Z',...extra});

test('bulk parser validates nested paths, count, duplicate paths and size',()=>{
  assert.deepEqual(parseBulkURLTagPaths(' #Architecture / Timber, Research '),
    ['Architecture / Timber','Research']);
  assert.throws(()=>parseBulkURLTagPaths(''),/1–16/);
  assert.throws(()=>parseBulkURLTagPaths('Research, research'),/Duplicate/);
  assert.throws(()=>parseBulkURLTagPaths('x'.repeat(1001)),/Invalid/);
  assert.throws(()=>parseBulkURLTagPaths(Array.from({length:17},(_,i)=>'tag'+i).join(',')),/1–16/);
});
test('bulk add creates one stable Tag and applies to two URLs without touching input',()=>{
  const before=JSON.stringify([a,b,taxonomy]);
  const result=plan();
  assert.equal(result.changed,2);
  assert.equal(result.taxonomy.length,3);
  assert.deepEqual(result.changes.map(x=>x.after.tagIds),[['timber','facades'],['facades']]);
  assert.deepEqual(result.changes.map(x=>x.path),['resources/ab1.json','resources/ab2.json']);
  assert.equal(result.changes[0].after.url,a.url);
  assert.equal(result.changes[0].after.id,a.id);
  assert.equal(result.changes[0].after.notes,a.notes);
  assert.ok(result.changes[0].after.updatedAt>a.updatedAt);
  assert.equal(JSON.stringify([a,b,taxonomy]),before);
});
test('reusing existing nested path does not create duplicate taxonomy entries',()=>{
  const result=plan({paths:['architecture/timber']});
  assert.equal(result.taxonomy.length,2);
  assert.equal(result.changed,1);
  assert.deepEqual(result.changes[0].after.tagIds,['timber']);
  assert.equal(result.changes[0].path,'resources/ab2.json');
});
test('remove matches exact nested path, not descendants or similarly named paths',()=>{
  const source=link('ab1','https://example.org/a',['timber','facades']);
  const tags=[...taxonomy,{id:'facades',name:'Facades',parentId:'architecture'}];
  const result=plan({records:[source],taxonomy:tags,selectedIds:['ab1'],mode:'remove',paths:['Architecture / Timber']});
  assert.deepEqual(result.changes[0].after.tagIds,['facades']);
  assert.equal(result.taxonomy,tags);
  assert.equal(plan({records:[source],taxonomy:tags,selectedIds:['ab1'],mode:'remove',
    paths:['Architecture']}).changed,0);
});
test('removing unknown Tag paths is a no-op and never creates taxonomy',()=>{
  const result=plan({mode:'remove',paths:['Missing / Tag']});
  assert.equal(result.changed,0);
  assert.equal(result.taxonomy,taxonomy);
});
test('invalid selection, foreign file resource and unresolved Tag IDs fail closed',()=>{
  assert.throws(()=>plan({selectedIds:[]}),/Invalid bulk/);
  assert.throws(()=>plan({selectedIds:Array(MAX_BULK_URLS+1).fill('ab1')}),/Invalid bulk/);
  assert.throws(()=>plan({selectedIds:['ab1','ab1']}),/Duplicate/);
  assert.throws(()=>plan({selectedIds:['ab404']}),/changed/);
  assert.throws(()=>plan({records:[a,{id:'ab2',kind:'file',sourceId:'s',path:'x'}]}),/changed/);
  assert.throws(()=>plan({records:[{...a,tagIds:['unknown']}],selectedIds:['ab1']}),/Unresolved/);
  assert.throws(()=>plan({records:[a,{...a}]}),/Duplicate/);
});
test('over-limit Tags and malformed URLs abort the entire batch',()=>{
  const many=Array.from({length:64},(_,i)=>'t'+i);
  const tags=many.map(id=>({id,name:id,parentId:null}));
  const first=link('ab1','https://example.org/a',many);
  assert.throws(()=>plan({records:[first,b],taxonomy:tags,selectedIds:['ab1','ab2'],
    paths:['New'],idFactory:()=> 'new'}),/Maximum 64/);
  assert.throws(()=>plan({records:[a,{...b,url:'javascript:alert(1)'}]}),/Only HTTP/);
});
test('bulk Tag plan can be committed as one recoverable Catalog-only transaction',async()=>{
  const result=plan();
  const files=new Map([['catalog.json',JSON.stringify({id:'catalog',code:'ab',nextSequence:3})],
    ['tags.json',JSON.stringify(taxonomy)]]);
  const resourceFiles=new Map([['ab1.json',JSON.stringify(a)],['ab2.json',JSON.stringify(b)]]);
  const writes=[];
  function dir(map,label){
    return {
      async getFileHandle(name,{create=false}={}){
        if(!map.has(name)){
          if(!create)throw Object.assign(Error('not found'),{name:'NotFoundError'});
          map.set(name,'');
        }
        return {getFile:async()=>({text:async()=>map.get(name)}),
          createWritable:async()=>{let value;return {write:async text=>{value=text;},
            close:async()=>{map.set(name,value);writes.push(label+name);},abort:async()=>{}};}};
      },
      async *entries(){for(const name of map.keys())yield [name,{kind:'file'}];},
      async removeEntry(name){map.delete(name);}
    };
  }
  const root=dir(files,'');
  const resources=dir(resourceFiles,'resources/');
  root.getDirectoryHandle=async name=>{assert.equal(name,'resources');return resources;};
  root.entries=async function*(){for(const name of files.keys())yield [name,{kind:'file'}];yield ['resources',{kind:'directory'}];};
  const changes=[{path:'tags.json',before:taxonomy,after:result.taxonomy},...result.changes];
  assert.equal(await commitCatalogTransaction({handle:root,catalogId:'catalog',changes,transactionId:'bulk-test'}),3);
  assert.equal(files.has(CATALOG_JOURNAL),false);
  assert.deepEqual(JSON.parse(resourceFiles.get('ab1.json')).tagIds,['timber','facades']);
  assert.equal(JSON.parse(resourceFiles.get('ab2.json')).url,b.url);
  assert.deepEqual(writes,[CATALOG_JOURNAL,'tags.json','resources/ab1.json','resources/ab2.json']);
  assert.equal(await inspectPendingCatalogTransaction(root,'catalog'),null);
});
test('UI and offline shell integrate bulk URL Tags without touching source folders',async()=>{
  const ui=await readFile(new URL('../src/catalog-links-ui.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(ui,/planBulkCatalogURLTags/);
  assert.match(ui,/data-catalog-links="bulk-add"/);
  assert.match(ui,/data-catalog-links="bulk-remove"/);
  assert.match(ui,/data-catalog-url-id/);
  assert.match(sw,/\.\/src\/catalog-url-bulk\.mjs/);
});
