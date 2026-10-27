import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogQueryResults,sortCatalogResults,sortBrowserItems} from '../src/catalog-search.mjs';
import {ensureTagPath} from '../src/tags.mjs';
import {normalizeView,validateViews,createSavedView,updateSavedView,removeSavedView,assertViewsSnapshotUnchanged,sortViewsForSidebar} from '../src/views.mjs';
const roots=[{id:'a',name:'Images'},{id:'b',name:'Papers'}];
let i=0;
const tags=ensureTagPath([],'Architecture / Timber',()=> 't'+(++i));
const roof=ensureTagPath(tags.tags,'Architecture / Roofs',()=> 't'+(++i));
const records=[
  {id:'x1',sourceId:'a',path:'gallery/beam.png',kind:'file',tagIds:[tags.id]},
  {id:'x2',sourceId:'b',path:'notes/beam.pdf',kind:'file',tagIds:[tags.id]},
  {id:'x3',sourceId:'a',path:'gallery/roof.png',kind:'file',tagIds:[roof.id]},
  {id:'x4',sourceId:'a',path:'outside.png',kind:'file',tagIds:[]}
];
const spec={name:'Timber studies',sourceId:null,folderPath:'',tagId:tags.id,query:'beam',presentation:{mode:'gallery',size:170,sort:'name'}};
test('View create/update/rename/delete preserve stable identity and saved presentation',()=>{
  const created=createSavedView([],spec,'view-1');
  const changed=updateSavedView(created,'view-1',{name:'Wood',query:'#Timber',presentation:{mode:'list',size:120,sort:'type'}});
  assert.equal(changed[0].id,'view-1');
  assert.equal(changed[0].query,'#Timber');
  assert.deepEqual(removeSavedView(changed,'view-1'),[]);
  assert.equal(created[0].presentation.mode,'gallery');
});
test('invalid and duplicate Views are rejected',()=>{
  assert.throws(()=>createSavedView([],spec,''));
  assert.throws(()=>createSavedView(createSavedView([],spec,'a'),spec,'b'),/Duplicate/);
  assert.throws(()=>validateViews([{...spec,id:'v',folderPath:'../private',sourceId:'a'}]),/folder/);
  assert.throws(()=>normalizeView({...spec,id:'v',presentation:{...spec.presentation,size:500}}));
  assert.throws(()=>updateSavedView([],'missing',{name:'X'}),/no longer/);
});
test('catalog-wide View combines nested tag, query and cross-root results without writes',()=>{
  const before=JSON.stringify(records);
  const r=catalogQueryResults(records,roots,roof.tags,{tagId:tags.id,query:'beam'});
  assert.deepEqual(r.map(x=>x.sourceId),['b','a']);
  assert.equal(JSON.stringify(records),before);
});
test('folder scope is recursive and does not include siblings or other roots',()=>{
  const r=catalogQueryResults(records,roots,roof.tags,{sourceId:'a',folderPath:'gallery'});
  assert.deepEqual(r.map(x=>x.name),['beam.png','roof.png']);
  assert.deepEqual(catalogQueryResults(records,roots,roof.tags,{sourceId:'missing',folderPath:'gallery'}),[]);
  assert.throws(()=>catalogQueryResults(records,roots,roof.tags,{folderPath:'gallery'}),/needs a source/);
});
test('missing stable tag does not widen a saved View',()=>assert.deepEqual(catalogQueryResults(records,roots,[],{tagId:tags.id}),[]));
test('sorting deterministic and type/name descending supported',()=>{
  const r=catalogQueryResults(records,roots,roof.tags);
  assert.deepEqual(sortCatalogResults(r,'name-desc').map(x=>x.name),['roof.png','outside.png','beam.png','beam.pdf']);
  assert.deepEqual(sortCatalogResults(r,'type').map(x=>x.name),['beam.pdf','beam.png','outside.png','roof.png']);
  assert.deepEqual(sortCatalogResults(r,'name').map(x=>x.id),sortCatalogResults([...r].reverse(),'name').map(x=>x.id));
});
test('stale views.json snapshot refuses overwrite',()=>{
  const a=createSavedView([],spec,'a');
  assert.doesNotThrow(()=>assertViewsSnapshotUnchanged(a,structuredClone(a)));
  assert.throws(()=>assertViewsSnapshotUnchanged(a,updateSavedView(a,'a',{query:'roof'})),/changed/);
});

test('physical folder sort control preserves folders first and sorts remaining files',()=>{
  const items=[{name:'z.pdf',kind:'file'},{name:'B',kind:'directory'},{name:'a.png',kind:'file'},{name:'A',kind:'directory'}];
  assert.deepEqual(sortBrowserItems(items,'name-desc').map(x=>x.name),['B','A','z.pdf','a.png']);
  assert.deepEqual(sortBrowserItems(items,'type').map(x=>x.name),['A','B','z.pdf','a.png']);
});


