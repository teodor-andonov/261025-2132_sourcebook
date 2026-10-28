import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planLegacyURLMigration,migrateLegacyURLToFile} from '../src/legacy-url-migration.mjs';
import {parseInternetShortcut} from '../src/file-capture.mjs';
import {CATALOG_JOURNAL,inspectPendingCatalogTransaction,resumeCatalogTransaction} from '../src/catalog-transactions.mjs';
class Dir{
  constructor(name,files={}){this.kind='directory';this.name=name;this.files=new Map(Object.entries(files));this.dirs=new Map();this.fail=null;this.writes=0;}
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){if(!create)throw Object.assign(Error('missing'),{name:'NotFoundError'});this.files.set(name,'');}
    return {getFile:async()=>({size:this.files.get(name).length,text:async()=>this.files.get(name)}),
      createWritable:async()=>{let buffer;return {write:async x=>{buffer=x;},close:async()=>{
        if(this.fail===name){this.fail=null;throw Error('interrupted write');}
        this.files.set(name,buffer);this.writes++;
      },abort:async()=>{}}}};
  }
  async getDirectoryHandle(name,{create=false}={}){
    if(!this.dirs.has(name)){if(!create)throw Object.assign(Error('missing'),{name:'NotFoundError'});this.dirs.set(name,new Dir(name));}
    return this.dirs.get(name);
  }
  async *entries(){for(const name of this.files.keys())yield [name,{kind:'file'}];for(const name of this.dirs.keys())yield [name,{kind:'directory'}];}
  async removeEntry(name){if(!this.files.delete(name))throw Error('missing');}
}
const catalog={id:'cat-1',code:'ab',nextSequence:8},sources=[{id:'src-1',name:'References'}];
const legacy={formatVersion:1,id:'ab7',kind:'url',url:'https://example.org/wood',
  title:'Timber Study',notes:'Notes',tagIds:['tag-1'],updatedAt:'2026-10-28T08:00:00Z'};
function setup(){
  const catalogHandle=new Dir('My.sb',{'catalog.json':JSON.stringify(catalog),'sources.json':JSON.stringify(sources),'tags.json':'[]'});
  const resources=new Dir('resources',{'ab7.json':JSON.stringify(legacy)});
  catalogHandle.dirs.set('resources',resources);
  return {catalogHandle,sourceHandle:new Dir('References'),resources};
}
const migrate=(f,extra={})=>migrateLegacyURLToFile({...f,expectedCatalog:catalog,expectedSources:sources,
  records:[legacy],recordId:'ab7',sourceId:'src-1',authorized:async()=>true,...extra});
test('planner preserves stable identity and metadata in real shortcut binding',()=>{
  const p=planLegacyURLMigration({record:legacy,catalog,source:sources[0],records:[legacy]});
  assert.equal(p.name,'Timber Study[ab7].url');
  assert.equal(parseInternetShortcut(p.plan.text),legacy.url);
  assert.equal(p.after.kind,'file');assert.equal(p.after.id,legacy.id);
  assert.deepEqual(p.after.tagIds,legacy.tagIds);assert.equal(p.after.notes,legacy.notes);
  assert.equal(p.after.migration.legacyUrl,legacy.url);assert.equal(p.after.url,undefined);
  assert.equal(legacy.kind,'url');
});
test('successful migration creates file and journaled metadata binding',async()=>{
  const f=setup(),result=await migrate(f);
  assert.equal(result.id,'ab7');
  assert.equal(parseInternetShortcut(f.sourceHandle.files.get(result.name)),legacy.url);
  assert.equal(JSON.parse(f.resources.files.get('ab7.json')).sourceId,'src-1');
  assert.equal(f.catalogHandle.files.has(CATALOG_JOURNAL),false);
  assert.equal(f.sourceHandle.writes,1);
});
test('stale catalog, sources and resource refuse source writes',async()=>{
  for(const change of [f=>f.catalogHandle.files.set('catalog.json',JSON.stringify({...catalog,nextSequence:9})),
    f=>f.catalogHandle.files.set('sources.json','[]'),
    f=>f.resources.files.set('ab7.json',JSON.stringify({...legacy,notes:'changed'}))]){
    const f=setup();change(f);await assert.rejects(migrate(f),/changed/);
    assert.equal(f.sourceHandle.files.size,0);
  }
});
test('permission denial and pending transaction refuse migration',async()=>{
  const f=setup();
  await assert.rejects(migrate(f,{authorized:async()=>false}),/permission/);
  f.catalogHandle.files.set(CATALOG_JOURNAL,JSON.stringify({formatVersion:1,id:'tx',catalogId:catalog.id,
    createdAt:new Date().toISOString(),changes:[{path:'resources/ab7.json',before:legacy,after:{...legacy,title:'new'}}]}));
  await assert.rejects(migrate(f),/pending/);
  assert.equal(f.sourceHandle.files.size,0);
});
test('case-insensitive destination collision never overwrites',async()=>{
  const f=setup();f.sourceHandle.files.set('timber study[ab7].URL','KEEP');
  await assert.rejects(migrate(f),/already exists/);
  assert.equal(f.sourceHandle.files.get('timber study[ab7].URL'),'KEEP');
  assert.equal(f.sourceHandle.writes,0);
});
test('catalog path collisions and invalid legacy IDs fail planning',()=>{
  assert.throws(()=>planLegacyURLMigration({record:legacy,catalog,source:sources[0],
    records:[legacy,{id:'ab3',sourceId:'src-1',path:'Timber Study[ab7].url'}]}),/claims/);
  assert.throws(()=>planLegacyURLMigration({record:{...legacy,id:'cd7'},catalog,source:sources[0]}),/not valid/);
});
test('partial file failure retains legacy metadata and warns',async()=>{
  const f=setup();f.sourceHandle.fail='Timber Study[ab7].url';
  await assert.rejects(migrate(f),/new\/partial file may remain/);
  assert.deepEqual(JSON.parse(f.resources.files.get('ab7.json')),legacy);
  assert.equal(f.sourceHandle.files.has('Timber Study[ab7].url'),true);
});
test('interrupted Catalog journal is recoverable without deleting shortcut',async()=>{
  const f=setup();f.resources.fail='ab7.json';
  await assert.rejects(migrate(f),/Catalog recovery may be required/);
  assert.equal(parseInternetShortcut(f.sourceHandle.files.get('Timber Study[ab7].url')),legacy.url);
  assert.ok(await inspectPendingCatalogTransaction(f.catalogHandle,catalog.id));
  await resumeCatalogTransaction(f.catalogHandle,catalog.id);
  assert.equal(JSON.parse(f.resources.files.get('ab7.json')).kind,'file');
});
test('integration keeps legacy creation retired and precaches migration module',async()=>{
  const [ui,sw]=await Promise.all([readFile(new URL('../src/catalog-links-ui.mjs',import.meta.url),'utf8'),
    readFile(new URL('../sw.js',import.meta.url),'utf8')]);
  assert.match(ui,/migrateLegacyURLToFile/);
  assert.match(ui,/data-catalog-links="migrate"/);
  assert.match(ui,/name="confirmMigration"/);
  assert.match(ui,/Catalog-only URL creation is retired/);
  assert.match(sw,/\.\/src\/legacy-url-migration\.mjs/);
});
