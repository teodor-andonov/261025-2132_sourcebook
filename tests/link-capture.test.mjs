import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LINK_CAPTURE_KEY,LINK_CAPTURE_LIMIT,LINK_PASTE_LIMIT,normalizeCaptureURL,normalizeCaptureStore,planCapturedLinks,planRemoveCapturedLink,planRenameCapturedLink,updateCapturedLinks} from '../src/link-capture.mjs';

const idFactory=(()=>{let i=0;return ()=>String(++i);})();
const opts={idFactory,now:()=> '2026-10-28T02:00:00.000Z'};
const capture=(text,store=null)=>planCapturedLinks(store,text,opts);
test('canonical HTTP and HTTPS URLs preserve paths, query strings and fragments',()=>{
  assert.equal(normalizeCaptureURL(' https://Example.org:443/a?q=2#section '),'https://example.org/a?q=2#section');
  assert.equal(normalizeCaptureURL('http://example.org:80/'),'http://example.org/');
});
test('rejects non-web schemes and URL userinfo',()=>{
  for(const url of ['javascript:alert(1)','file:///secret','data:text/html,x','ftp://example.org/','https://u:p@example.org/','https://u@example.org/']){
    assert.throws(()=>normalizeCaptureURL(url));
  }
});
test('rejects invalid URLs, embedded spaces, control characters and excessive length',()=>{
  for(const url of ['https://','not-a-url','https://example.org/a b','https://example.org/\npath','https://example.org/'+'x'.repeat(2100)]){
    assert.throws(()=>normalizeCaptureURL(url));
  }
});
test('a blank store starts empty and malformed records fail closed',()=>{
  assert.deepEqual(normalizeCaptureStore(null),{version:1,links:[]});
  for(const value of [{version:2,links:[]},{version:1,links:[{url:'https://x.org/'}]},{version:1,links:'oops'}]){
    assert.throws(()=>normalizeCaptureStore(value));
  }
});
test('multi-line paste creates distinct links and skips repeated URLs',()=>{
  const r=capture('https://example.org/\nhttps://example.org:443/\nhttps://other.org/');
  assert.equal(r.added,2);assert.equal(r.duplicates,1);
  assert.equal(r.next.links.length,2);
});
test('second paste skips existing links and preserves their IDs',()=>{
  const first=capture('https://example.org/').next;
  const second=capture('https://example.org/\nhttps://new.org/',first);
  assert.equal(second.added,1);assert.equal(second.duplicates,1);
  assert.equal(second.next.links.find(x=>x.url==='https://example.org/').id,first.links[0].id);
});
test('invalid line aborts entire batch without changing input',()=>{
  const first=capture('https://example.org/').next;
  const original=JSON.stringify(first);
  assert.throws(()=>capture('https://new.org/\njavascript:alert(1)',first));
  assert.equal(JSON.stringify(first),original);
});
test('paste limits and bounded storage prevent unbounded local accumulation',()=>{
  assert.equal(LINK_PASTE_LIMIT,20);assert.equal(LINK_CAPTURE_LIMIT,200);
  assert.throws(()=>capture(Array.from({length:21},(_,i)=>'https://example.org/'+i).join('\n')));
  assert.throws(()=>capture('https://example.org/'+'x'.repeat(45001)));
});
test('stored duplicate IDs or URLs are rejected rather than overwritten',()=>{
  const first=capture('https://example.org/').next;
  assert.throws(()=>normalizeCaptureStore({version:1,links:[first.links[0],first.links[0]]}));
});
test('removing a link is explicit and missing IDs fail closed',()=>{
  const first=capture('https://example.org/').next;
  assert.deepEqual(planRemoveCapturedLink(first,first.links[0].id).links,[]);
  assert.throws(()=>planRemoveCapturedLink(first,'unknown'));
});
test('editing title preserves stable link ID and URL',()=>{
  const first=capture('https://example.org/').next;
  const changed=planRenameCapturedLink(first,first.links[0].id,'  Research  ');
  assert.equal(changed.links[0].title,'Research');
  assert.equal(changed.links[0].id,first.links[0].id);
  assert.equal(changed.links[0].url,first.links[0].url);
  assert.throws(()=>planRenameCapturedLink(first,first.links[0].id,'x'.repeat(121)));
});
test('update verifies saved data and never writes if external change detected',async()=>{
  let raw=null,calls=0,writes=0;
  const get=async()=>{calls++;if(calls===2)raw=capture('https://other.org/').next;return raw;};
  const set=async()=>{writes++;};
  await assert.rejects(updateCapturedLinks(get,set,store=>capture('https://example.org/',store).next),/another tab/);
  assert.equal(writes,0);
});
test('update verifies persistence and rejects overwritten save',async()=>{
  let raw=null;
  const get=async()=>raw;
  const set=async()=>{raw=capture('https://different.org/').next;};
  await assert.rejects(updateCapturedLinks(get,set,store=>capture('https://example.org/',store).next),/verification/);
});
test('unchanged duplicate batch does not rewrite device storage',async()=>{
  let raw=capture('https://example.org/').next,writes=0;
  const next=await updateCapturedLinks(async()=>raw,async()=>{writes++;},store=>capture('https://example.org/',store).next);
  assert.equal(writes,0);assert.equal(next.links.length,1);
});
test('successful update saves to the device-local key',async()=>{
  let raw=null,key='';
  const next=await updateCapturedLinks(async()=>raw,async(k,v)=>{key=k;raw=v;},store=>capture('https://example.org/',store).next);
  assert.equal(key,LINK_CAPTURE_KEY);assert.equal(next.links.length,1);
});
test('app shell and service worker include capture without filesystem permission',async()=>{
  const app=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(app,/createLinkCaptureUI/);
  assert.match(app,/case 'capture-links':linkCapture\.open\(\)/);
  assert.ok((app.match(/data-action="capture-links"/g)||[]).length>=1);
  assert.match(sw,/\.\/src\/link-capture\.mjs/);
  const module=await readFile(new URL('../src/link-capture.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(module,/showDirectoryPicker|createWritable|removeEntry|requestPermission/);
});
