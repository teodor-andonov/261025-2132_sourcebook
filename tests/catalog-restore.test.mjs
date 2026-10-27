import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogBackup} from '../src/catalog-backup.mjs';
import {planMissingResourceRestore,restoreMissingResourceRecords} from '../src/catalog-restore.mjs';
import {inspectPendingCatalogTransaction,resumeCatalogTransaction} from '../src/catalog-transactions.mjs';

class MemoryDir {
  constructor(files={}){this.files=new Map(Object.entries(files));this.dirs=new Map();this.writes=[];this.failName=null;}
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){
      if(!create)throw Object.assign(Error('Missing file'),{name:'NotFoundError'});
      this.files.set(name,'');
    }
    return {getFile:async()=>({text:async()=>this.files.get(name)}),
      createWritable:async()=>{
        let buffer;
        return {write:async data=>{buffer=data;},close:async()=>{
          if(this.failName===name){this.failName=null;throw Error('Simulated interruption');}
          this.files.set(name,buffer);this.writes.push(name);
        },abort:async()=>{}};
      }};
  }
  async getDirectoryHandle(name,{create=false}={}){
    if(!this.dirs.has(name)){
      if(!create)throw Object.assign(Error('Missing directory'),{name:'NotFoundError'});
      this.dirs.set(name,new MemoryDir());
    }
    return this.dirs.get(name);
  }
  async *entries(){for(const name of this.files.keys())yield [name,{kind:'file'}];}
  async removeEntry(name){if(!this.files.delete(name))throw Object.assign(Error('Missing'),{name:'NotFoundError'});}
}
const j=JSON.stringify;
const catalog={id:'cat-1',code:'ab',name:'Research',nextSequence:2};
const resource=(id,path,tagIds=['tag1'])=>({id,kind:'file',sourceId:'source1',path,tagIds,notes:'kept'});
function root(){
  const h=new MemoryDir({
    'catalog.json':j(catalog),
    'sources.json':j([{id:'source1',name:'Research'}]),
    'tags.json':j([{id:'tag1',name:'Wood',parentId:null}]),
    'views.json':'[]'
  });
  h.dirs.set('resources',new MemoryDir({'ab1.json':j(resource('ab1','one.pdf'))}));
  return h;
}
const files=h=>h.dirs.get('resources').files;
test('missing resource metadata restores through verified journal; ordinary files untouched',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  files(h).delete('ab1.json');
  const plan=await planMissingResourceRestore(h,backup);
  assert.deepEqual(plan.missingPaths,['resources/ab1.json']);
  assert.equal(plan.changes.length,1);
  assert.equal(plan.remaining,0);
  assert.deepEqual(h.writes,[]);
  const result=await restoreMissingResourceRecords(h,backup,plan);
  assert.equal(result.restored,1);
  assert.equal(JSON.parse(files(h).get('ab1.json')).notes,'kept');
  assert.equal(h.files.has('.sourcebook-pending.json'),false);
  assert.deepEqual(h.writes,['.sourcebook-pending.json']);
  assert.deepEqual(h.dirs.get('resources').writes,['ab1.json']);
});
test('restoring a high identity advances the allocator without changing backup source files',async()=>{
  const h=root();files(h).set('ab9.json',j(resource('ab9','nine.pdf')));
  const backup=await createCatalogBackup(h);
  files(h).delete('ab9.json');
  const plan=await planMissingResourceRestore(h,backup);
  assert.equal(plan.changes[0].path,'catalog.json');
  assert.equal(plan.changes[0].after.nextSequence,10);
  const result=await restoreMissingResourceRecords(h,backup,plan);
  assert.equal(result.sequenceUpdated,true);
  assert.equal(JSON.parse(h.files.get('catalog.json')).nextSequence,10);
});
test('unchanged backup has no restoration and never writes',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  const plan=await planMissingResourceRestore(h,backup);
  assert.deepEqual(plan.missingPaths,[]);
  await assert.rejects(restoreMissingResourceRecords(h,backup,plan),/Select missing/);
  assert.deepEqual(h.writes,[]);
});
test('existing changes and new metadata are preserved, never overwritten or deleted',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  files(h).set('ab1.json',j({...resource('ab1','one.pdf'),notes:'new notes'}));
  files(h).set('ab2.json',j(resource('ab2','two.pdf')));
  const plan=await planMissingResourceRestore(h,backup);
  assert.equal(plan.missingPaths.length,0);
  assert.equal(plan.changedFiles,1);
  assert.equal(plan.extraFiles,1);
  assert.equal(JSON.parse(files(h).get('ab1.json')).notes,'new notes');
});
test('reject foreign, tampered, pending and malformed backups without writing',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  const altered=structuredClone(backup);altered.catalogId='other';
  await assert.rejects(planMissingResourceRestore(h,altered),/identity mismatch/);
  const bad=structuredClone(backup);bad.files.find(f=>f.path==='resources/ab1.json').data='{}';
  await assert.rejects(planMissingResourceRestore(h,bad),/checksum mismatch/);
  h.files.set('.sourcebook-pending.json','{}');
  await assert.rejects(planMissingResourceRestore(h,backup),/pending Catalog journal/);
  h.files.delete('.sourcebook-pending.json');
  const pending=root();pending.files.set('.sourcebook-pending.json','{}');
  const withJournal=await createCatalogBackup(pending);
  await assert.rejects(planMissingResourceRestore(h,withJournal),/pending Catalog journal/);
  assert.deepEqual(h.writes,[]);
});
test('restoration refuses missing Tags, missing Catalog Folders and duplicate locations',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  files(h).delete('ab1.json');
  h.files.set('tags.json','[]');
  await assert.rejects(planMissingResourceRestore(h,backup),/missing or invalid Tags/);
  h.files.set('tags.json',j([{id:'tag1',name:'Wood'}]));
  h.files.set('sources.json','[]');
  await assert.rejects(planMissingResourceRestore(h,backup),/missing Catalog Folder/);
  h.files.set('sources.json',j([{id:'source1',name:'Research'}]));
  files(h).set('ab2.json',j(resource('ab2','one.pdf')));
  await assert.rejects(planMissingResourceRestore(h,backup),/duplicate a resource location/);
  assert.deepEqual(h.writes,[]);
});
test('stale preview refuses restoration after any metadata change',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  files(h).delete('ab1.json');
  const plan=await planMissingResourceRestore(h,backup);
  h.files.set('views.json',j([{id:'view-new'}]));
  await assert.rejects(restoreMissingResourceRecords(h,backup,plan),/changed since the restore preview/);
  assert.deepEqual(h.writes,[]);
});
test('interrupted restoration is journaled and can resume explicitly',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  files(h).delete('ab1.json');
  const plan=await planMissingResourceRestore(h,backup);
  h.dirs.get('resources').failName='ab1.json';
  await assert.rejects(restoreMissingResourceRecords(h,backup,plan),/interruption/);
  const pending=await inspectPendingCatalogTransaction(h,catalog.id);
  assert.deepEqual([pending.applied,pending.pending,pending.conflicts.length],[0,1,0]);
  assert.equal(await resumeCatalogTransaction(h,catalog.id),1);
  assert.equal(files(h).has('ab1.json'),true);
});
test('restoration validates record ID, relative path and catalog sequence',async()=>{
  for(const invalid of [
    {...resource('ab1','one.pdf'),path:'../outside.pdf'},
    {...resource('ab1','one.pdf'),id:'other'},
    {...resource('ab1','one.pdf'),kind:'url'}
  ]){
    const h=root();files(h).set('ab1.json',j(invalid));
    const backup=await createCatalogBackup(h);
    files(h).delete('ab1.json');
    await assert.rejects(planMissingResourceRestore(h,backup),/Invalid resource|does not belong/);
    assert.deepEqual(h.writes,[]);
  }
});
test('large restores are bounded to 250 records per verified batch',async()=>{
  const h=root();
  for(let i=2;i<=260;i++)files(h).set('ab'+i+'.json',j(resource('ab'+i,'p'+i+'.pdf')));
  const backup=await createCatalogBackup(h);
  files(h).clear();
  const plan=await planMissingResourceRestore(h,backup);
  assert.equal(plan.missingPaths.length,260);
  assert.equal(plan.selectedPaths.length,250);
  assert.equal(plan.remaining,10);
  await assert.rejects(planMissingResourceRestore(h,backup,{selectedPaths:plan.missingPaths}),/at most 250/);
  assert.deepEqual(h.writes,[]);
});
