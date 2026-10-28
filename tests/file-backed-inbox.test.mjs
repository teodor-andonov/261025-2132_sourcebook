import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {classifyPastedText,planFileCapture,parseInternetShortcut,requestCapturedFileDownload} from '../src/file-capture.mjs';
import {prepareIncomingShare} from '../src/share-inbox.mjs';
import {planCapturedLinks} from '../src/link-capture.mjs';

const settings={now:new Date('2026-10-28T08:29:00.000Z'),random:'abc123ef45'};
const shared={idFactory:()=> '12345678-1234-4123-8123-123456789abc',now:()=> '2026-10-28T08:29:00.000Z'};
test('a staged URL produces an ordinary .url file plan, never a Catalog-only record',()=>{
  const staged=planCapturedLinks(null,'https://example.org/reference',{idFactory:()=> 'staged-1',now:()=> '2026-10-28T08:29:00.000Z'}).next;
  const item=staged.links[0],plan=planFileCapture({kind:'url',value:item.url,title:item.title},settings);
  assert.equal(plan.kind,'url');
  assert.ok(plan.name.endsWith('.url'));
  assert.equal(parseInternetShortcut(plan.text),item.url);
  assert.equal(staged.links.length,1); // capture doesn't remove staging automatically
});
test('single incoming URL is eligible for a file-backed shortcut',()=>{
  const share=prepareIncomingShare({title:'Material',text:'https://example.org/detail'},shared);
  assert.equal(share.kind,'url');
  const plan=planFileCapture({kind:'url',value:share.candidate,title:share.title},settings);
  assert.ok(plan.name.endsWith('.url'));
  assert.equal(parseInternetShortcut(plan.text),'https://example.org/detail');
});
test('text-only and ambiguous shares preserve original text as Markdown',()=>{
  const text=prepareIncomingShare({title:'Notes',text:'A material note'},shared);
  assert.equal(text.candidate,null);
  const textPlan=planFileCapture({kind:'text',value:text.text,title:text.title},settings);
  assert.ok(textPlan.name.endsWith('.md'));
  assert.equal(textPlan.text,'A material note\n');
  const ambiguous=prepareIncomingShare({text:'https://example.org/one https://example.org/two'},shared);
  assert.equal(ambiguous.kind,'ambiguous');
  const plan=planFileCapture({kind:'text',value:ambiguous.text},settings);
  assert.match(plan.text,/example.org\/one https:\/\/example.org\/two/);
});
test('explicit browser download requests a real file but never claims verified disk persistence',()=>{
  const calls=[],revoked=[],plan=planFileCapture(classifyPastedText('https://example.org/a'),settings);
  const env={
    URL:{createObjectURL:blob=>{calls.push(['blob',blob.type,blob.size]);return 'blob:fixture';},
      revokeObjectURL:url=>revoked.push(url)},
    document:{body:{append:anchor=>calls.push(['append',anchor.download])},
      createElement:()=>({style:{},click(){calls.push(['click',this.download,this.href]);},remove(){calls.push(['remove']);}})},
    setTimeout:callback=>callback()
  };
  const result=requestCapturedFileDownload(plan,{env});
  assert.equal(result.verified,false);
  assert.equal(result.delivery,'browser-download');
  assert.equal(result.name,plan.name);
  assert.ok(calls.some(c=>c[0]==='click'&&c[1]===plan.name));
  assert.deepEqual(revoked,['blob:fixture']);
});
test('browser fallback fails closed on malformed plans or unavailable download API',()=>{
  const plan=planFileCapture({kind:'text',value:'hello'},settings);
  assert.throws(()=>requestCapturedFileDownload({...plan,name:'../unsafe.md'}),/Invalid download/);
  assert.throws(()=>requestCapturedFileDownload({...plan,kind:'url'}),/Invalid download/);
  assert.throws(()=>requestCapturedFileDownload(plan,{env:{}}),/unavailable/);
});
test('file-backed inbox actions are wired without automatic Catalog-only import',async()=>{
  const [app,link,share,fixture,search,sw]=await Promise.all([
    'app.mjs','link-capture.mjs','share-inbox.mjs','m0-acceptance.mjs','catalog-search.mjs'
  ].map(name=>readFile(new URL('../src/'+name,import.meta.url),'utf8')).concat([
    readFile(new URL('../sw.js',import.meta.url),'utf8')
  ]));
  assert.match(app,/onSaveFile:input=>writeCapture\(input,\{choose:true\}\)/);
  assert.match(link,/data-capture="file"/);
  assert.match(share,/data-share="file-text"/);
  assert.match(share,/data-share="download-url"/);
  assert.match(fixture,/source-files/);
  assert.doesNotMatch(fixture,/planCatalogURLImport/);
  assert.match(search,/name\.endsWith\('\.url'\)/);
  assert.match(sw,/\.\/src\/file-capture\.mjs/);
  assert.match(sw,/sourcebook-shell-/);
});
