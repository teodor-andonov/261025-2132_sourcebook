import test from 'node:test';
import assert from 'node:assert/strict';
import {plainRoot,PLAIN_ROOT_ID,createFolderTab,loadFolderTabs,visitFolderTab,folderHistoryTarget,closeFolderTab,folderTabPreferences,updateFolderTabPreferences,adjacentFolderTabId} from '../src/workspace.mjs';
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

test('Folder Tab preferences are bounded, normalized and do not touch handles',()=>{
  const defaults=folderTabPreferences(null);
  assert.deepEqual(defaults,{search:'',sort:'name',view:'gallery',size:164});
  assert.deepEqual(folderTabPreferences({search:'project',sort:'name-desc',view:'table',size:188.8}),
    {search:'project',sort:'name-desc',view:'table',size:189});
  assert.deepEqual(folderTabPreferences({search:'x'.repeat(257),sort:'delete',view:'unknown',size:1}),defaults);
  assert.equal(folderTabPreferences({search:'a\nb'}).search,'');
  let writes=0;
  const handle={...folder('A'),createWritable(){writes++;}};
  const tab=createFolderTab(handle,'a',{search:'photo',sort:'type',view:'list',size:200});
  assert.equal(tab.preferences.search,'photo');
  assert.equal(writes,0);
});
test('independent Folder Tab preferences survive reload and preserve other tabs',()=>{
  const a=createFolderTab(folder('A'),'a'),b=createFolderTab(folder('B'),'b');
  let tabs=updateFolderTabPreferences([a,b],'a',{search:'alpha',view:'table',sort:'name-desc',size:210});
  tabs=updateFolderTabPreferences(tabs,'b',{search:'beta',view:'list',sort:'type',size:130});
  assert.equal(tabs[0].preferences.search,'alpha');
  assert.equal(tabs[1].preferences.search,'beta');
  assert.equal(a.preferences.search,'');
  const saved=loadFolderTabs({tabs,activeId:'b'});
  assert.equal(saved.activeId,'b');
  assert.deepEqual(saved.tabs.map(t=>t.preferences),tabs.map(t=>t.preferences));
  const visited=visitFolderTab(saved.tabs,'a',['nested']);
  assert.deepEqual(visited[0].preferences,tabs[0].preferences);
  assert.deepEqual(visited[1].preferences,tabs[1].preferences);
});
test('older or malformed persisted Folder Tab preferences fail safe without discarding paths',()=>{
  const a=createFolderTab(folder('A'),'a');
  const legacy={...a,preferences:undefined,history:[[],['nested']],position:1};
  const invalid={...a,id:'b',preferences:{search:'\u0000',sort:'location',view:'grid',size:Infinity}};
  const restored=loadFolderTabs({tabs:[legacy,invalid],activeId:'a'});
  assert.deepEqual(restored.tabs[0].parts,['nested']);
  assert.deepEqual(restored.tabs[0].preferences,folderTabPreferences());
  assert.deepEqual(restored.tabs[1].preferences,folderTabPreferences());
  assert.throws(()=>updateFolderTabPreferences(restored.tabs,'missing',{view:'table'}),/Unknown/);
});
test('Folder Tab switching wraps, ignores invalid requests and never changes tab order',()=>{
  const tabs=['a','b','c'].map(id=>createFolderTab(folder(id),id));
  assert.equal(adjacentFolderTabId(tabs,'a',-1),'c');
  assert.equal(adjacentFolderTabId(tabs,'c',1),'a');
  assert.equal(adjacentFolderTabId(tabs,'a',2),'c');
  assert.equal(adjacentFolderTabId(tabs,'a',0),null);
  assert.equal(adjacentFolderTabId(tabs,'missing',1),null);
  assert.equal(adjacentFolderTabId([tabs[0]],'a',1),null);
  assert.deepEqual(tabs.map(t=>t.id),['a','b','c']);
});
