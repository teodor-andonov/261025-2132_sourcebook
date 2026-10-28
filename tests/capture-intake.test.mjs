import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCaptureIntake,MAX_DROPPED_URLS} from '../src/capture-intake.mjs';

test('plain text paste is a reviewable Markdown draft, not a file write',()=>{
  const result=prepareCaptureIntake({text:'# Research\n\nA note',source:'paste'});
  assert.deepEqual(result,{kind:'text',value:'# Research\n\nA note',source:'paste'});
});
test('single pasted URL becomes a canonical URL draft',()=>{
  const result=prepareCaptureIntake({text:'https://example.com/a',source:'paste'});
  assert.equal(result.kind,'url');
  assert.equal(result.value,'https://example.com/a');
});
test('clipboard text remains reviewable Markdown',()=>{
  const result=prepareCaptureIntake({text:'a\nb',source:'clipboard'});
  assert.equal(result.kind,'text');
  assert.equal(result.value,'a\nb');
});
test('single dropped URI ignores URI-list comments and whitespace',()=>{
  const result=prepareCaptureIntake({source:'drop',text:'Visible label',
    uriList:'# source\r\n\r\nhttps://example.com/a\r\n'});
  assert.equal(result.kind,'url');
  assert.equal(result.value,'https://example.com/a');
});
test('multiple dropped HTTP URLs become Markdown, never one invalid shortcut',()=>{
  const result=prepareCaptureIntake({source:'drop',uriList:'# Links\nhttps://a.example/\nhttps://b.example/'});
  assert.equal(result.kind,'text');
  assert.equal(result.value,'https://a.example/\nhttps://b.example/');
});
test('a dropped URL takes precedence over anchor label text',()=>{
  const result=prepareCaptureIntake({source:'drop',text:'Click here',uriList:'https://example.org/'});
  assert.equal(result.kind,'url');
});
test('comments-only URI list falls back to original plain text',()=>{
  const result=prepareCaptureIntake({source:'drop',text:'My research',uriList:'# only comment\n'});
  assert.equal(result.kind,'text');
  assert.equal(result.value,'My research');
});
test('unsupported or mixed dropped URI schemes fail closed',()=>{
  for(const uriList of ['file:///private.txt','javascript:alert(1)','https://a.example/\nfile:///private.txt']){
    assert.throws(()=>prepareCaptureIntake({source:'drop',uriList}),/HTTP|URL|scheme|Invalid/i);
  }
});
test('invalid, empty and oversized drafts are rejected',()=>{
  assert.throws(()=>prepareCaptureIntake({source:'other',text:'x'}),/source/);
  assert.throws(()=>prepareCaptureIntake({source:'paste',text:''}),/Nothing/);
  assert.throws(()=>prepareCaptureIntake({source:'paste',text:'x'.repeat(1048577)}),/1 MiB/);
  assert.throws(()=>prepareCaptureIntake({source:'drop',uriList:'https://example.org/\n'.repeat(MAX_DROPPED_URLS+1)}),/Drop at most/);
});
test('URI list cannot exceed the capture input bound',()=>{
  assert.throws(()=>prepareCaptureIntake({source:'drop',uriList:'#'+('a'.repeat(1048576))}),/1 MiB/);
});
test('app paste/drop routes through explicit review, never directly writes',()=>{
  const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
  assert.match(app,/prepareCaptureIntake\(\{text:value,source:'paste'\}\)/);
  assert.match(app,/prepareCaptureIntake\(\{text,uriList,source:'drop'\}\)/);
  assert.match(app,/openFileCapture\(\{intake\}\)/);
  assert.doesNotMatch(app,/writeCapture\(input,\{allowPicker:false\}\)/);
  assert.match(app,/navigator\.clipboard\.readText\(\)/);
});
test('new intake module is precached for offline module import',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/\.\/src\/capture-intake\.mjs/);
  assert.match(sw,/k\.startsWith\('sourcebook-shell-'\)/);
});
