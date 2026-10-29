import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
test('Sourcebook has a stable distinct GitHub Pages PWA identity',()=>{
  assert.equal(manifest.id,'/261025-2132_sourcebook/');
  assert.equal(manifest.name,'TaSourcebook');
  assert.equal(manifest.short_name,'TaSourcebook');
  assert.notEqual(manifest.id,'/261019-1740_pwa-mindmap/');
  assert.equal(manifest.scope,'./');
  assert.equal(manifest.start_url,'./');
});

test('offline shell includes every static module imported by the app and worker',async()=>{
  const files=sw.match(/const FILES=(\[[^;]+\]);/)[1];
  const cached=new Set(JSON.parse(files.replaceAll("'",'"')));
  for(const path of ['./sw.js',...cached]){
    if(!/\.(?:m?js)$/.test(path))continue;
    const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
    for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+)['"]/g)){
      const dependency=new URL(match[1],new URL(path,'https://example.org/'));
      assert.ok(cached.has('.'+dependency.pathname),`${path} imports uncached ${match[1]}`);
    }
  }
});
test('Sourcebook activation does not delete Mindmap or unrelated caches',async()=>{
  const listeners=new Map(),deleted=[];
  const active=sw.match(/const CACHE\s*=\s*'([^']+)'/)?.[1];
  assert.ok(active);
  const caches={keys:async()=>[active,'sourcebook-shell-prior','mindmap-shell-v3.1-ta-icons-2','unrelated-cache'],
    delete:async key=>{deleted.push(key);return true;}};
  const self={addEventListener:(event,fn)=>listeners.set(event,fn),clients:{claim:async()=>{}},registration:{scope:'https://example.org/261025-2132_sourcebook/'},location:{origin:'https://example.org'}};
  const workerBody=sw.replace(/^import .*\r?\n/gm,'');
  (new Function('self','caches','prepareIncomingShare','enqueueIncomingShare',workerBody))(self,caches,()=>{},async()=>{});
  let pending;listeners.get('activate')({waitUntil:promise=>{pending=promise;}});
  await pending;
  assert.deepEqual(deleted,['sourcebook-shell-prior']);
});
