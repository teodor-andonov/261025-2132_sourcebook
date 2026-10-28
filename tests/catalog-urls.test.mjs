import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalogURLRecord,catalogURLName,planCatalogURLImport,planCatalogURLEdit} from '../src/catalog-urls.mjs';
import {catalogQueryResults,catalogQueryWithScan} from '../src/catalog-search.mjs';
import {normalizeView} from '../src/views.mjs';
const catalog={id:'catalog',code:'ab',nextSequence:3};
const link={formatVersion:1,id:'ab2',kind:'url',url:'https://example.org/study',title:'Study',tagIds:['timber'],notes:'',updatedAt:'2026-10-28T04:00:00.000Z'};
test('URL records have no source binding and are canonical HTTP(S)',()=>{
  assert.equal(catalogURLName(link),'Study');
  assert.equal(catalogURLName({...link,title:''}),'example.org');
  for(const record of [{...link,url:'javascript:alert(1)'},{...link,sourceId:'source'},
    {...link,path:'x'},{...link,tagIds:['x','x']},{...link,title:'x'.repeat(121)}])
    assert.throws(()=>validateCatalogURLRecord(record));
});
test('import uses Catalog sequence and skips canonical duplicates without renaming files',()=>{
  const before=JSON.stringify(link);
  const result=planCatalogURLImport(catalog,[link],[{url:'https://example.org/study'},
    {url:'https://example.org/new',title:'New'},{url:'https://example.org/new'}],
    {tagIds:['timber'],timestamp:'2026-10-28T04:00:00.000Z'});
  assert.equal(result.skipped,2);
  assert.deepEqual(result.newRecords.map(x=>x.id),['ab3']);
  assert.equal(result.nextSequence,4);
  assert.equal(result.newRecords[0].sourceId,undefined);
  assert.deepEqual(result.newRecords[0].tagIds,['timber']);
  assert.equal(JSON.stringify(link),before);
});
test('allocator skips used IDs and rejects overflow',()=>{
  const result=planCatalogURLImport(catalog,[link,{id:'ab3',kind:'file'}],[{url:'https://other.org'}]);
  assert.equal(result.newRecords[0].id,'ab4');
  assert.throws(()=>planCatalogURLImport({...catalog,nextSequence:Number.MAX_SAFE_INTEGER},[],[{url:'https://x.org'}]),/exhausted/);
});
test('duplicate existing URL records fail closed',()=>{
  assert.throws(()=>planCatalogURLImport(catalog,[link,{...link,id:'ab1'}],[{url:'https://new.org'}]),/Duplicate Catalog URL/);
});
test('invalid inputs abort without mutating records',()=>{
  const records=[link],snapshot=JSON.stringify(records);
  assert.throws(()=>planCatalogURLImport(catalog,records,[{url:'https://new.org'},{url:'file:///tmp/x'}]));
  assert.equal(JSON.stringify(records),snapshot);
  assert.throws(()=>planCatalogURLImport(catalog,records,Array.from({length:21},()=>({url:'https://x.org'}))));
});
test('URL edits retain identity and URL, update tags and notes',()=>{
  const changed=planCatalogURLEdit(link,{title:' Updated ',notes:'Reference',tagIds:['roof']},'2026-10-28T03:00:00.000Z');
  assert.equal(changed.id,link.id);assert.equal(changed.url,link.url);
  assert.equal(changed.title,'Updated');assert.equal(changed.notes,'Reference');
  assert.deepEqual(changed.tagIds,['roof']);
  assert.ok(changed.updatedAt>link.updatedAt);
  assert.throws(()=>planCatalogURLEdit(link,{title:'',notes:'x'.repeat(4001),tagIds:[]}));
});
test('global saved Views find URLs with tags, query, and type filters; source scopes exclude URLs',()=>{
  const tags=[{id:'timber',name:'Timber',parentId:null}];
  const roots=[{id:'source',name:'Papers'}];
  const records=[link,{id:'ab1',kind:'file',sourceId:'source',path:'report.pdf',tagIds:['timber']}];
  assert.deepEqual(catalogQueryResults(records,roots,tags,{fileType:'url'}).map(x=>x.record.id),['ab2']);
  assert.deepEqual(catalogQueryResults(records,roots,tags,{tagIds:['timber'],query:'example.org'}).map(x=>x.record.id),['ab2']);
  assert.deepEqual(catalogQueryResults(records,roots,tags,{sourceId:'source'}).map(x=>x.record.id),['ab1']);
  assert.equal(catalogQueryResults(records,roots,tags,{fileType:'url',sourceId:'source'}).length,0);
  assert.equal(normalizeView({id:'v',name:'Links',fileType:'url',presentation:{mode:'list',size:150,sort:'name'}}).fileType,'url');
});
test('URL resources are never considered missing or unobjectified by source scans',()=>{
  const tags=[{id:'timber',name:'Timber',parentId:null}];
  const scan={entries:[],completeRootIds:['source'],overlaps:[{ancestorId:'source',descendantId:'other',prefix:''}]};
  const result=catalogQueryWithScan([link],[{id:'source',name:'Source'}],tags,{fileType:'url'},scan);
  assert.equal(result.length,1);assert.equal(result[0].missing,false);
  assert.equal(result[0].unobjectified,false);
});
test('app integration exposes Catalog links without source file writes',async()=>{
  const app=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(app,/case 'catalog-links'/);
  assert.match(app,/planCatalogURLImport/);
  assert.match(app,/kind==='url'/);
  assert.match(sw,/\.\/src\/catalog-urls\.mjs/);
});
