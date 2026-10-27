import test from 'node:test';
import assert from 'node:assert/strict';
import {plainRoot,PLAIN_ROOT_ID,createFolderTab,loadFolderTabs,visitFolderTab,folderHistoryTarget,closeFolderTab} from '../src/workspace.mjs';
const folder=name=>({kind:'directory',name,async *entries(){},async queryPermission(){return 'granted';}});
test('read-only standalone folder identification does not mutate a handle',()=>{
  let writes=0;
  const handle={...folder('References'),getFileHandle(){writes++;}};
  assert.deepEqual(plainRoot(handle),{id:PLAIN_ROOT_ID,name:'References'});
  assert.equal(writes,0);
});
test('invalid directories and traversal components are rejected',()=>{
  for(const handle of [null,{kind:'file',name:'a.png'},{kind:'directory',name:'broken'}])assert.throws(()=>plainRoot(handle),/directory/i);
  const a=createFolderTab(folder('A'),'tab-a');
  assert.throws(()=>createFolderTab(folder('B'),''),/ID/);
  assert.throws(()=>visitFolderTab([a],a.id,['..']),/path/);
  assert.throws(()=>visitFolderTab([a],a.id,['a/b']),/path/);
  assert.throws(()=>visitFolderTab([a],'unknown',['a']),/Unknown/);
});
test('tab paths and histories remain independent; back/forward and branch truncation',()=>{
  const a=createFolderTab(folder('A'),'a'),b=createFolderTab(folder('B'),'b');
  let tabs=visitFolderTab([a,b],'a',['drafts']);
  tabs=visitFolderTab(tabs,'a',['drafts','images']);
  tabs=visitFolderTab(tabs,'b',['projects']);
  assert.deepEqual(tabs[1].parts,['projects']);
  assert.deepEqual(folderHistoryTarget(tabs,'a',-1),{position:1,parts:['drafts']});
  tabs=visitFolderTab(tabs,'a',['drafts'],{historyPosition:1});
  assert.deepEqual(folderHistoryTarget(tabs,'a',1),{position:2,parts:['drafts','images']});
  tabs=visitFolderTab(tabs,'a',['drafts','notes']);
  assert.equal(folderHistoryTarget(tabs,'a',1),null);
  assert.deepEqual(tabs[0].history,[[],['drafts'],['drafts','notes']]);
  assert.deepEqual(tabs[1].history,[[],['projects']]);
  assert.deepEqual(tabs[1].parts,['projects']);
});
test('persisted folder tabs recover valid histories and fall back on damaged session',()=>{
  const a=createFolderTab(folder('A'),'a'),b=createFolderTab(folder('B'),'b');
  const tabs=visitFolderTab([a,b],'a',['gallery']);
  const loaded=loadFolderTabs({tabs,activeId:'a'});
  assert.deepEqual(loaded.tabs[0].parts,['gallery']);
  assert.equal(loaded.activeId,'a');
  assert.deepEqual(loadFolderTabs({tabs:[{...a,history:[['..']],position:0},b],activeId:'missing'}).tabs[0].parts,[]);
  assert.equal(loadFolderTabs({tabs:[a,a,b],activeId:'unknown'}).tabs.length,2);
  assert.deepEqual(loadFolderTabs({tabs:[],activeId:'a'}),{tabs:[],activeId:null});
});
test('closing tab selects adjacent tab without mutating survivor or files',()=>{
  const tabs=[createFolderTab(folder('A'),'a'),createFolderTab(folder('B'),'b'),createFolderTab(folder('C'),'c')];
  const after=closeFolderTab(tabs,'b','b');
  assert.deepEqual(after.tabs.map(t=>t.id),['a','c']);
  assert.equal(after.activeId,'c');
  assert.equal(closeFolderTab(after.tabs,'a','c').activeId,'c');
  assert.deepEqual(tabs.map(t=>t.id),['a','b','c']);
});
