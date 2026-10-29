import test from 'node:test';
import assert from 'node:assert/strict';
import {SELECTION_LIMIT,pruneVisibleSelection,changeVisibleSelection,selectDisplayedItems} from '../src/selection.mjs';
const ids=['a','b','c','d','e','f'];
const initial={selected:new Set(),anchorId:null,focusId:null};
test('plain click and Ctrl/Cmd toggles are independent of filesystem handles',()=>{
  const a=changeVisibleSelection(ids,initial,'b');
  assert.deepEqual([...a.selected],['b']);
  const b=changeVisibleSelection(ids,a,'d',{toggle:true});
  assert.deepEqual([...b.selected],['b','d']);
  const c=changeVisibleSelection(ids,b,'b',{toggle:true});
  assert.deepEqual([...c.selected],['d']);
  assert.equal(c.anchorId,'b');
  assert.equal(c.focusId,'b');
});
test('repeated Shift extends from stable anchor, not moving focus',()=>{
  const a=changeVisibleSelection(ids,initial,'b');
  const b=changeVisibleSelection(ids,a,'e',{range:true});
  const c=changeVisibleSelection(ids,b,'c',{range:true});
  assert.deepEqual([...b.selected],['b','c','d','e']);
  assert.deepEqual([...c.selected],['b','c']);
  assert.equal(c.anchorId,'b');
  assert.equal(c.focusId,'c');
});
test('Ctrl+Shift adds visible range without removing prior toggles',()=>{
  const a=changeVisibleSelection(ids,initial,'a');
  const b=changeVisibleSelection(ids,a,'e',{toggle:true});
  const c=changeVisibleSelection(ids,b,'c',{range:true,additive:true});
  assert.deepEqual([...c.selected],['a','e','c','d']);
  assert.equal(c.anchorId,'e');
});
test('filtering removes hidden IDs and repairs focus/anchor without changing source',()=>{
  const a=changeVisibleSelection(ids,initial,'b');
  const b=changeVisibleSelection(ids,a,'e',{range:true});
  const c=pruneVisibleSelection(['a','c','f'],b.selected,b.anchorId,b.focusId);
  assert.deepEqual([...c.selected],['c']);
  assert.equal(c.anchorId,null);assert.equal(c.focusId,null);
  assert.equal(c.changed,true);
  assert.equal(pruneVisibleSelection(['c'],c.selected,c.anchorId,c.focusId).changed,false);
});
test('Shift on hidden anchor selects target only',()=>{
  const a=changeVisibleSelection(ids,initial,'b');
  const b=changeVisibleSelection(['a','c','e'],a,'e',{range:true});
  assert.deepEqual([...b.selected],['e']);
});
test('Select shown is bounded and reports truncation rather than silently claiming all',()=>{
  const many=Array.from({length:300},(_,i)=>'id-'+i);
  const result=selectDisplayedItems(many);
  assert.equal(result.selected.size,SELECTION_LIMIT);
  assert.equal(result.truncated,true);
  assert.equal(result.anchorId,'id-0');
  assert.equal(result.focusId,'id-249');
  assert.equal(selectDisplayedItems(['a','b']).truncated,false);
});
test('oversized Shift range fails without changing original selection',()=>{
  const many=Array.from({length:300},(_,i)=>'id-'+i);
  const a=changeVisibleSelection(many,initial,'id-0');
  assert.throws(()=>changeVisibleSelection(many,a,'id-299',{range:true}),/at most 250/);
  assert.deepEqual([...a.selected],['id-0']);
});
test('selection rejects hidden targets and invalid limits',()=>{
  assert.throws(()=>changeVisibleSelection(ids,initial,'hidden'),/not visible/);
  assert.throws(()=>selectDisplayedItems(ids,251),/limit/);
  assert.throws(()=>selectDisplayedItems(ids,0),/limit/);
  assert.throws(()=>changeVisibleSelection(ids,initial,'a',{limit:Infinity}),/limit/);
  assert.throws(()=>pruneVisibleSelection([null],new Set()),/visible/);
});
test('no selection persists in Folder Tab preferences and no file handles are touched',async()=>{
  const {createFolderTab}=await import('../src/workspace.mjs');
  let writes=0;
  const handle={kind:'directory',name:'Test',async *entries(){},getFileHandle(){writes++;}};
  const tab=createFolderTab(handle,'tab-a');
  const selected=selectDisplayedItems(['a','b']);
  assert.equal(writes,0);
  assert.equal('selected' in tab.preferences,false);
  assert.equal(selected.selected.size,2);
});
