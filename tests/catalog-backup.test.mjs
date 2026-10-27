import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogBackup,validateCatalogBackup,inspectCatalogBackup} from '../src/catalog-backup.mjs';

class MemoryDir {
  constructor(files={}){this.files=new Map(Object.entries(files));this.dirs=new Map();this.writes=0;this.onRead=null;}
  async getFileHandle(name){
    if(!this.files.has(name))throw Object.assign(Error('missing'),{name:'NotFoundError'});
    return {getFile:async()=>({text:async()=>{
      this.onRead?.(name,this);
      return this.files.get(name);
    }})};
  }
  async getDirectoryHandle(name){
    if(!this.dirs.has(name))throw Object.assign(Error('missing'),{name:'NotFoundError'});
    return this.dirs.get(name);
  }
  async *entries(){for(const name of this.files.keys())yield [name,{kind:'file'}];}
}
const catalog={id:'catalog-1',code:'ab',name:'Research',nextSequence:2};
const root=()=>{
  const h=new MemoryDir({
    'catalog.json':JSON.stringify(catalog),
    'tags.json':'[{"id":"tag1","name":"Timber","parentId":null}]',
    'sources.json':'[{"id":"source1","name":"Research"}]',
    'views.json':'[]'
  });
  h.dirs.set('resources',new MemoryDir({'ab1.json':'{"id":"ab1","path":"study.pdf","sourceId":"source1"}'}));
  return h;
};
test('export snapshots catalog metadata and resource JSON without writing source files',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  assert.equal(backup.catalogId,'catalog-1');
  assert.equal(backup.scope,'catalog-metadata-only');
  assert.deepEqual(backup.files.map(x=>x.path),['catalog.json','sources.json','tags.json','views.json','resources/ab1.json']);
  assert.equal(backup.files.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)),true);
  assert.equal((await inspectCatalogBackup(h,backup)).counts.unchanged,5);
  assert.equal(h.writes,0);
});
test('backup inspection detects additions, changes and deletions without restoring them',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  h.files.set('tags.json','[]');
  h.files.delete('views.json');
  h.dirs.get('resources').files.set('ab2.json','{"id":"ab2"}');
  const result=await inspectCatalogBackup(h,backup);
  assert.deepEqual(result.counts,{'unchanged':3,'changed':1,'missing-now':1,'added-since-backup':1});
  assert.equal(result.entries.find(x=>x.path==='tags.json').status,'changed');
  assert.equal(result.entries.find(x=>x.path==='views.json').status,'missing-now');
  assert.equal(h.files.get('tags.json'),'[]');
});
test('tampered backup bytes, duplicates and foreign catalog are rejected',async()=>{
  const h=root(),backup=await createCatalogBackup(h);
  const tampered=structuredClone(backup);
  tampered.files[1].data='[]';
  await assert.rejects(validateCatalogBackup(tampered),/checksum mismatch/);
  const duplicate=structuredClone(backup);
  duplicate.files.push({...duplicate.files[0]});
  await assert.rejects(validateCatalogBackup(duplicate),/duplicate/);
  const other=root();
  other.files.set('catalog.json',JSON.stringify({...catalog,id:'foreign'}));
  await assert.rejects(inspectCatalogBackup(other,backup),/different catalog/);
});
test('a pending or malformed recovery journal is backed up verbatim, never replayed',async()=>{
  const h=root();
  h.files.set('.sourcebook-pending.json','{bad json');
  const backup=await createCatalogBackup(h);
  assert.equal(backup.files.find(x=>x.path==='.sourcebook-pending.json').data,'{bad json');
  const result=await inspectCatalogBackup(h,backup);
  assert.equal(result.hasPendingJournal,true);
  assert.equal(result.currentPendingJournal,true);
  assert.equal(h.files.get('.sourcebook-pending.json'),'{bad json');
});
test('concurrent metadata edit during export fails instead of yielding a mixed snapshot',async()=>{
  const h=root();let changed=false;
  let reads=0;
  h.onRead=(name,dir)=>{if(name==='tags.json'&&++reads===2){changed=true;dir.files.set('tags.json','[]');}};
  await assert.rejects(createCatalogBackup(h),/changed during backup/);
});
test('resource enumeration detects a new JSON record during snapshot',async()=>{
  const h=root();let changed=false;
  h.dirs.get('resources').onRead=(name)=>{if(name==='ab1.json'&&!changed){changed=true;h.dirs.get('resources').files.set('ab2.json','{}');}};
  await assert.rejects(createCatalogBackup(h),/resource list changed/);
});
test('unrecognized resource JSON paths are rejected rather than silently excluded',async()=>{
  const h=root();
  h.dirs.get('resources').files.set('bad name.json','{}');
  await assert.rejects(createCatalogBackup(h),/Unexpected catalog resource/);
});