test('backwards-compatible View fields default to unpinned and all files',()=>{
  const legacy={...spec,id:'v-legacy'};
  const normalized=normalizeView(legacy);
  assert.equal(normalized.fileType,'all');
  assert.equal(normalized.pinned,false);
  assert.doesNotThrow(()=>assertViewsSnapshotUnchanged([normalized],[legacy]));
  assert.throws(()=>assertViewsSnapshotUnchanged([normalized],[{...legacy,query:'roof'}]),/changed/);
});
test('View pins and file-type filters survive edit, sorting and validation',()=>{
  const a=createSavedView([],spec,'a');
  const b=createSavedView(a,{...spec,name:'Pinned PDF',fileType:'pdf',pinned:true},'b');
  assert.equal(b[1].fileType,'pdf');
  assert.equal(b[1].pinned,true);
  assert.deepEqual(sortViewsForSidebar(b).map(x=>x.id),['b','a']);
  const flipped=updateSavedView(b,'b',{pinned:false});
  assert.equal(flipped[1].pinned,false);
  assert.throws(()=>normalizeView({...spec,id:'c',fileType:'docx'}),/file type/);
  assert.throws(()=>normalizeView({...spec,id:'c',pinned:'true'}),/pin/);
});
test('catalog-wide file type filter separates gallery assets, PDFs and folders',()=>{
  const rich=[...records,{id:'folder',sourceId:'a',path:'gallery/archive',kind:'directory'}];
  assert.deepEqual(catalogQueryResults(rich,roots,roof.tags,{fileType:'image'}).map(x=>x.name),['beam.png','outside.png','roof.png']);
  assert.deepEqual(catalogQueryResults(rich,roots,roof.tags,{fileType:'pdf'}).map(x=>x.name),['beam.pdf']);
  assert.deepEqual(catalogQueryResults(rich,roots,roof.tags,{fileType:'folder'}).map(x=>x.name),['archive']);
  assert.deepEqual(catalogQueryResults(rich,roots,roof.tags,{fileType:'video'}),[]);
});

test('compound nested tags support AND / OR across catalog roots and file types',()=>{
  let i=0;
  const a=ensureTagPath([],'Architecture / Facades',()=> 'c'+(++i));
  const b=ensureTagPath(a.tags,'Materials / Timber',()=> 'c'+(++i));
  const c=ensureTagPath(b.tags,'Architecture / Facades / Glazed',()=> 'c'+(++i));
  const rs=[
    {id:'one',sourceId:'a',path:'gallery/timber.png',kind:'file',tagIds:[a.id,b.id]},
    {id:'two',sourceId:'b',path:'references/glazed.pdf',kind:'file',tagIds:[c.id]},
    {id:'three',sourceId:'a',path:'gallery/timber.pdf',kind:'file',tagIds:[b.id]}
  ];
  assert.deepEqual(catalogQueryResults(rs,roots,c.tags,{tagIds:[a.id,b.id],tagMode:'all'}).map(x=>x.record.id),['one']);
  assert.deepEqual(catalogQueryResults(rs,roots,c.tags,{tagIds:[a.id,b.id],tagMode:'any',fileType:'pdf'}).map(x=>x.record.id),['two','three']);
  assert.deepEqual(catalogQueryResults(rs,roots,c.tags,{tagIds:[c.id,b.id],tagMode:'all'}),[]);
});
test('missing/deleted tag IDs cannot silently widen compound Views',()=>{
  const r=catalogQueryResults(records,roots,roof.tags,{tagIds:[tags.id,'deleted-id'],tagMode:'all'});
  assert.deepEqual(r,[]);
  assert.deepEqual(catalogQueryResults(records,roots,roof.tags,{tagIds:['deleted-id'],tagMode:'any'}),[]);
  assert.deepEqual(catalogQueryResults(records,roots,roof.tags,{tagIds:[tags.id,'deleted-id'],tagMode:'any'}).map(x=>x.record.id),['x2','x1']);
  assert.throws(()=>catalogQueryResults(records,roots,roof.tags,{tagIds:['dup','dup']}),/Invalid tag filter/);
});
test('legacy single-tag View canonicalization is stable with multiple new tags',()=>{
  const before={...spec,id:'legacy'};
  assert.deepEqual(normalizeView(before).tagIds,[tags.id]);
  assert.doesNotThrow(()=>assertViewsSnapshotUnchanged([normalizeView(before)],[before]));
  const combined=normalizeView({...before,tagIds:[tags.id,roof.id],tagMode:'any'});
  assert.deepEqual(combined.tagIds,[tags.id,roof.id]);
  assert.equal(combined.tagId,tags.id);
  assert.equal(combined.tagMode,'any');
  assert.throws(()=>normalizeView({...before,tagIds:[tags.id,tags.id]}),/tag IDs/);
  assert.throws(()=>normalizeView({...before,tagMode:'xor'}),/tag logic/);
  assert.throws(()=>normalizeView({...before,tagIds:Array.from({length:17},(_,i)=>'id'+i)}),/tag IDs/);
});

test('table mode, grouping and location sort are saved and backwards compatible',()=>{
  const legacy=normalizeView({...spec,id:'legacy'});
  assert.equal(legacy.presentation.groupBy,'none');
  assert.doesNotThrow(()=>assertViewsSnapshotUnchanged([legacy],[{...spec,id:'legacy'}]));
  const view=normalizeView({...spec,id:'v2',presentation:{mode:'table',size:150,sort:'location',groupBy:'folder'}});
  assert.deepEqual(view.presentation,{mode:'table',size:150,sort:'location',groupBy:'folder'});
  const updated=updateSavedView([view],'v2',{presentation:{mode:'list',size:160,sort:'name',groupBy:'source'}});
  assert.equal(updated[0].presentation.groupBy,'source');
  assert.throws(()=>normalizeView({...spec,id:'bad',presentation:{mode:'grid',size:150,sort:'name'}}),/presentation/);
  assert.throws(()=>normalizeView({...spec,id:'bad',presentation:{mode:'table',size:150,sort:'name',groupBy:'unknown'}}),/grouping/);
});
test('location sort is deterministic across registered roots and folder paths',()=>{
  const r=catalogQueryResults(records,roots,roof.tags,{sort:'location'});
  assert.deepEqual(r.map(x=>x.path),['outside.png','gallery/beam.png','gallery/roof.png','notes/beam.pdf']);
  assert.deepEqual(sortCatalogResults([...r].reverse(),'location').map(x=>x.id),r.map(x=>x.id));
});
