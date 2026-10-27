import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogFolderTree,catalogFolderParts,nearestRootMatch} from '../src/catalog-folders.mjs';
const sources=[{id:'images',name:'Images'},{id:'docs',name:'Documents'}];
test('derived folder tree stops at the registered root and nests only real ancestors',()=>{
  const records=[
    {sourceId:'images',path:'gallery/img1.jpg',kind:'file'},
    {sourceId:'images',path:'gallery/sub/img2.png',kind:'file'},
    {sourceId:'docs',path:'reports/2026/overview.pdf',kind:'file'},
  ];
  const entries=catalogFolderTree(sources,records);
  assert.deepEqual(entries.map(x=>[x.sourceId,x.path]),[
    ['images',''],['images','gallery'],['images','gallery/sub'],
    ['docs',''],['docs','reports'],['docs','reports/2026']
  ]);
  assert.deepEqual(catalogFolderParts(entries[2].path),['gallery','sub']);
});
test('objectified folders show themselves; repeated files do not duplicate paths',()=>{
  const rows=catalogFolderTree(sources,[
    {sourceId:'images',path:'gallery',kind:'directory'},
    {sourceId:'images',path:'gallery/img1.png',kind:'file'},
    {sourceId:'images',path:'gallery/img2.png',kind:'file'},
  ]);
  assert.deepEqual(rows.filter(x=>x.sourceId==='images').map(x=>x.path),['','gallery']);
  assert.deepEqual(rows.filter(x=>x.sourceId==='docs').map(x=>x.path),['']);
});
test('ignores corrupt and unknown-source resource locations',()=>{
  const rows=catalogFolderTree([{id:'images',name:'Images'}],[
    {sourceId:'none',path:'a/b.png',kind:'file'},
    {sourceId:'images',path:'../escape/data.png',kind:'file'},
    {sourceId:'images',path:'a//b.png',kind:'file'},
    {sourceId:'images',path:'/absolute/file',kind:'file'},
    {sourceId:'images',path:'safe/photo.png',kind:'file'}
  ]);
  assert.deepEqual(rows.map(x=>x.path),['','safe']);
  assert.throws(()=>catalogFolderParts('../escape'));
});
test('overlapping root chooser prefers nearest (shortest valid relative route)',()=>{
  assert.deepEqual(nearestRootMatch([
    {sourceId:'images',parts:['gallery','img1.png']},
    {sourceId:'gallery',parts:['img1.png']}
  ]),{sourceId:'gallery',parts:['img1.png']});
  assert.equal(nearestRootMatch([{sourceId:'evil',parts:['..']}]),null);
});
