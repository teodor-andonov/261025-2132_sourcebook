import test from 'node:test';
import assert from 'node:assert/strict';
import {groupViewItems,viewTableMetadata} from '../src/view-layout.mjs';
const items=[
  {id:'one',name:'a.png',kind:'file',sourceId:'images',sourceName:'Images',parts:['gallery']},
  {id:'two',name:'b.pdf',kind:'file',sourceId:'docs',sourceName:'Documents',parts:['reports']},
  {id:'three',name:'c.png',kind:'file',sourceId:'images',sourceName:'Images',parts:['gallery']},
  {id:'four',name:'archive',kind:'directory',sourceId:'docs',sourceName:'Documents',parts:[]}
];
test('none grouping preserves all source ordering without changing input',()=>{
  const original=JSON.stringify(items);
  const result=groupViewItems(items,'none');
  assert.equal(result.length,1);
  assert.deepEqual(result[0].items.map(x=>x.id),items.map(x=>x.id));
  assert.equal(JSON.stringify(items),original);
});
test('source grouping is deterministic and keeps local order within each source',()=>{
  const result=groupViewItems(items,'source');
  assert.deepEqual(result.map(x=>x.label),['Documents','Images']);
  assert.deepEqual(result[1].items.map(x=>x.id),['one','three']);
  assert.deepEqual(groupViewItems(items,'source'),groupViewItems([...items],'source'));
});
test('folder grouping keeps same named folders from independent roots distinct',()=>{
  const matches=[...items,{id:'another',name:'z.png',kind:'file',sourceId:'docs',sourceName:'Documents',parts:['gallery']}];
  const result=groupViewItems(matches,'folder');
  assert.equal(result.filter(x=>x.label.endsWith('gallery')).length,2);
  assert.equal(result.reduce((sum,g)=>sum+g.items.length,0),matches.length);
});
test('type groups distinguish extensions and directories without opening any file',()=>{
  const result=groupViewItems(items,'type');
  assert.deepEqual(result.map(x=>x.label),['.pdf','.png','Folders']);
  assert.deepEqual(result.find(x=>x.label==='.png').items.map(x=>x.id),['one','three']);
});
test('invalid grouping fails closed',()=>{
  assert.throws(()=>groupViewItems(items,'surprise'),/Invalid View grouping/);
  assert.throws(()=>groupViewItems(null,'source'),/Invalid View items/);
});

test('table metadata displays provenance, tags and scan health without a write',()=>{
  const input={name:'render.pdf',kind:'file',location:'Documents / studies',missing:true,unobjectified:false};
  const before=JSON.stringify(input);
  const row=viewTableMetadata(input,['Architecture / Facades','Materials / Timber']);
  assert.deepEqual(row,{type:'PDF',location:'Documents / studies',tags:['Facades','Timber'],status:'Missing'});
  assert.equal(JSON.stringify(input),before);
  assert.equal(viewTableMetadata({name:'raw.xyz',kind:'file',unobjectified:true}).status,'Not cataloged');
  assert.equal(viewTableMetadata({name:'folder',kind:'directory',changedKind:true}).type,'Folder');
});
