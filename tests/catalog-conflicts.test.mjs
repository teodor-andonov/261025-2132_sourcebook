import test from 'node:test';
import assert from 'node:assert/strict';
import {conflictCanonicalPath,assertNoCatalogConflictCopies,inspectCatalogConflictCopies} from '../src/catalog-conflicts.mjs';
import {createCatalogBackup} from '../src/catalog-backup.mjs';
import {commitCatalogTransaction,inspectPendingCatalogTransaction,resumeCatalogTransaction} from '../src/catalog-transactions.mjs';

class MemoryDir{
  constructor(files={}){this.files=new Map(Object.entries(files));this.dirs=new Map();this.writes=[];}
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){
      if(!create)throw Object.assign(Error('missing'),{name:'NotFoundError'});
      this.files.set(name,'');
    }
    return {getFile:async()=>({size:this.files.get(name).length,text:async()=>this.files.get(name)}),
      createWritable:async()=>({write:async()=>{throw Error('Unexpected write');},close:async()=>{},abort:async()=>{}})};
  }
  async getDirectoryHandle(name){
    if(!this.dirs.has(name))throw Object.assign(Error('missing'),{name:'NotFoundError'});
    return this.dirs.get(name);
  }
  async *entries(){
    for(const name of this.files.keys())yield [name,{kind:'file'}];
    for(const name of this.dirs.keys())yield [name,{kind:'directory'}];
  }
}
const cat={id:'cat-1',code:'ab',nextSequence:2};
const root=()=>{
  const h=new MemoryDir({'catalog.json':JSON.stringify(cat),'tags.json':'[]','sources.json':'[]','views.json':'[]'});
  h.dirs.set('resources',new MemoryDir({'ab1.json':'{"id":"ab1","notes":"original"}'}));
  return h;
};
const add=(h,name,text,resource=false)=>(resource?h.dirs.get('resources'):h).files.set(name,text);

test('recognizes Syncthing metadata copies in root and resources but ignores ordinary files',()=>{
  assert.equal(conflictCanonicalPath('catalog.sync-conflict-20261027-190101-ABCDE.json'),'catalog.json');
  assert.equal(conflictCanonicalPath('resources/ab1.sync-conflict-20261027-190101-ABCDE.json'),'resources/ab1.json');
  assert.equal(conflictCanonicalPath('tags.json.sync-conflict-20261027-190101-ABCDE'),'tags.json');
  assert.equal(conflictCanonicalPath('.sourcebook-pending.sync-conflict-20261027-190101-ABCDE.json'),'.sourcebook-pending.json');
  assert.equal(conflictCanonicalPath('readme.sync-conflict-20261027-190101-ABCDE.txt'),null);
  assert.equal(conflictCanonicalPath('resources/not a record.sync-conflict-20261027-190101-ABCDE.json'),null);
  assert.equal(conflictCanonicalPath('resources/ab1.json'),null);
});
test('reports divergent, identical, missing and malformed copies read-only',async()=>{
  const h=root();
  add(h,'tags.sync-conflict-20261027-191100-ABCDE.json','["other"]');
  add(h,'sources.sync-conflict-20261027-191101-ABCDE.json','[]');
  add(h,'views.sync-conflict-20261027-191102-ABCDE.json','{broken');
  add(h,'ab2.sync-conflict-20261027-191103-ABCDE.json','{"id":"ab2"}',true);
  const result=await inspectCatalogConflictCopies(h,{expectedCatalogId:'cat-1'});
  assert.equal(result.count,4);
  assert.equal(result.counts.divergent,1);
  assert.equal(result.counts.identical,1);
  assert.equal(result.counts['malformed-conflict'],1);
  assert.equal(result.counts['canonical-missing'],1);
  assert.equal(result.entries.every(x=>x.path.includes('.sync-conflict-')&&x.canonicalPath),true);
  assert.equal(h.writes.length,0);
});
test('semantic equivalents remain blocking conflicts, even when JSON formatting differs',async()=>{
  const h=root();
  add(h,'tags.sync-conflict-20261027-191100-ABCDE.json','[ ]');
  const result=await inspectCatalogConflictCopies(h);
  assert.equal(result.counts.equivalent,1);
  await assert.rejects(assertNoCatalogConflictCopies(h),/Syncthing conflict/);
});
test('foreign catalog identities are surfaced without treating them as safe to merge',async()=>{
  const h=root();
  add(h,'catalog.sync-conflict-20261027-191100-ABCDE.json',JSON.stringify({...cat,id:'other'}));
  const report=await inspectCatalogConflictCopies(h,{expectedCatalogId:cat.id});
  assert.equal(report.counts['foreign-catalog'],1);
});
test('clean catalogs pass conflict preflight and can export verified backups',async()=>{
  const h=root();
  await assertNoCatalogConflictCopies(h);
  const backup=await createCatalogBackup(h);
  assert.equal(backup.files.some(f=>f.path.includes('sync-conflict')),false);
});
test('backup export and catalog writes fail closed on Syncthing conflict copies',async()=>{
  const h=root();
  add(h,'ab1.sync-conflict-20261027-191100-ABCDE.json','{"id":"ab1","notes":"other"}',true);
  await assert.rejects(createCatalogBackup(h),/Syncthing conflict/);
  await assert.rejects(commitCatalogTransaction({handle:h,catalogId:cat.id,
    changes:[{path:'tags.json',before:[],after:[{id:'tag1'}]}]}),/Syncthing conflict/);
  assert.equal(h.files.has('.sourcebook-pending.json'),false);
  assert.equal(h.writes.length,0);
});
test('journal recovery is blocked by conflicts instead of replaying over them',async()=>{
  const h=root();
  const changes=[{path:'tags.json',before:[],after:[{id:'tag1'}]}];
  h.files.set('.sourcebook-pending.json',JSON.stringify({
    formatVersion:1,id:'txn-1',catalogId:cat.id,createdAt:new Date().toISOString(),changes
  }));
  add(h,'tags.sync-conflict-20261027-191100-ABCDE.json','[]');
  const pending=await inspectPendingCatalogTransaction(h,cat.id);
  assert.equal(pending.pending,1);
  await assert.rejects(resumeCatalogTransaction(h,cat.id),/Syncthing conflict/);
  assert.equal(h.files.has('.sourcebook-pending.json'),true);
});
test('conflict copies changing during inspection are rejected as stale',async()=>{
  const h=root();
  add(h,'tags.sync-conflict-20261027-191100-ABCDE.json','[]');
  const original=h.entries.bind(h);let calls=0;
  h.entries=async function*(){
    calls++;
    yield* original();
    if(calls===1)add(h,'views.sync-conflict-20261027-191200-ABCDE.json','[]');
  };
  await assert.rejects(inspectCatalogConflictCopies(h),/changed during inspection/);
});
