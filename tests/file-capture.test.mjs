import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPastedText,planFileCapture,parseInternetShortcut,writeCapturedFile} from '../src/file-capture.mjs';

const settings={now:new Date('2026-10-28T07:00:00Z'),random:'ab42dc19'};
test('URL paste becomes a genuine Internet Shortcut with no web requests',()=>{
  const classified=classifyPastedText('https://example.org/a?b=1');
  const plan=planFileCapture(classified,{...settings,title:'Concept | Notes'});
  assert.equal(plan.name,'example.org-20261028-070000-ab42dc19.url');
  assert.equal(plan.text,'[InternetShortcut]\r\nURL=https://example.org/a?b=1\r\n');
  assert.equal(parseInternetShortcut(plan.text),'https://example.org/a?b=1');
  assert.equal(parseInternetShortcut('[InternetShortcut]\nURL=javascript:alert(1)\n'),null);
});
test('text is kept literally and materializes as Markdown',()=>{
  const classified=classifyPastedText('# Study\n\nA note!');
  const plan=planFileCapture(classified,settings);
  assert.equal(plan.kind,'text');assert.ok(plan.name.endsWith('.md'));
  assert.equal(plan.text,'# Study\n\nA note!\n');
  assert.equal(classifyPastedText('not a link').kind,'text');
});
test('empty, oversized and unsafe capture is rejected before filesystem write',()=>{
  assert.throws(()=>classifyPastedText(' '),/Nothing/);
  assert.throws(()=>classifyPastedText('x'.repeat(1024*1024+1)),/1 MiB/);
  assert.throws(()=>planFileCapture({kind:'url',value:'file:///secret'},settings),/HTTP/);
  assert.throws(()=>planFileCapture({kind:'text',value:'test'},{...settings,random:'!'}),/unique/);
});
function fakeDirectory(){
  const files=new Map();let writes=0;
  const d={kind:'directory',files,get writes(){return writes;},async *entries(){for(const name of files.keys())yield [name,{}];},async getFileHandle(name,opts={}){
    if(!files.has(name)){if(!opts.create)throw Object.assign(Error('missing'),{name:'NotFoundError'});files.set(name,'');}
    return {async getFile(){return {size:files.get(name).length,text:async()=>files.get(name)};},
      async createWritable(){return {async write(text){writes++;files.set(name,text);},async close(){},async abort(){}}}};
  }};
  return d;
}
test('new captured file can be read back in real-looking filesystem API',async()=>{
  const d=fakeDirectory(),plan=planFileCapture({kind:'text',value:'My note'},settings);
  const result=await writeCapturedFile(d,plan);
  assert.equal(result.name,plan.name);
  assert.equal(d.files.get(plan.name),plan.text);
  assert.equal(d.writes,1);
});
test('existing file is never overwritten even when generated name collides',async()=>{
  const d=fakeDirectory(),plan=planFileCapture({kind:'url',value:'https://openai.com/'},settings);
  d.files.set(plan.name,'keep me');
  await assert.rejects(()=>writeCapturedFile(d,plan),/already exists/);
  assert.equal(d.files.get(plan.name),'keep me');assert.equal(d.writes,0);
});
test('malformed capture plan refuses to touch filesystem',async()=>{
  const d=fakeDirectory();
  await assert.rejects(()=>writeCapturedFile(d,{kind:'url',name:'../../bad.url',text:'huh'}),/Invalid file capture plan/);
  assert.equal(d.files.size,0);
});

test('Markdown heading and non-Latin filenames remain safe and valid',async()=>{
  const d=fakeDirectory();
  const plan=planFileCapture({kind:'text',value:'# Фасади / Материали'},{...settings,title:'# Фасади / Материали'});
  assert.match(plan.name,/Фасади.*Материали.*\.md$/u);
  await writeCapturedFile(d,plan);
  assert.equal(d.files.get(plan.name),'# Фасади / Материали\n');
});

test('case-only collision in capture refuses overwrite',async()=>{
  const d=fakeDirectory(),plan=planFileCapture({kind:'text',value:'notes'},settings);
  d.files.set(plan.name.toUpperCase(),'keep');
  await assert.rejects(writeCapturedFile(d,plan),/case-only collision/);
  assert.equal(d.writes,0);
});

test('Windows shortcut metadata works but URL outside its section is rejected',()=>{
  assert.equal(parseInternetShortcut('\uFEFF[InternetShortcut]\r\nURL=https://example.org/a\r\nIconFile=example.ico\r\n[Other]\r\nValue=1\r\n'),'https://example.org/a');
  assert.equal(parseInternetShortcut('[InternetShortcut]\nIconFile=icon\n[Other]\nURL=https://example.org'),null);
  assert.equal(parseInternetShortcut('[InternetShortcut]\nURL=https://example.org\n[Other]\nURL=https://other.org'),null);
});
