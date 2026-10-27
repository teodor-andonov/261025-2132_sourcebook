import test from 'node:test';
import assert from 'node:assert/strict';
import {describeFileSymbol,sidePreviewKind} from '../src/file-symbols.mjs';
test('extension-first icon language covers architecture, documents and media',()=>{
  assert.deepEqual([describeFileSymbol({kind:'file',name:'plan.ifc'}).label,describeFileSymbol({kind:'file',name:'site.dwg'}).label,describeFileSymbol({kind:'file',name:'report.pdf'}).label],['IFC','DWG','PDF']);
  assert.notEqual(describeFileSymbol({kind:'file',name:'plan.ifc'}).hue,describeFileSymbol({kind:'file',name:'report.pdf'}).hue);
  assert.equal(describeFileSymbol({kind:'file',name:'image.JPEG'}).label,'JPG');
});
test('unknown suffix and missing suffix are neutral and bounded',()=>{
  const a=describeFileSymbol({kind:'file',name:'thing.zzzzzzzzzz'}),b=describeFileSymbol({kind:'file',name:'README'});
  assert.equal(a.label,'ZZZZ');assert.equal(a.hue,215);assert.equal(a.known,false);
  assert.equal(b.label,'FILE');assert.equal(b.hue,215);
});
test('directories stay neutral folders; symbols never modify resources',()=>{
  const file={kind:'directory',name:'project.ifc'};
  const before=JSON.stringify(file);
  assert.equal(describeFileSymbol(file).folder,true);
  assert.equal(sidePreviewKind(file,0),'folder');
  assert.equal(JSON.stringify(file),before);
});
test('side preview never treats binary architecture files as text',()=>{
  assert.equal(sidePreviewKind({kind:'file',name:'file.ifc'},100),'other');
  assert.equal(sidePreviewKind({kind:'file',name:'notes.md'},100),'text');
  assert.equal(sidePreviewKind({kind:'file',name:'notes.md'},2*1024*1024),'large-text');
  assert.equal(sidePreviewKind({kind:'file',name:'camera.mov'},100),'video');
  assert.equal(sidePreviewKind({kind:'file',name:'scan.pdf'},100),'pdf');
  assert.equal(sidePreviewKind({kind:'file',name:'sound.wav'},100),'audio');
});
