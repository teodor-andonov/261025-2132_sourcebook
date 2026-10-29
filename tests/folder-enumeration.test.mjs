import test from 'node:test';
import assert from 'node:assert/strict';
import {enumerateFolderEntries,FOLDER_ENUMERATION_LIMIT} from '../src/folder-enumeration.mjs';

function folder(count,{onClose=()=>{},broken=false}={}){
  return {async *entries(){
    try{
      for(let i=0;i<count;i++){
        if(broken&&i===4)throw Error('Provider read failed');
        yield ['file-'+i+'.md',{kind:'file',name:'file-'+i+'.md'}];
      }
    }finally{onClose();}
  }};
}
const immediate=async()=>{};
test('progressive Folder reads preserve source entries and yield bounded snapshots',async()=>{
  const snapshots=[],source=folder(9),before=Object.keys(source);
  const result=await enumerateFolderEntries(source,{sourceId:'tab',parts:['nested'],maxEntries:10,batchSize:3,
    progressIntervalMs:0,yieldControl:immediate,onProgress:items=>snapshots.push(items)});
  assert.deepEqual(snapshots.map(items=>items.length),[3,6,9]);
  assert.equal(result.items.length,9);
  assert.equal(result.items[0].id,'tab:nested/file-0.md');
  assert.equal(result.truncated,false);
  assert.equal(result.cancelled,false);
  assert.deepEqual(Object.keys(source),before);
  assert.notStrictEqual(snapshots[0],result.items);
});
test('Folder safety limit marks partial results and closes the provider iterator',async()=>{
  let closed=0;
  const result=await enumerateFolderEntries(folder(30,{onClose:()=>closed++}),{
    sourceId:'a',maxEntries:10,batchSize:5,yieldControl:immediate});
  assert.equal(result.items.length,10);
  assert.equal(result.truncated,true);
  assert.equal(result.visited,11);
  assert.equal(closed,1);
});
test('exactly-at-limit Folder is complete; filtered entries do not consume capacity',async()=>{
  const full=await enumerateFolderEntries(folder(10),{sourceId:'a',maxEntries:10,batchSize:5,yieldControl:immediate});
  assert.equal(full.truncated,false);
  const filtered=await enumerateFolderEntries(folder(12),{sourceId:'a',maxEntries:10,batchSize:5,yieldControl:immediate,
    include:name=>!['file-0.md','file-1.md'].includes(name)});
  assert.equal(filtered.items.length,10);
  assert.equal(filtered.truncated,false);
});
test('navigation cancellation stops the iterator without leaking stale results',async()=>{
  let current=true,closed=0;
  const result=await enumerateFolderEntries(folder(20,{onClose:()=>closed++}),{sourceId:'a',
    maxEntries:20,batchSize:2,progressIntervalMs:0,
    onProgress:()=>{},yieldControl:async()=>{current=false;},isCurrent:()=>current});
  assert.equal(result.cancelled,true);
  assert.deepEqual(result.items,[]);
  assert.equal(closed,1);
});
test('provider failures are propagated, never reported as completed scans',async()=>{
  await assert.rejects(enumerateFolderEntries(folder(10,{broken:true}),{
    sourceId:'a',maxEntries:10,batchSize:2,yieldControl:immediate}),/Provider read failed/);
});
test('invalid input and unsafe entry names fail closed',async()=>{
  await assert.rejects(enumerateFolderEntries(null,{sourceId:'a'}),/readable Folder/);
  await assert.rejects(enumerateFolderEntries(folder(2),{sourceId:'a',maxEntries:FOLDER_ENUMERATION_LIMIT+1}),/limit/);
  await assert.rejects(enumerateFolderEntries(folder(2),{sourceId:'a',parts:['..']}),/path/);
  await assert.rejects(enumerateFolderEntries({async *entries(){yield ['../evil',{kind:'file'}];}},{
    sourceId:'a',maxEntries:2}),/Invalid Folder entry/);
});
test('render throttling does not prevent yielding to the event loop',async()=>{
  let clock=0,yields=0;
  const snapshots=[];
  const result=await enumerateFolderEntries(folder(12),{sourceId:'a',maxEntries:12,batchSize:2,
    progressIntervalMs:100,now:()=>clock,yieldControl:async()=>{clock+=25;yields++;},
    onProgress:items=>snapshots.push(items.length)});
  assert.equal(result.items.length,12);
  assert.equal(yields,6);
  assert.deepEqual(snapshots,[2,10]);
});
