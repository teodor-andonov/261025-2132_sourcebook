import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareSharedFiles,validateSharedFileDescriptors,restoreSharedFiles,requestSharedFileDownload,
  MAX_SHARED_FILES,MAX_SHARED_FILE_BYTES,MAX_SHARED_TOTAL_BYTES} from '../src/shared-files.mjs';
import {prepareIncomingShare,normalizeIncomingRecord} from '../src/share-inbox.mjs';

const id='123e4567-e89b-42d3-a456-426614174000';
const options={idFactory:()=>id,now:()=> '2026-10-28T15:26:00Z'};
const file=(name,bytes='example',type='text/plain')=>{
  const blob=new Blob([bytes],{type});
  return {name,size:blob.size,type:blob.type,arrayBuffer:()=>blob.arrayBuffer(),slice:(...args)=>blob.slice(...args)};
};
test('accepts bounded ordinary file shares as temporary metadata, never a catalog Resource',()=>{
  const a=file('Drawing[ab967].pdf','%PDF-1.7','application/pdf');
  const b=file('notes.md','# Note','text/markdown');
  const p=prepareSharedFiles([a,b]);
  assert.deepEqual(p.descriptors,[{name:a.name,size:a.size,type:a.type},{name:b.name,size:b.size,type:b.type}]);
  const record=prepareIncomingShare({}, {...options,fileDescriptors:p.descriptors});
  assert.equal(record.kind,'files');
  assert.equal(record.candidate,null);
  assert.deepEqual(normalizeIncomingRecord(record),record);
});
test('mixed URL and files preserve both without silently objectifying either',()=>{
  const p=prepareSharedFiles([file('diagram.png','PNG','image/png')]);
  const record=prepareIncomingShare({title:'Drawing',url:'https://example.org/'},{...options,fileDescriptors:p.descriptors});
  assert.equal(record.kind,'files');assert.equal(record.candidate,'https://example.org/');
  assert.equal(record.files.length,1);
});
test('old text-only inbox records normalize without file attachments',()=>{
  const record=prepareIncomingShare({text:'https://example.org/'},options);
  const old={...record};delete old.files;
  assert.deepEqual(normalizeIncomingRecord(old),record);
});
test('refuses empty, too many, oversized and over-total file shares',()=>{
  assert.deepEqual(prepareSharedFiles([]),{files:[],descriptors:[]});
  assert.throws(()=>validateSharedFileDescriptors([{name:'empty.txt',size:0,type:'text/plain'}]),/nonempty/);
  assert.throws(()=>validateSharedFileDescriptors([{name:'huge.bin',size:MAX_SHARED_FILE_BYTES+1,type:''}]),/25 MiB/);
  assert.throws(()=>validateSharedFileDescriptors(Array.from({length:MAX_SHARED_FILES+1},(_,i)=>({name:i+'.txt',size:1,type:''}))),/Too many/);
  assert.throws(()=>validateSharedFileDescriptors([{name:'a.bin',size:MAX_SHARED_FILE_BYTES,type:''},{name:'b.bin',size:MAX_SHARED_FILE_BYTES,type:''},{name:'c.bin',size:1,type:''}]),/50 MiB/);
  assert.equal(MAX_SHARED_TOTAL_BYTES,50*1024*1024);
});
test('refuses unsafe filenames and case-insensitive collisions',()=>{
  for(const name of ['../evil.txt','CON.txt','bad\\path.txt','bad:name.txt','.hidden','trailing.','a'.repeat(181)+'.txt']){
    assert.throws(()=>validateSharedFileDescriptors([{name,size:1,type:'text/plain'}]),/Unsupported file/);
  }
  assert.throws(()=>validateSharedFileDescriptors([{name:'Plan.PDF',size:1,type:''},{name:'plan.pdf',size:1,type:''}]),/colliding/);
});
test('refuses invalid MIME and non-readable payloads',()=>{
  assert.throws(()=>validateSharedFileDescriptors([{name:'a.txt',size:1,type:'bad type'}]),/content type/);
  assert.throws(()=>prepareSharedFiles([{name:'a.txt',size:1,type:'text/plain'}]),/readable/);
});
test('restore rejects missing, reordered or damaged attachment payloads',()=>{
  const a=new Blob(['abc'],{type:'text/plain'});
  const meta=[{name:'a.txt',size:3,type:'text/plain'}];
  assert.throws(()=>restoreSharedFiles([],meta),/missing or damaged/);
  assert.throws(()=>restoreSharedFiles([new Blob(['ab'],{type:'text/plain'})],meta),/differs/);
  assert.throws(()=>restoreSharedFiles([new Blob(['abc'],{type:'application/pdf'})],meta),/differs/);
  const restored=restoreSharedFiles([a],meta,{fileFactory:(parts,name,opts)=>({parts,name,type:opts.type})});
  assert.equal(restored[0].name,'a.txt');
});
test('inbox rejects altered metadata and file identity',()=>{
  const d=[{name:'x.png',size:3,type:'image/png'}];
  const record=prepareIncomingShare({}, {...options,fileDescriptors:d});
  assert.throws(()=>normalizeIncomingRecord({...record,files:[{...d[0],size:4}]}),/inconsistent/);
  assert.throws(()=>normalizeIncomingRecord({...record,kind:'url'}),/inconsistent/);
});
test('browser download is explicitly unverified and preserves original filename',()=>{
  const f=file('drawing.pdf','test','application/pdf');
  let clicked=false,revoked=false,download;
  const env={document:{body:{append:()=>{}},createElement:()=>({style:{},click(){clicked=true;download=this.download;},remove(){}})},
    URL:{createObjectURL:()=> 'blob:example',revokeObjectURL:()=>{revoked=true;}},setTimeout:fn=>fn()};
  const result=requestSharedFileDownload(f,{env});
  assert.equal(download,'drawing.pdf');assert.equal(clicked,true);assert.equal(revoked,true);
  assert.deepEqual(result,{name:'drawing.pdf',delivery:'browser-download',verified:false});
});
test('manifest, SW and app wire Android file shares without automatic source mutation',async()=>{
  const [manifest,sw,app,inbox]=await Promise.all([
    readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8').then(JSON.parse),
    readFile(new URL('../sw.js',import.meta.url),'utf8'),
    readFile(new URL('../src/app.mjs',import.meta.url),'utf8'),
    readFile(new URL('../src/share-inbox.mjs',import.meta.url),'utf8')]);
  assert.deepEqual(manifest.share_target.params.files,[{name:'files',accept:['*/*']}]);
  assert.match(sw,/prepareSharedFiles\(form\.getAll\('files'\)\)/);
  assert.match(sw,/enqueueIncomingShare\(item,\{files:shared\.files\}\)/);
  assert.match(sw,/\.\/src\/shared-files\.mjs/);
  assert.match(sw,/startsWith\('sourcebook-shell-'\)/);
  assert.match(inbox,/indexedDB\.open\(SHARE_INBOX_DB,2\)/);
  assert.match(inbox,/tx\.objectStore\(ATTACHMENTS\)\.add/);
  assert.match(inbox,/getIncomingShareFiles/);
  assert.match(inbox,/data-share="review-files"/);
  assert.match(inbox,/data-share="download-file"/);
  assert.match(app,/onImportFiles:async\(files,id\)=>showFileImport/);
  assert.match(app,/await removeIncomingShare\(id\)/);
  assert.match(app,/const cleanup=pendingFileImportCleanup/);
  assert.doesNotMatch(inbox,/createWritable|showDirectoryPicker/);
});
