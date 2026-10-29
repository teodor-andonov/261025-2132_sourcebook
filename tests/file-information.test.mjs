import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceRelativePath,resourceDisplayPath,selectedResourcePaths,
  formatFileSize,readResourceFileMetadata,MAX_COPIED_PATH_CHARS} from '../src/file-information.mjs';

const file=(id,name,extra={})=>({id,name,kind:'file',...extra});
test('root-labelled paths stay relative and never invent an OS absolute path',()=>{
  const plain=file('1','notes.md');
  assert.equal(resourceRelativePath(plain,['Design','Ideas']),'Design/Ideas/notes.md');
  assert.equal(resourceDisplayPath(plain,{folderParts:['Design'],rootName:'Workspace'}),'Workspace/Design/notes.md');
  const catalog=file('2','link.url',{catalogResult:true,parts:['References'],sourceName:'Shared Folder'});
  assert.equal(resourceDisplayPath(catalog,{rootName:'ignored'}),'Shared Folder/References/link.url');
  assert.throws(()=>resourceRelativePath({kind:'url',name:'Legacy',id:'old'}),/ordinary filesystem/);
  assert.throws(()=>resourceRelativePath(plain,['..']),/Invalid Resource/);
  assert.throws(()=>resourceRelativePath(file('3','bad\nname')),/ordinary filesystem/);
  assert.throws(()=>resourceDisplayPath(plain,{rootName:'../private'}),/Folder name/);
});
test('selection copies in displayed order across pages, bounded and without changing selection',()=>{
  const items=[file('a','a.md'),file('b','b.url'),file('c','c.md')];
  const selected=new Set(['c','a']);
  assert.equal(selectedResourcePaths(items,selected,{rootName:'Root'}),'Root/a.md\nRoot/c.md');
  assert.deepEqual([...selected],['c','a']);
  assert.throws(()=>selectedResourcePaths(items,new Set(['missing']),{rootName:'Root'}),/Selection changed/);
  assert.throws(()=>selectedResourcePaths([file('a','a.md'),file('a','a.md')],new Set(['a']),{rootName:'Root'}),/Duplicate/);
  assert.throws(()=>selectedResourcePaths([file('x','legacy.url',{kind:'url'})],new Set(['x']),{rootName:'Root'}),/ordinary filesystem/);
  assert.throws(()=>selectedResourcePaths(items,new Set(),{rootName:'Root'}),/Select 1/);
  assert.throws(()=>selectedResourcePaths(Array.from({length:251},(_,i)=>file(String(i),'a.md')),
    new Set(Array.from({length:251},(_,i)=>String(i))),{rootName:'Root'}),/Select 1/);
  assert.ok(MAX_COPIED_PATH_CHARS>=65536);
});
test('file size is binary and file metadata requires no content reads',async()=>{
  assert.equal(formatFileSize(0),'0 B');
  assert.equal(formatFileSize(1023),'1023 B');
  assert.equal(formatFileSize(1536),'1.5 KiB');
  assert.equal(formatFileSize(1024*1024),'1 MiB');
  assert.throws(()=>formatFileSize(-1),/Invalid/);
  let calls=0;
  const result=await readResourceFileMetadata({kind:'file',async getFile(){calls++;
    return {size:1536,lastModified:1793250000000,type:'text/markdown',
      text(){throw Error('Must not read contents');},arrayBuffer(){throw Error('Must not read contents');}};
  }});
  assert.equal(calls,1);
  assert.deepEqual(result,{size:1536,lastModified:1793250000000,type:'text/markdown'});
  await assert.rejects(()=>readResourceFileMetadata({kind:'directory'}),/readable file/);
  await assert.rejects(()=>readResourceFileMetadata({kind:'file',async getFile(){throw Error('Permission denied');}}),/Permission denied/);
  await assert.rejects(()=>readResourceFileMetadata({kind:'file',async getFile(){return {size:-1,lastModified:0};}}),/invalid metadata/);
});
