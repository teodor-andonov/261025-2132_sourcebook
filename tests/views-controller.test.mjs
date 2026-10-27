import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewsController} from '../src/views-controller.mjs';
import {ensureTagPath} from '../src/tags.mjs';

function fixture(){
  let i=0;const t=ensureTagPath([],'Architecture / Timber',()=> 't'+(++i));
  const saved={id:'v1',name:'Timber',sourceId:null,folderPath:'',tagId:t.id,query:'beam',presentation:{mode:'list',size:145,sort:'type'}};
  const state={catalog:{id:'cat1',code:'ab'},catalogHandle:{},sources:[{id:'a',name:'Images'}],
    taxonomy:t.tags,views:[saved],activeViewId:null,catalogTagView:null,tagFilter:null,search:'',
    sourceId:'a',parts:['gallery'],records:new Map([['r1',{id:'r1',sourceId:'a',path:'gallery/beam.png',kind:'file',tagIds:[t.id]}],
      ['r2',{id:'r2',sourceId:'a',path:'other/roof.png',kind:'file',tagIds:[]}]]),
    items:[],selected:new Set(),lastSelected:null,tagDraftItem:null,selectionMode:false,pageCount:150,
    view:'gallery',size:180,sort:'name',request:0,loading:false,bulkSaving:false,viewSaving:false};
  const disk={'catalog.json':{id:'cat1',code:'ab'},'views.json':structuredClone(state.views)};
  const writes=[],messages=[];let renders=0,forgot=0;
  const ui=createViewsController({state,readJson:async (_,key,fallback)=>structuredClone(disk[key]??fallback),
    writeJson:async (_,key,value)=>{writes.push(key);disk[key]=structuredClone(value);},
    authorized:async()=>true,render:()=>renders++,toast:(s,w)=>messages.push([s,w]),
    forgetImages:()=>forgot++,navigate:async()=>{},refreshRecords:async()=>{}});
  return {state,ui,disk,writes,messages,get renders(){return renders},get forgot(){return forgot}};
}
test('opening a saved View projects catalog metadata with saved query and presentation without writes',()=>{
  const f=fixture();
  f.ui.open('v1');
  assert.equal(f.state.activeViewId,'v1');
  assert.equal(f.state.search,'beam');
  assert.deepEqual([f.state.view,f.state.size,f.state.sort],['list',145,'type']);
  assert.deepEqual(f.state.items.map(x=>x.name),['beam.png']);
  assert.equal(f.state.items[0].catalogResult,true);
  assert.deepEqual(f.writes,[]);
  assert.equal(f.forgot,1);
});
test('View update writes only views.json, verifies readback and retains stable ID and scope',async()=>{
  const f=fixture();f.ui.open('v1');
  f.state.search='#Timber';f.state.view='gallery';f.state.size=220;
  assert.equal(await f.ui.update(),true);
  assert.deepEqual(f.writes,['views.json']);
  assert.equal(f.disk['views.json'][0].id,'v1');
  assert.equal(f.disk['views.json'][0].tagId,f.state.taxonomy.at(-1).id);
  assert.equal(f.disk['views.json'][0].query,'#Timber');
  assert.equal(f.disk['views.json'][0].presentation.size,220);
  assert.equal(f.state.viewSaving,false);
});
test('stale views.json refuses an overwrite, and leaves disk untouched',async()=>{
  const f=fixture();f.ui.open('v1');
  f.disk['views.json'][0].query='external edit';
  assert.equal(await f.ui.update(),false);
  assert.deepEqual(f.writes,[]);
  assert.equal(f.disk['views.json'][0].query,'external edit');
  assert.match(f.messages.at(-1)[0],/changed on disk/);
  assert.equal(f.state.viewSaving,false);
});
test('saving from a nested physical folder captures recursive source scope and leaves source files alone',async()=>{
  const f=fixture();f.state.views=[];f.disk['views.json']=[];
  assert.equal(await f.ui.save('Gallery'),true);
  assert.equal(f.disk['views.json'][0].sourceId,'a');
  assert.equal(f.disk['views.json'][0].folderPath,'gallery');
  assert.equal(f.disk['views.json'][0].tagId,null);
  assert.deepEqual(f.writes,['views.json']);
});


