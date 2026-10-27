import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG_JOURNAL,validateCatalogChanges,inspectPendingCatalogTransaction,commitCatalogTransaction,resumeCatalogTransaction} from '../src/catalog-transactions.mjs';

class MemoryDirectory {
  constructor(files={}){this.files=new Map(Object.entries(files));this.directories=new Map();this.writes=[];this.failPath=null;}
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){if(!create)throw Object.assign(Error('Missing file'),{name:'NotFoundError'});this.files.set(name,'');}
    return {getFile:async()=>({text:async()=>this.files.get(name)}),
      createWritable:async()=>{
        let buffer;
        return {write:async value=>{buffer=value;},close:async()=>{
          if(this.failPath===name){this.failPath=null;throw Error('Simulated interrupted write');}
          this.files.set(name,buffer);this.writes.push(name);
        },abort:async()=>{}};
      }};
  }
  async getDirectoryHandle(name,{create=false}={}){
    if(!this.directories.has(name)){if(!create)throw Object.assign(Error('Missing directory'),{name:'NotFoundError'});this.directories.set(name,new MemoryDirectory());}
    return this.directories.get(name);
  }
  async removeEntry(name){if(!this.files.delete(name))throw Object.assign(Error('Missing'),{name:'NotFoundError'});}
}
const catalog={id:'cat-1',code:'ab',nextSequence:1};
const root=()=>new MemoryDirectory({'catalog.json':JSON.stringify(catalog)});
const change=(path,before,after)=>({path,before,after});
const metadata=[
  change('tags.json',null,[{id:'tag-1',name:'Wood',parentId:null}]),
  change('catalog.json',catalog,{...catalog,nextSequence:2}),
  change('resources/ab1.json',null,{id:'ab1',sourceId:'s1',path:'a.png',kind:'file',tagIds:['tag-1']})
];

test('catalog transaction validates only catalog-local paths and distinct JSON snapshots',()=>{
  assert.throws(()=>validateCatalogChanges([change('../outside.json',null,{})]),/Invalid/);
  assert.throws(()=>validateCatalogChanges([change('resources/a/other.json',null,{})]),/Invalid/);
  assert.throws(()=>validateCatalogChanges([change('tags.json',[],[])]),/Invalid/);
  assert.throws(()=>validateCatalogChanges([change('tags.json',[],{} )]),/Invalid/);
  assert.throws(()=>validateCatalogChanges([change('tags.json',null,[]),change('tags.json',null,[])]),/Invalid/);
  assert.deepEqual(validateCatalogChanges(metadata),metadata);
});
test('journal is verified before any metadata write, then removed on success',async()=>{
  const h=root();
  assert.equal(await commitCatalogTransaction({handle:h,catalogId:catalog.id,changes:metadata,transactionId:'tx-1'}),3);
  assert.deepEqual(h.writes.slice(0,3),[CATALOG_JOURNAL,'tags.json','catalog.json']);
  assert.deepEqual(h.directories.get('resources').writes,['ab1.json']);
  assert.equal(await inspectPendingCatalogTransaction(h,catalog.id),null);
  assert.equal(JSON.parse(h.files.get('catalog.json')).nextSequence,2);
});
test('preflight stale snapshot refuses to create journal or write anything',async()=>{
  const h=root();h.files.set('tags.json','[]');
  await assert.rejects(commitCatalogTransaction({handle:h,catalogId:catalog.id,changes:metadata}),/changed on disk/);
  assert.deepEqual(h.writes,[]);
  assert.equal(h.files.has(CATALOG_JOURNAL),false);
});
test('interrupted multi-file save is inspectable and resumes without duplicating writes',async()=>{
  const h=root();h.failPath='catalog.json';
  await assert.rejects(commitCatalogTransaction({handle:h,catalogId:catalog.id,changes:metadata,transactionId:'tx-2'}),/interrupted/);
  const info=await inspectPendingCatalogTransaction(h,catalog.id);
  assert.deepEqual([info.applied,info.pending,info.conflicts.length],[1,2,0]);
  assert.equal(h.files.has(CATALOG_JOURNAL),true);
  assert.equal(await resumeCatalogTransaction(h,catalog.id),3);
  assert.equal(await inspectPendingCatalogTransaction(h,catalog.id),null);
  assert.deepEqual(h.writes.filter(x=>x==='tags.json'),['tags.json']);
  assert.equal(h.directories.get('resources').writes.length,1);
});
test('recovery refuses divergent external edits before writing anything',async()=>{
  const h=root();h.failPath='catalog.json';
  await assert.rejects(commitCatalogTransaction({handle:h,catalogId:catalog.id,changes:metadata}),/interrupted/);
  h.files.set('tags.json','[{"id":"other"}]');
  const before=h.writes.length;
  assert.deepEqual((await inspectPendingCatalogTransaction(h,catalog.id)).conflicts,['tags.json']);
  await assert.rejects(resumeCatalogTransaction(h,catalog.id),/conflicts/);
  assert.equal(h.writes.length,before);
  assert.equal(h.files.has(CATALOG_JOURNAL),true);
});
test('pending transaction blocks subsequent writes until explicitly resumed',async()=>{
  const h=root();h.failPath='catalog.json';
  await assert.rejects(commitCatalogTransaction({handle:h,catalogId:catalog.id,changes:metadata}),/interrupted/);
  await assert.rejects(commitCatalogTransaction({handle:h,catalogId:catalog.id,changes:[change('views.json',null,[])]}),/recovery first/);
});
test('malformed or foreign journal fails closed; inspection never modifies files',async()=>{
  const h=root();h.files.set(CATALOG_JOURNAL,'not-json');
  await assert.rejects(inspectPendingCatalogTransaction(h,catalog.id));
  await assert.rejects(commitCatalogTransaction({handle:h,catalogId:catalog.id,changes:metadata}));
  h.files.set(CATALOG_JOURNAL,JSON.stringify({formatVersion:1,id:'tx',catalogId:'different',createdAt:new Date().toISOString(),changes:metadata}));
  await assert.rejects(inspectPendingCatalogTransaction(h,catalog.id),/foreign/);
  assert.deepEqual(h.writes,[]);
});
