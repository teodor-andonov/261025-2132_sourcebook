import test from 'node:test';
import assert from 'node:assert/strict';
import {planBulkTags,assertSelectedUnchanged,commitBulkTags} from '../src/bulk-tags.mjs';
import {CATALOG_JOURNAL,inspectPendingCatalogTransaction} from '../src/catalog-transactions.mjs';
const catalog={id:'c',code:'ab',nextSequence:1};
const items=[{name:'A.png',kind:'file'},{name:'B.png',kind:'file'}];
const plan=(extra={})=>planBulkTags({catalog,taxonomy:[],records:[],items,sourceId:'root',parts:[],paths:['Architecture / Facades'],mode:'add',siblingNames:items.map(x=>x.name),idFactory:(()=>{let n=0;return ()=>'tag'+(++n);})(),timestamp:'2026-10-27T13:00:00.000Z',...extra});
test('bulk add reuses stable nested IDs, allocates separate resource IDs and does not mutate inputs',()=>{
  const records=[],taxonomy=[],p=plan({records,taxonomy});
  assert.deepEqual(p.changes.map(x=>x.after.id),['ab1','ab2']);
  assert.deepEqual(p.changes.map(x=>x.after.tagIds),[['tag2'],['tag2']]);
  assert.equal(p.taxonomy.length,2);assert.equal(p.nextSequence,3);
  assert.deepEqual(records,[]);assert.deepEqual(taxonomy,[]);
});
test('remove matches exact path, preserves notes, migrates legacy strings only on change',()=>{
  const old={id:'ab9',sourceId:'root',path:'A.png',kind:'file',tags:['Architecture / Facades','Materials / Timber'],tagIds:[],notes:'keep',updatedAt:'2026-10-27T13:00:00.000Z'};
  const p=plan({items:[items[0]],records:[old],paths:['Architecture / Facades'],mode:'remove'});
  assert.equal(p.changes[0].after.tagIds.length,1);
  assert.equal(p.changes[0].after.notes,'keep');
  assert.equal(p.changes[0].after.tags,undefined);
  assert.equal(p.changes[0].after.updatedAt,'2026-10-27T13:00:00.001Z');
  assert.deepEqual(old.tags,['Architecture / Facades','Materials / Timber']);
  assert.equal(plan({items:[items[1]],mode:'remove'}).changes.length,0);
});
test('unchanged stable tags are not rewritten',()=>{
  const p=plan({items:[items[0]]});
  assert.equal(plan({items:[items[0]],records:[p.changes[0].after],taxonomy:p.taxonomy,paths:['Architecture/Facades']}).changes.length,0);
});
test('rejects over-limit, unknown tag IDs, duplicate paths and stale metadata',()=>{
  assert.throws(()=>plan({items:Array.from({length:251},(_,i)=>({name:i+'.png',kind:'file'}))}),/250/);
  assert.throws(()=>plan({items:[items[0]],records:[{id:'ab1',sourceId:'root',path:'A.png',kind:'file',tagIds:['lost']}]}),/Unresolved/);
  assert.throws(()=>plan({records:[{id:'ab1',sourceId:'root',path:'A.png'},{id:'ab2',sourceId:'root',path:'A.png'}]}),/Duplicate catalog path/);
  assert.throws(()=>assertSelectedUnchanged([], [{id:'ab1',sourceId:'root',path:'A.png'}],[items[0]],'root',[]),/changed/);
});
class Dir{
  constructor(files=new Map()){this.files=files;this.writes=[];}
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){if(!create)throw Object.assign(new Error('missing'),{name:'NotFoundError'});this.files.set(name,'');}
    const dir=this;
    return {getFile:async()=>({text:async()=>dir.files.get(name)}),createWritable:async()=>{
      let content;return {write:async x=>{content=x;},close:async()=>{dir.files.set(name,content);dir.writes.push(name);},abort:async()=>{}};
    }};
  }
  async removeEntry(name){if(!this.files.delete(name))throw Object.assign(Error('missing'),{name:'NotFoundError'});}
  async getDirectoryHandle(name,{create=false}={}){
    if(!this[name]){if(!create)throw Object.assign(new Error('missing'),{name:'NotFoundError'});this[name]=new Dir();}
    return this[name];
  }
}
const memory=()=>new Dir(new Map([['catalog.json',JSON.stringify(catalog)],['tags.json','[]']]));
test('in-memory filesystem integration verifies taxonomy, allocator and resource writes',async()=>{
  const h=memory(),p=plan();
  assert.equal(await commitBulkTags({handle:h,plan:p,expectedCatalog:catalog,expectedTaxonomy:[]}),2);
  assert.deepEqual(h.writes,[CATALOG_JOURNAL,'tags.json','catalog.json']);
  assert.equal(h.files.has(CATALOG_JOURNAL),false);
  assert.deepEqual(h.resources.writes,['ab1.json','ab2.json']);
  assert.deepEqual(JSON.parse(h.resources.files.get('ab2.json')).tagIds,['tag2']);
});
test('stale taxonomy and records fail before writes',async()=>{
  const p=plan(),h=memory();h.files.set('tags.json','[{"id":"other"}]');
  await assert.rejects(commitBulkTags({handle:h,plan:p,expectedCatalog:catalog,expectedTaxonomy:[]}),/Tags changed/);
  assert.equal(h.writes.length,0);
  const r=memory();r.resources=new Dir(new Map([['ab1.json','{"id":"ab1"}']]));
  await assert.rejects(commitBulkTags({handle:r,plan:p,expectedCatalog:catalog,expectedTaxonomy:[]}),/Resource changed/);
  assert.equal(r.writes.length,0);
});
test('mid-batch taxonomy change reports partial verified count',async()=>{
  const h=memory(),p=plan();h.resources=new Dir();
  const original=h.resources.getFileHandle.bind(h.resources);
  h.resources.getFileHandle=async (...args)=>{
    const file=await original(...args);
    if(args[0]==='ab1.json'&&args[1]?.create){
      const writable=file.createWritable.bind(file);
      file.createWritable=async()=>{
        const writer=await writable(),close=writer.close;
        writer.close=async()=>{await close();h.files.set('tags.json','[]');};
        return writer;
      };
    }
    return file;
  };
  await assert.rejects(commitBulkTags({handle:h,plan:p,expectedCatalog:catalog,expectedTaxonomy:[]}),/Catalog changed during transaction: tags.json/);
  assert.deepEqual(h.resources.writes,['ab1.json']);
  const pending=await inspectPendingCatalogTransaction(h,catalog.id);
  assert.deepEqual(pending.conflicts,['tags.json']);
  assert.equal(h.files.has(CATALOG_JOURNAL),true);
});
