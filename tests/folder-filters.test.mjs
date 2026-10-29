import test from 'node:test';
import assert from 'node:assert/strict';
import {FOLDER_FILE_TYPES,folderFileType,filterFolderEntries} from '../src/folder-filters.mjs';
const file=name=>({name,kind:'file'}),dir=name=>({name,kind:'directory'});
test('Folder discovery classifies physical files without opening or changing them',()=>{
  const cases=[['project.url','url'],['notes.md','text'],['model.PDF','pdf'],['photo.avif','image'],
    ['sound.FLAC','audio'],['clip.mkv','video'],['bundle.tar.gz','archive'],['model.ifc','other']];
  for(const [name,expected] of cases)assert.equal(folderFileType(file(name)),expected);
  assert.equal(folderFileType(dir('assets.md')),'folder');
  assert.equal(folderFileType({kind:'url',name:'legacy'}),'other');
  assert.equal(new Set(FOLDER_FILE_TYPES.map(([id])=>id)).size,FOLDER_FILE_TYPES.length);
});
test('Folder search is literal, case-insensitive, filename-only and bounded to current entries',()=>{
  const input=[file('alpha#1.md'),file('ALPHA.url'),file('beta.md')];
  assert.deepEqual(filterFolderEntries(input,{query:'  #1  '}),[input[0]]);
  assert.deepEqual(filterFolderEntries(input,{query:'alpha'}),input.slice(0,2));
  assert.deepEqual(filterFolderEntries(input,{query:'not-found'}),[]);
  assert.deepEqual(input.map(x=>x.name),['alpha#1.md','ALPHA.url','beta.md']);
});
test('type filtering and dotfile visibility combine without modifying source handles',()=>{
  const input=[dir('.private'),dir('work'),file('.secret.md'),file('notes.md'),file('link.url'),file('drawing.ifc')];
  assert.deepEqual(filterFolderEntries(input,{showHidden:false}).map(x=>x.name),['work','notes.md','link.url','drawing.ifc']);
  assert.deepEqual(filterFolderEntries(input,{fileType:'text'}).map(x=>x.name),['.secret.md','notes.md']);
  assert.deepEqual(filterFolderEntries(input,{fileType:'folder',showHidden:false}),[input[1]]);
  assert.deepEqual(filterFolderEntries(input,{fileType:'url',query:'LINK'}),[input[4]]);
  assert.deepEqual(filterFolderEntries(input,{fileType:'other'}),[input[5]]);
});
test('filename identity suffixes may be hidden for display search but remain original entries',()=>{
  const input=[file('Timber[ab967].md')];
  assert.deepEqual(filterFolderEntries(input,{query:'Timber',nameOf:item=>item.name.split('[')[0]}),input);
  assert.deepEqual(filterFolderEntries(input,{query:'ab967',nameOf:item=>item.name.split('[')[0]}),[]);
});
test('invalid filters fail closed; unknown file types cannot bypass filtering',()=>{
  for(const opts of [{fileType:'any'},{query:123},{showHidden:'no'},{nameOf:2}])
    assert.throws(()=>filterFolderEntries([file('a.md')],opts),/Invalid Folder filter/);
  assert.throws(()=>filterFolderEntries(null),/Invalid Folder filter/);
});