test('opening a filtered View restores its type and does not overwrite underlying files',()=>{
  const f=fixture();
  f.state.views[0].fileType='pdf';f.state.views[0].pinned=true;
  f.ui.open('v1');
  assert.equal(f.state.fileType,'pdf');
  assert.deepEqual(f.state.items,[]);
  assert.deepEqual(f.writes,[]);
});
test('pinning a View is an explicit catalog-only edit and keeps its identity',async()=>{
  const f=fixture();
  assert.equal(await f.ui.togglePin('v1'),true);
  assert.equal(f.state.views[0].pinned,true);
  assert.equal(f.state.views[0].id,'v1');
  assert.deepEqual(f.writes,['views.json']);
});
test('live file type change requeries active saved View without writing until Update',async()=>{
  const f=fixture();
  f.ui.open('v1');
  f.state.fileType='pdf';f.ui.requery();
  assert.deepEqual(f.state.items,[]);
  assert.deepEqual(f.writes,[]);
  assert.equal(await f.ui.update(),true);
  assert.equal(f.disk['views.json'][0].fileType,'pdf');
});

test('saving compound tag logic persists stable IDs without changing resources',async()=>{
  const f=fixture();f.state.views=[];f.disk['views.json']=[];
  const ids=[f.state.taxonomy.at(-1).id,'tag-new'];
  assert.equal(await f.ui.save('Combined',{tagIds:ids,tagMode:'any'}),true);
  assert.deepEqual(f.disk['views.json'][0].tagIds,ids);
  assert.equal(f.disk['views.json'][0].tagMode,'any');
  assert.equal(f.disk['views.json'][0].tagId,ids[0]);
  assert.deepEqual(f.writes,['views.json']);
});
test('reopening compound View preserves filters through Update without selecting tags again',async()=>{
  const f=fixture();
  f.state.views[0].tagIds=[f.state.taxonomy.at(-1).id,'missing'];
  f.state.views[0].tagMode='all';
  f.disk['views.json']=structuredClone(f.state.views); // This View was persisted before opening.
  f.ui.open('v1');
  assert.deepEqual(f.state.items,[]);
  assert.deepEqual(f.ui.selectedTags(),{tagIds:[f.state.taxonomy.at(-1).id,'missing'],tagMode:'all'});
  assert.equal(await f.ui.update(),true);
  assert.deepEqual(f.disk['views.json'][0].tagIds,[f.state.taxonomy.at(-1).id,'missing']);
});

test('editing View tag criteria changes matching results immediately after verified save',async()=>{
  const f=fixture();
  const matchId=f.state.taxonomy.at(-1).id;
  f.ui.open('v1');
  assert.deepEqual(f.state.items.map(x=>x.name),['beam.png']);
  assert.equal(await f.ui.update({tagIds:['deleted-id'],tagMode:'all'}),true);
  assert.deepEqual(f.state.items,[]);
  assert.deepEqual(f.disk['views.json'][0].tagIds,['deleted-id']);
  assert.deepEqual(f.writes,['views.json']);
  assert.equal(f.state.activeViewId,'v1');
});


test('View controller includes scanned ordinary files only when filters allow them',()=>{
  const f=fixture();
  f.state.scan={entries:[{sourceId:'a',path:'gallery/loose.pdf',kind:'file'}],completeRootIds:['a'],problems:[]};
  f.state.views[0].tagIds=[];f.state.views[0].tagId=null;f.state.views[0].query='';
  f.ui.open('v1');
  assert.deepEqual(f.state.items.map(x=>x.name),['beam.png','loose.pdf','roof.png']);
  assert.equal(f.state.items.find(x=>x.name==='loose.pdf').unobjectified,true);
  assert.equal(f.state.items.find(x=>x.name==='loose.pdf').record,null);
  f.state.search='loose';f.ui.requery();
  assert.deepEqual(f.state.items.map(x=>x.name),['beam.png','loose.pdf','roof.png']); // Search is applied by the shared browser surface.
  assert.deepEqual(f.writes,[]);
});
