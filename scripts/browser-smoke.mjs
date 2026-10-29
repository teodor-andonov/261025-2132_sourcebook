// Headless Linux Chromium smoke, NOT physical Windows/Pixel 8 acceptance.
// No screenshots, traces, video or ordinary source file writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const ROOT=resolve(fileURLToPath(new URL('../',import.meta.url)));
const PREFIX='/261025-2132_sourcebook/';
const MIME={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith(PREFIX)){res.writeHead(404).end();return;}
    const file=resolve(ROOT,pathname.slice(PREFIX.length)||'index.html');
    if(!file.startsWith(ROOT+sep)){res.writeHead(403).end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'content-type':MIME[extname(file)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end();}
});
async function main(){
  const url=await new Promise(resolveListen=>server.listen(0,'127.0.0.1',()=>resolveListen('http://127.0.0.1:'+server.address().port+PREFIX)));
  let browser;
  let passed=0;
  async function scenario(label,fn){
    const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'allow'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try{
      await fn(context,page);
      assert.deepEqual(errors,[],'Browser JS errors');
      passed++;
      process.stdout.write('PASS '+label+'\n');
    }finally{await context.close();}
  }
  async function controlled(page){
    await page.goto(url,{waitUntil:'load'});
    await page.locator('h1').waitFor({timeout:15000});
    await page.evaluate(async()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:15000});
  }
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    await scenario('scoped PWA, service worker and offline reload',async(context,page)=>{
      await controlled(page);
      const info=await page.evaluate(async()=>{
        const manifest=await (await fetch('./manifest.webmanifest')).json();
        return {id:manifest.id,scope:(await navigator.serviceWorker.ready).scope,method:manifest.share_target.method};
      });
      assert.equal(info.id,PREFIX);
      assert.ok(info.scope.endsWith(PREFIX));
      assert.equal(info.method,'POST');
      await context.setOffline(true);
      await page.reload({waitUntil:'load'});
      await page.locator('h1').waitFor({timeout:15000});
      await context.setOffline(false);
    });
    await scenario('multipart share target stages real File in temporary IndexedDB',async(context,page)=>{
      await controlled(page);
      const response=await page.evaluate(async()=>{
        const data=new FormData();
        data.set('title','Synthetic browser share');
        data.set('text','Synthetic text');
        data.append('files',new File(['sourcebook smoke payload'],'sourcebook-smoke.txt',{type:'text/plain'}));
        const r=await fetch('./share-target',{method:'POST',body:data});
        return {status:r.status,url:r.url,error:r.ok?'':(await r.text()).slice(0,200)};
      });
      assert.equal(response.status,200,response.error);
      assert.match(response.url,/shared=1/);
      const staged=await page.evaluate(async()=>{
        const inbox=await import('./src/share-inbox.mjs');
        const records=await inbox.listIncomingShares();
        const entry=records.find(r=>r.title==='Synthetic browser share');
        if(!entry)return {count:records.length};
        const files=await inbox.getIncomingShareFiles(entry.id);
        const content=await files[0].text();
        await inbox.removeIncomingShare(entry.id);
        return {count:files.length,name:files[0].name,content};
      });
      assert.equal(staged.count,1,JSON.stringify(staged));
      assert.equal(staged.name,'sourcebook-smoke.txt');
      assert.equal(staged.content,'sourcebook smoke payload');
    });
    await scenario('no-directory-picker review, blocked gate and physical .url Download',async(context,page)=>{
      await context.addInitScript(()=>Object.defineProperty(window,'showDirectoryPicker',{value:undefined,configurable:true}));
      await controlled(page);
      assert.equal(await page.locator('[data-action="open-folder"]').count(),0);
      assert.equal(await page.locator('[data-action="import"]').count(),0);
      assert.equal(await page.locator('[data-action="capture-clipboard-image"]').count(),0);
      assert.match(await page.locator('.landing').innerText(),/Folder access is unavailable/);
      await page.locator('[data-action="device-checks"]').click();
      assert.match(await page.locator('[data-m0-provider-gate]').innerText(),/blocked/i);
      await page.locator('[data-action="dismiss"]').click();
      await page.locator('[data-action="capture-file"]').click();
      assert.equal(await page.locator('#capture-file-form button[data-delivery="folder"]').count(),0);
      assert.match(await page.locator('#capture-file-form').innerText(),/Folder creation is unavailable/);
      await page.locator('#capture-file-form textarea[name="content"]').fill('https://example.org/sourcebook-smoke');
      const pending=page.waitForEvent('download');
      await page.locator('#capture-file-form button[data-delivery="download"]').click();
      const download=await pending;
      assert.match(download.suggestedFilename(),/\.url$/);
      const chunks=[];
      for await(const chunk of await download.createReadStream())chunks.push(chunk);
      assert.equal(Buffer.concat(chunks).toString('utf8'),'[InternetShortcut]\r\nURL=https://example.org/sourcebook-smoke\r\n');
    });

    // OPFS is origin-private browser storage, NOT a user-selected ordinary Folder,
    // Android SAF provider, Syncthing root or proof of external filesystem access.
    // It does exercise genuine Chromium FileSystemDirectoryHandle/write/read APIs.
    await scenario('real Chromium OPFS .url/.md file writes, collision refusal and source preservation',async(_context,page)=>{
      await controlled(page);
      const result=await page.evaluate(async()=>{
        const {planFileCapture,writeCapturedFile}=await import('./src/file-capture.mjs');
        const root=await navigator.storage.getDirectory();
        const parentName='sourcebook-opfs-copy-'+crypto.randomUUID();
        const parent=await root.getDirectoryHandle(parentName,{create:true});
        try{
          const sentinel=await parent.getFileHandle('untouched-source.txt',{create:true});
          const writer=await sentinel.createWritable();
          await writer.write('source must remain untouched\n');await writer.close();
          const options={now:new Date('2026-10-28T00:00:00.000Z'),random:'abc123def456'};
          const shortcut=planFileCapture({kind:'url',value:'https://example.org/sourcebook-opfs',title:'OPFS link'},options);
          const note=planFileCapture({kind:'text',value:'# OPFS test\n\nSynthetic fixture',title:'OPFS note'},options);
          const before=[];
          for await(const [name] of parent.entries())before.push(name);
          await writeCapturedFile(parent,shortcut);
          await writeCapturedFile(parent,note);
          const urlText=await (await (await parent.getFileHandle(shortcut.name)).getFile()).text();
          const mdText=await (await (await parent.getFileHandle(note.name)).getFile()).text();
          let exactCollision=false,caseCollision=false;
          try{await writeCapturedFile(parent,shortcut);}catch(error){exactCollision=/already exists/.test(error.message);}
          try{await writeCapturedFile(parent,{...shortcut,name:shortcut.name.replace('OPFS','opfs')});}
          catch(error){caseCollision=/already exists/.test(error.message);}
          const unchanged=await (await sentinel.getFile()).text();
          const after=[];
          for await(const [name] of parent.entries())after.push(name);
          return {before,after,urlText,mdText,unchanged,exactCollision,caseCollision};
        }finally{await root.removeEntry(parentName,{recursive:true});}
      });
      assert.deepEqual(result.before,['untouched-source.txt']);
      assert.equal(result.after.length,3);
      assert.equal(result.urlText,'[InternetShortcut]\r\nURL=https://example.org/sourcebook-opfs\r\n');
      assert.equal(result.mdText,'# OPFS test\n\nSynthetic fixture\n');
      assert.equal(result.unchanged,'source must remain untouched\n');
      assert.equal(result.exactCollision,true);
      assert.equal(result.caseCollision,true);
    });
    await scenario('real Chromium OPFS .url/.md fixture survives reload and IndexedDB handle restoration',async(_context,page)=>{
      await controlled(page);
      const setup=await page.evaluate(async()=>{
        const {createM0CaptureFixture}=await import('./src/m0-capture-acceptance.mjs');
        const {setLocal}=await import('./src/storage.mjs');
        const root=await navigator.storage.getDirectory();
        const parentName='sourcebook-opfs-m0-'+crypto.randomUUID();
        const parent=await root.getDirectoryHandle(parentName,{create:true});
        // Permission shim ONLY: OPFS is origin-owned, never a real picker grant.
        const grant=h=>({kind:h.kind,name:h.name,queryPermission:async()=> 'granted',
          values:()=>h.values(),entries:()=>h.entries(),
          getFileHandle:(...args)=>h.getFileHandle(...args),
          getDirectoryHandle:(...args)=>h.getDirectoryHandle(...args),
          removeEntry:(...args)=>h.removeEntry(...args)});
        const result=await createM0CaptureFixture(async()=>grant(parent),{confirmed:true});
        if(result.status!=='ok')throw Error('OPFS capture creation failed: '+JSON.stringify(result));
        const child=await parent.getDirectoryHandle(result.fixtureName);
        await setLocal('sourcebook-opfs-m0-smoke-handle',child);
        return {parentName,fixtureName:result.fixtureName,fixtureProof:result.fixtureProof};
      });
      await page.reload({waitUntil:'load'});
      const checked=await page.evaluate(async setup=>{
        const {verifyM0CaptureFixture}=await import('./src/m0-capture-acceptance.mjs');
        const {getLocal,removeLocal}=await import('./src/storage.mjs');
        const root=await navigator.storage.getDirectory();
        const parent=await root.getDirectoryHandle(setup.parentName);
        const actual=await parent.getDirectoryHandle(setup.fixtureName);
        const stored=await getLocal('sourcebook-opfs-m0-smoke-handle');
        const sameEntry=!!stored&&await stored.isSameEntry(actual);
        const grant=h=>({kind:h.kind,name:h.name,queryPermission:async()=> 'granted',
          values:()=>h.values(),entries:()=>h.entries(),
          getFileHandle:(...args)=>h.getFileHandle(...args)});
        const verified=await verifyM0CaptureFixture(async()=>grant(stored));
        const names=[];
        for await(const [name] of actual.entries())names.push(name);
        const markdown=names.find(name=>name.endsWith('.md'));
        const handle=await actual.getFileHandle(markdown);
        const writer=await handle.createWritable();await writer.write('synthetic corruption\n');await writer.close();
        const corrupted=await verifyM0CaptureFixture(async()=>grant(actual));
        await removeLocal('sourcebook-opfs-m0-smoke-handle');
        await root.removeEntry(setup.parentName,{recursive:true});
        return {sameEntry,verified,corrupted,files:names.length};
      },setup);
      assert.equal(checked.sameEntry,true);
      assert.equal(checked.verified.status,'ok');
      assert.equal(checked.verified.urlVerified,true);
      assert.equal(checked.verified.textVerified,true);
      assert.equal(checked.verified.fixtureProof,setup.fixtureProof);
      assert.equal(checked.files,2);
      assert.equal(checked.corrupted.status,'invalid');
    });
    await scenario('real Chromium OPFS portable .sb journal, Tags, View and physical .url reopen',async(_context,page)=>{
      await controlled(page);
      const setup=await page.evaluate(async()=>{
        const {createM0PortableCatalogFixture}=await import('./src/m0-acceptance.mjs');
        const root=await navigator.storage.getDirectory();
        const parentName='sourcebook-opfs-portable-'+crypto.randomUUID();
        const parent=await root.getDirectoryHandle(parentName,{create:true});
        const grant=h=>({kind:h.kind,name:h.name,queryPermission:async()=> 'granted',
          values:()=>h.values(),entries:()=>h.entries(),
          getFileHandle:(...args)=>h.getFileHandle(...args),
          getDirectoryHandle:(...args)=>h.getDirectoryHandle(...args)});
        const created=await createM0PortableCatalogFixture(async()=>grant(parent),{confirmed:true});
        if(created.status!=='ok')throw Error('OPFS portable fixture creation failed: '+JSON.stringify(created));
        return {parentName,fixtureName:created.fixtureName,fixtureProof:created.fixtureProof,
          transactionVerified:created.transactionVerified,journalClear:created.journalClear};
      });
      assert.equal(setup.transactionVerified,true);
      assert.equal(setup.journalClear,true);
      await page.reload({waitUntil:'load'});
      const checked=await page.evaluate(async setup=>{
        const {verifyM0PortableCatalogFixture}=await import('./src/m0-acceptance.mjs');
        const root=await navigator.storage.getDirectory();
        const parent=await root.getDirectoryHandle(setup.parentName);
        const dir=await parent.getDirectoryHandle(setup.fixtureName);
        const grant=h=>({kind:h.kind,name:h.name,queryPermission:async()=> 'granted',
          values:()=>h.values(),entries:()=>h.entries(),
          getFileHandle:(...args)=>h.getFileHandle(...args),
          getDirectoryHandle:(...args)=>h.getDirectoryHandle(...args)});
        const verified=await verifyM0PortableCatalogFixture(async()=>grant(dir));
        const record=JSON.parse(await (await (await (await dir.getDirectoryHandle('resources')).getFileHandle('mt1.json')).getFile()).text());
        const source=await dir.getDirectoryHandle('source-files');
        const handle=await source.getFileHandle(record.path);
        const writer=await handle.createWritable();
        await writer.write('[InternetShortcut]\r\nURL=https://example.org/modified\r\n');await writer.close();
        const corrupted=await verifyM0PortableCatalogFixture(async()=>grant(dir));
        await root.removeEntry(setup.parentName,{recursive:true});
        return {verified,corrupted,recordKind:record.kind};
      },setup);
      assert.equal(checked.verified.status,'ok');
      assert.equal(checked.verified.portableVerified,true);
      assert.equal(checked.verified.journalClear,true);
      assert.equal(checked.verified.fixtureProof,setup.fixtureProof);
      assert.equal(checked.recordKind,'file');
      assert.equal(checked.corrupted.status,'invalid');
    });


    // OPFS + native Chromium Web Locks are synthetic browser-engine evidence.
    // This does not verify external Folder, Syncthing or Android SAF concurrency.
    await scenario('two-tab Chromium Web Locks serialize physical capture and preserve collisions',async(context,page)=>{
      await controlled(page);
      const second=await context.newPage(),pageErrors=[];
      second.on('pageerror',e=>pageErrors.push(e.message));
      await controlled(second);
      const folderName='sourcebook-opfs-locked-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      const lockName='sourcebook-physical-write-v1';
      try{
        await page.evaluate(async name=>{
          const root=await navigator.storage.getDirectory();
          await root.getDirectoryHandle(name,{create:true});
        },folderName);
        await page.evaluate(name=>{
          window.__heldSourcebookLock=navigator.locks.request(name,{mode:'exclusive'},
            ()=>new Promise(resolve=>{window.__releaseSourcebookLock=resolve;}));
        },lockName);
        await page.waitForFunction(()=>typeof window.__releaseSourcebookLock==='function');
        const pending=second.evaluate(async name=>{
          const {planFileCapture,writeCapturedFile}=await import('./src/file-capture.mjs');
          const root=await navigator.storage.getDirectory();
          const dir=await root.getDirectoryHandle(name);
          const plan=planFileCapture({kind:'url',value:'https://example.org/locked',title:'Locked link'},
            {now:new Date('2026-10-28T00:00:00Z'),random:'abc123def456'});
          await writeCapturedFile(dir,plan);
          return plan.name;
        },folderName);
        await second.waitForFunction(async name=>(await navigator.locks.query()).pending.some(lock=>lock.name===name),lockName);
        const before=await page.evaluate(async name=>{
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(name);
          const names=[];for await(const [entry] of dir.entries())names.push(entry);
          return names;
        },folderName);
        assert.deepEqual(before,[],'Writer must wait while another tab holds the lock');
        await page.evaluate(()=>window.__releaseSourcebookLock());
        const filename=await pending;
        const result=await page.evaluate(async({folderName,filename})=>{
          const {planFileCapture,writeCapturedFile}=await import('./src/file-capture.mjs');
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(folderName);
          const existing=await (await (await dir.getFileHandle(filename)).getFile()).text();
          const plan=planFileCapture({kind:'url',value:'https://example.org/locked',title:'Locked link'},
            {now:new Date('2026-10-28T00:00:00Z'),random:'abc123def456'});
          let rejected=false;
          try{await writeCapturedFile(dir,plan);}catch(e){rejected=/already exists/.test(e.message);}
          const unchanged=await (await (await dir.getFileHandle(filename)).getFile()).text();
          return {rejected,existing,unchanged};
        },{folderName,filename});
        assert.equal(result.rejected,true);
        assert.equal(result.existing,'[InternetShortcut]\r\nURL=https://example.org/locked\r\n');
        assert.equal(result.unchanged,result.existing);
        assert.deepEqual(pageErrors,[]);
      }finally{
        await page.evaluate(async name=>{
          window.__releaseSourcebookLock?.();
          const root=await navigator.storage.getDirectory();
          try{await root.removeEntry(name,{recursive:true});}catch{}
        },folderName);
        await second.close();
      }
    });


    // Same-origin Catalog metadata coordination uses a separate Web Lock from
    // ordinary file creation. OPFS is a synthetic browser fixture, NOT a real
    // Windows/Android external Folder or a Syncthing conflict-resolution test.
    await scenario('two-tab Chromium Catalog journal lock rejects stale competing edits',async(context,page)=>{
      await controlled(page);
      const second=await context.newPage(),pageErrors=[];
      second.on('pageerror',error=>pageErrors.push(error.message));
      await controlled(second);
      const folderName='sourcebook-opfs-catalog-lock-'+crypto.randomUUID();
      const catalog={id:'browser-catalog-lock',code:'cl',nextSequence:1};
      const changes=[{path:'tags.json',before:null,after:[{id:'t1',name:'Timber',parentId:null}]}];
      const lockName='sourcebook-catalog-write-v1';
      try{
        await page.evaluate(async({folderName,catalog})=>{
          const root=await navigator.storage.getDirectory();
          const dir=await root.getDirectoryHandle(folderName,{create:true});
          const {writeJson}=await import('./src/storage.mjs');
          await writeJson(dir,'catalog.json',catalog);
        },{folderName,catalog});
        await page.evaluate(name=>{
          window.__heldCatalogLock=navigator.locks.request(name,{mode:'exclusive'},
            ()=>new Promise(resolve=>{window.__releaseCatalogLock=resolve;}));
        },lockName);
        await page.waitForFunction(()=>typeof window.__releaseCatalogLock==='function');
        const pending=second.evaluate(async({folderName,catalog,changes})=>{
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(folderName);
          const {commitCatalogTransaction}=await import('./src/catalog-transactions.mjs');
          return commitCatalogTransaction({handle:dir,catalogId:catalog.id,changes,transactionId:'browser-first'});
        },{folderName,catalog,changes});
        await second.waitForFunction(async name=>(await navigator.locks.query()).pending.some(lock=>lock.name===name),lockName);
        const before=await page.evaluate(async folderName=>{
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(folderName);
          const names=[];for await(const [name] of dir.entries())names.push(name);
          return names.sort();
        },folderName);
        assert.deepEqual(before,['catalog.json'],'Journal and Tags must wait for the Catalog lock');
        await page.evaluate(()=>window.__releaseCatalogLock());
        assert.equal(await pending,1);
        const result=await page.evaluate(async({folderName,catalog,changes})=>{
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(folderName);
          const {commitCatalogTransaction,inspectPendingCatalogTransaction}=await import('./src/catalog-transactions.mjs');
          const {readJson}=await import('./src/storage.mjs');
          let staleRefused=false;
          try{await commitCatalogTransaction({handle:dir,catalogId:catalog.id,changes,transactionId:'browser-stale'});}
          catch(error){staleRefused=/changed on disk/.test(error.message);}
          return {staleRefused,tags:await readJson(dir,'tags.json'),
            journal:await inspectPendingCatalogTransaction(dir,catalog.id)};
        },{folderName,catalog,changes});
        assert.equal(result.staleRefused,true);
        assert.deepEqual(result.tags,changes[0].after);
        assert.equal(result.journal,null);
        assert.deepEqual(pageErrors,[]);
      }finally{
        await page.evaluate(async folderName=>{
          window.__releaseCatalogLock?.();
          const root=await navigator.storage.getDirectory();
          try{await root.removeEntry(folderName,{recursive:true});}catch{}
        },folderName);
        await second.close();
      }
    });


    await scenario('physical .url preview and bounded Markdown preview use real Chromium files',async(_context,page)=>{
      await controlled(page);
      const fixture=await page.evaluate(async()=>{
        const root=await navigator.storage.getDirectory();
        const folderName='sourcebook-opfs-preview-'+crypto.randomUUID();
        const dir=await root.getDirectoryHandle(folderName,{create:true});
        const write=async(name,text)=>{
          const handle=await dir.getFileHandle(name,{create:true});
          const stream=await handle.createWritable();await stream.write(text);await stream.close();
        };
        await write('Example.url','[InternetShortcut]\r\nURL=https://example.org/physical-resource\r\n');
        await write('Unsafe.url','[InternetShortcut]\r\nURL=javascript:alert(1)\r\n');
        await write('Notes.md','x'.repeat(210000));
        // Test-only OPFS adapter. NOT a user-selected external Folder.
        window.showDirectoryPicker=async()=>({kind:'directory',name:folderName,
          entries:()=>dir.entries(),getDirectoryHandle:(...args)=>dir.getDirectoryHandle(...args),
          queryPermission:async()=> 'granted'});
        return {folderName};
      });
      try{
        await page.locator('[data-action="open-folder"]').first().click();
        await page.locator('[data-item]').filter({hasText:'Example'}).first().dblclick();
        await page.locator('#viewer .shortcut-open').waitFor();
        assert.equal(await page.locator('#viewer .shortcut-open').getAttribute('href'),'https://example.org/physical-resource');
        assert.equal(await page.locator('#viewer .shortcut-note').count(),1);
        await page.locator('[data-action="close-viewer"]').click();
        await page.locator('[data-item]').filter({hasText:'Unsafe'}).first().dblclick();
        await page.locator('#viewer').waitFor();
        assert.match(await page.locator('#viewer').innerText(),/Invalid .url shortcut/);
        assert.equal(await page.locator('#viewer .shortcut-open').count(),0);
        await page.locator('[data-action="close-viewer"]').click();
        await page.locator('[data-item]').filter({hasText:'Notes'}).first().dblclick();
        await page.locator('#viewer .viewer-truncated').waitFor();
        assert.equal((await page.locator('#viewer .viewer-text').innerText()).length,200000);
        await page.locator('[data-action="close-viewer"]').click();
      }finally{
        await page.evaluate(async name=>{
          const root=await navigator.storage.getDirectory();
          await root.removeEntry(name,{recursive:true});
        },fixture.folderName);
      }
    });

    await scenario('independent Folder Tabs retain search, sort, layout and native OPFS handles across reload',async(context,page)=>{
      // Test-only picker and permission shim; this is NOT external Folder/Android SAF access.
      await context.addInitScript(()=>{
        window.showDirectoryPicker=async()=>{throw new DOMException('Synthetic picker unavailable','AbortError');};
        const proto=window.FileSystemHandle?.prototype;
        if(proto&&typeof proto.queryPermission!=='function'){
          Object.defineProperty(proto,'queryPermission',{value:async()=> 'granted',configurable:true});
          Object.defineProperty(proto,'requestPermission',{value:async()=> 'granted',configurable:true});
        }
      });
      await controlled(page);
      const parentName=await page.evaluate(async()=>{
        const root=await navigator.storage.getDirectory();
        const parentName='sourcebook-opfs-tabs-'+crypto.randomUUID();
        const parent=await root.getDirectoryHandle(parentName,{create:true});
        const a=await parent.getDirectoryHandle('Folder A',{create:true});
        const b=await parent.getDirectoryHandle('Folder B',{create:true});
        for(const [dir,names] of [[a,['alpha.md','apple.md']],[b,['beta.md','banana.md']]]){
          for(const name of names){
            const handle=await dir.getFileHandle(name,{create:true});
            const writer=await handle.createWritable();await writer.write(name);await writer.close();
          }
        }
        const queue=[a,b];
        window.showDirectoryPicker=async()=>queue.shift();
        return parentName;
      });
      try{
        await page.locator('[data-action="open-folder"]').first().click();
        await page.locator('[data-source]').first().waitFor();
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='2 items');
        await page.locator('#search-input').fill('alpha');
        await page.locator('[data-action="table"]').click();
        await page.locator('#sort-mode').selectOption('name-desc');
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent?.startsWith('1 items'));
        await page.locator('[data-action="open-folder"]').first().click();
        await page.waitForFunction(()=>document.querySelectorAll('[data-source]').length===2);
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='2 items');
        await page.locator('#search-input').fill('beta');
        await page.locator('[data-action="list"]').click();
        await page.locator('#sort-mode').selectOption('type');
        await page.locator('[data-action="tab-prev"]').click();
        await page.waitForFunction(()=>document.querySelector('#search-input')?.value==='alpha');
        assert.equal(await page.locator('#sort-mode').inputValue(),'name-desc');
        assert.equal(await page.locator('#items.table').count(),1);
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent?.startsWith('1 items'));
        await page.keyboard.press('Alt+Shift+ArrowRight');
        await page.waitForFunction(()=>document.querySelector('#search-input')?.value==='beta');
        assert.equal(await page.locator('#sort-mode').inputValue(),'type');
        assert.equal(await page.locator('#items.list').count(),1);
        await page.waitForFunction(async()=>{
          const {getLocal}=await import('./src/storage.mjs');
          const saved=await getLocal('folder-tabs-v1');
          return saved?.tabs?.length===2&&saved.tabs[0].preferences?.search==='alpha'&&
            saved.tabs[1].preferences?.search==='beta'&&saved.activeId===saved.tabs[1].id;
        });
        await page.reload({waitUntil:'load'});
        await page.waitForFunction(()=>document.querySelectorAll('[data-source]').length===2&&document.querySelector('#search-input')?.value==='beta');
        assert.equal(await page.locator('#items.list').count(),1);
        await page.locator('[data-source]').first().click();
        await page.waitForFunction(()=>document.querySelector('#search-input')?.value==='alpha');
        assert.equal(await page.locator('#items.table').count(),1);
      }finally{
        await page.evaluate(async name=>{
          const {removeLocal}=await import('./src/storage.mjs');
          await removeLocal('folder-tabs-v1');await removeLocal('last-mode');
          const root=await navigator.storage.getDirectory();
          await root.removeEntry(name,{recursive:true});
        },parentName);
      }
    });

    await scenario('native Chromium OPFS progressive Folder reads, partial limits and cancellation',async(_context,page)=>{
      await controlled(page);
      const result=await page.evaluate(async()=>{
        const {enumerateFolderEntries}=await import('./src/folder-enumeration.mjs');
        const root=await navigator.storage.getDirectory();
        const name='sourcebook-opfs-progressive-'+crypto.randomUUID();
        const dir=await root.getDirectoryHandle(name,{create:true});
        try{
          for(let i=0;i<620;i++)await dir.getFileHandle('file-'+String(i).padStart(4,'0')+'.md',{create:true});
          const snapshots=[];
          const read=await enumerateFolderEntries(dir,{sourceId:'smoke',maxEntries:500,batchSize:100,
            progressIntervalMs:0,onProgress:items=>snapshots.push(items.length)});
          let current=true;
          const cancelled=await enumerateFolderEntries(dir,{sourceId:'smoke',maxEntries:500,batchSize:100,
            progressIntervalMs:0,isCurrent:()=>current,yieldControl:async()=>{current=false;}});
          return {count:read.items.length,limited:read.truncated,first:read.items[0].id,
            snapshots,cancelled:cancelled.cancelled,staleItems:cancelled.items.length};
        }finally{await root.removeEntry(name,{recursive:true});}
      });
      assert.equal(result.count,500);
      assert.equal(result.limited,true);
      assert.match(result.first,/smoke:file-/);
      assert.deepEqual(result.snapshots,[100,200,300,400,500]);
      assert.equal(result.cancelled,true);
      assert.equal(result.staleItems,0);
    });


    await scenario('Folder type, literal search and dotfile filters remain per-tab after reload',async(context,page)=>{
      // Synthetic picker/permission shim with real OPFS handles, not Android SAF.
      await context.addInitScript(()=>{
        window.showDirectoryPicker=async()=>{throw new DOMException('No synthetic folder','AbortError');};
        const proto=window.FileSystemHandle?.prototype;
        if(proto&&typeof proto.queryPermission!=='function'){
          Object.defineProperty(proto,'queryPermission',{value:async()=> 'granted',configurable:true});
          Object.defineProperty(proto,'requestPermission',{value:async()=> 'granted',configurable:true});
        }
      });
      await controlled(page);
      const parentName=await page.evaluate(async()=>{
        const root=await navigator.storage.getDirectory();
        const name='sourcebook-opfs-discovery-'+crypto.randomUUID();
        const parent=await root.getDirectoryHandle(name,{create:true});
        const a=await parent.getDirectoryHandle('Mixed',{create:true});
        const b=await parent.getDirectoryHandle('Second',{create:true});
        for(const [dir,names] of [[a,['notes.md','.private.md','link.url','drawing.ifc']],[b,['other.url','image.png']]]){
          for(const filename of names)await dir.getFileHandle(filename,{create:true});
        }
        const queue=[a,b];window.showDirectoryPicker=async()=>queue.shift();
        return name;
      });
      try{
        await page.locator('[data-action="open-folder"]').first().click();
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='4 items');
        await page.locator('#file-type').selectOption('text');
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='2 items of 4 read');
        await page.locator('[data-action="toggle-dotfiles"]').click();
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='1 items of 4 read');
        await page.locator('#search-input').fill('notes');
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='1 items of 4 read');
        await page.locator('[data-action="open-folder"]').first().click();
        await page.waitForFunction(()=>document.querySelectorAll('[data-source]').length===2);
        await page.locator('#file-type').selectOption('url');
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='1 items of 2 read');
        await page.locator('[data-action="tab-prev"]').click();
        await page.waitForFunction(()=>document.querySelector('#file-type')?.value==='text'&&document.querySelector('#search-input')?.value==='notes');
        assert.equal(await page.locator('[data-action="toggle-dotfiles"]').getAttribute('aria-pressed'),'false');
        await page.waitForFunction(async()=>{
          const {getLocal}=await import('./src/storage.mjs');
          const session=await getLocal('folder-tabs-v1');
          return session?.tabs?.length===2&&session.tabs[0].preferences?.fileType==='text'&&
            session.tabs[0].preferences?.showHidden===false&&session.tabs[1].preferences?.fileType==='url';
        });
        await page.reload({waitUntil:'load'});
        await page.waitForFunction(()=>document.querySelector('#file-type')?.value==='text'&&document.querySelector('#search-input')?.value==='notes');
        assert.equal(await page.locator('[data-action="toggle-dotfiles"]').getAttribute('aria-pressed'),'false');
        await page.locator('[data-action="tab-next"]').click();
        await page.waitForFunction(()=>document.querySelector('#file-type')?.value==='url');
      }finally{
        await page.evaluate(async name=>{
          const {removeLocal}=await import('./src/storage.mjs');
          await removeLocal('folder-tabs-v1');await removeLocal('last-mode');
          const root=await navigator.storage.getDirectory();
          await root.removeEntry(name,{recursive:true});
        },parentName);
      }
    });

    await scenario('Folder selection supports keyboard ranges, touch mode and filtered safety',async(context,page)=>{
      // Real OPFS files with a synthetic picker adapter; NOT Android SAF or Windows.
      await context.addInitScript(()=>{
        window.showDirectoryPicker=async()=>{throw new DOMException('No fixture','AbortError');};
        const proto=window.FileSystemHandle?.prototype;
        if(proto&&typeof proto.queryPermission!=='function'){
          Object.defineProperty(proto,'queryPermission',{value:async()=> 'granted',configurable:true});
          Object.defineProperty(proto,'requestPermission',{value:async()=> 'granted',configurable:true});
        }
      });
      await controlled(page);
      const fixture=await page.evaluate(async()=>{
        const root=await navigator.storage.getDirectory(),name='sourcebook-opfs-selection-'+crypto.randomUUID();
        const dir=await root.getDirectoryHandle(name,{create:true});
        for(const file of ['alpha.md','beta.md','gamma.url','delta.md'])await dir.getFileHandle(file,{create:true});
        window.showDirectoryPicker=async()=>dir;
        return name;
      });
      try{
        await page.locator('[data-action="open-folder"]').first().click();
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='4 items');
        await page.locator('#sort-mode').selectOption('name');
        const rows=page.locator('#items .resource[data-item]');
        await rows.nth(0).click();
        await rows.nth(2).click({modifiers:['Shift']});
        assert.equal(await page.locator('#items .resource.selected').count(),3);
        await rows.nth(1).click({modifiers:['Shift']});
        assert.equal(await page.locator('#items .resource.selected').count(),2,'Shift anchor stays on first clicked item');
        await page.locator('[data-action="toggle-selection"]').click();
        assert.equal(await page.locator('[data-action="toggle-selection"]').getAttribute('aria-pressed'),'true');
        await rows.nth(3).click();
        assert.equal(await page.locator('#items .resource.selected').count(),3,'touch-friendly mode toggles');
        await page.locator('[data-action="select-shown"]').click();
        assert.equal(await page.locator('#items .resource.selected').count(),4);
        await page.locator('#file-type').selectOption('url');
        assert.equal(await page.locator('#items .resource.selected').count(),0,'filter clears invisible selection');
        await page.locator('#file-type').selectOption('all');
        await page.locator('#items .resource').first().focus();
        await page.keyboard.press('Control+a');
        assert.equal(await page.locator('#items .resource.selected').count(),4);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#items .resource.selected').count(),0);
        await page.locator('#search-input').fill('gamma');
        await page.locator('#search-input').press('Control+a');
        assert.equal(await page.locator('#search-input').inputValue(),'gamma','native text input selection remains intact');
        assert.equal(await page.locator('#items .resource.selected').count(),0);
        const entries=await page.evaluate(async name=>{
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(name);
          const found=[];for await(const [filename] of dir.entries())found.push(filename);
          return found.sort();
        },fixture);
        assert.deepEqual(entries,['alpha.md','beta.md','delta.md','gamma.url']);
      }finally{
        await page.evaluate(async name=>{
          const {removeLocal}=await import('./src/storage.mjs');
          await removeLocal('folder-tabs-v1');await removeLocal('last-mode');
          const root=await navigator.storage.getDirectory();
          await root.removeEntry(name,{recursive:true});
        },fixture);
      }
    });


    await scenario('Folder keyboard focus survives redraws and Enter previews all layouts',async(context,page)=>{
      // Native OPFS with a test-only permission adapter; NOT external Folder/Android SAF.
      await context.addInitScript(()=>{
        window.showDirectoryPicker=async()=>{throw new DOMException('Fixture only','AbortError');};
        const proto=window.FileSystemHandle?.prototype;
        if(proto&&typeof proto.queryPermission!=='function'){
          Object.defineProperty(proto,'queryPermission',{value:async()=> 'granted',configurable:true});
          Object.defineProperty(proto,'requestPermission',{value:async()=> 'granted',configurable:true});
        }
      });
      await controlled(page);
      const fixture=await page.evaluate(async()=>{
        const root=await navigator.storage.getDirectory(),name='sourcebook-opfs-focus-'+crypto.randomUUID();
        const dir=await root.getDirectoryHandle(name,{create:true});
        for(const file of ['alpha.md','beta.md','gamma.md','delta.md']){
          const handle=await dir.getFileHandle(file,{create:true});
          const writer=await handle.createWritable();await writer.write('# '+file);await writer.close();
        }
        window.showDirectoryPicker=async()=>dir;
        return name;
      });
      try{
        await page.locator('[data-action="open-folder"]').first().click();
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='4 items');
        for(const layout of ['gallery','list','table']){
          await page.locator('[data-action="'+layout+'"]').click();
          const rows=page.locator('#items .resource[data-item]');
          assert.equal(await rows.count(),4);
          assert.equal(await page.locator('#items .resource[tabindex="0"]').count(),1);
          await rows.first().focus();
          assert.equal(await rows.first().getAttribute('tabindex'),'0','focused Resource owns the only Tab stop');
          await page.keyboard.press('End');
          assert.equal(await page.evaluate(()=>document.activeElement?.dataset.item),await rows.last().getAttribute('data-item'));
          await page.keyboard.press('Home');
          assert.equal(await page.evaluate(()=>document.activeElement?.dataset.item),await rows.first().getAttribute('data-item'));
          await page.keyboard.press(layout==='gallery'?'Shift+ArrowRight':'Shift+ArrowDown');
          assert.equal(await page.locator('#items .resource.selected').count(),2);
          await page.evaluate(()=>document.querySelector('#sort-mode').dispatchEvent(new Event('input',{bubbles:true})));
          assert.equal(await page.locator('#items .resource[tabindex="0"]').count(),1);
          assert.equal(await page.evaluate(()=>document.activeElement?.matches('#items .resource[data-item]')),true);
          await page.keyboard.press('Enter');
          await page.locator('#viewer').waitFor();
          await page.keyboard.press('Escape');
          await page.locator('#viewer').waitFor({state:'detached'});
        }
        await page.locator('#search-input').fill('gamma');
        assert.equal(await page.locator('#items .resource').count(),1);
        assert.equal(await page.locator('#items .resource[tabindex="0"]').count(),1);
        const entries=await page.evaluate(async name=>{
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(name);
          const names=[];for await(const [entry] of dir.entries())names.push(entry);return names.sort();
        },fixture);
        assert.deepEqual(entries,['alpha.md','beta.md','delta.md','gamma.md']);
      }finally{
        await page.evaluate(async name=>{
          const {removeLocal}=await import('./src/storage.mjs');
          await removeLocal('folder-tabs-v1');await removeLocal('last-mode');
          const root=await navigator.storage.getDirectory();await root.removeEntry(name,{recursive:true});
        },fixture);
      }
    });

    await scenario('Folder paging bounds DOM, supports keyboard jumps and page-local bulk selection',async(context,page)=>{
      // Real OPFS files, synthetic picker permission; NOT external Folder or Android SAF.
      await context.addInitScript(()=>{
        window.showDirectoryPicker=async()=>{throw new DOMException('Fixture only','AbortError');};
        const proto=window.FileSystemHandle?.prototype;
        if(proto&&typeof proto.queryPermission!=='function'){
          Object.defineProperty(proto,'queryPermission',{value:async()=> 'granted',configurable:true});
          Object.defineProperty(proto,'requestPermission',{value:async()=> 'granted',configurable:true});
        }
      });
      await controlled(page);
      const fixture=await page.evaluate(async()=>{
        const root=await navigator.storage.getDirectory(),name='sourcebook-opfs-pages-'+crypto.randomUUID();
        const dir=await root.getDirectoryHandle(name,{create:true});
        for(let i=0;i<325;i++)await dir.getFileHandle('file-'+String(i).padStart(3,'0')+'.md',{create:true});
        window.showDirectoryPicker=async()=>dir;return name;
      });
      try{
        await page.locator('[data-action="open-folder"]').first().click();
        await page.waitForFunction(()=>document.querySelector('#item-count')?.textContent==='325 items');
        assert.equal(await page.locator('#items .resource').count(),150);
        assert.match(await page.locator('.resource-pager').innerText(),/1–150 of 325 · Page 1\/3/);
        await page.locator('#items .resource').first().click();
        await page.locator('[data-page-step="1"]').click();
        assert.equal(await page.locator('#items .resource').count(),150);
        assert.match(await page.locator('.resource-pager').innerText(),/151–300 of 325 · Page 2\/3/);
        await page.locator('#items .resource').first().click({modifiers:['Shift']});
        assert.match(await page.locator('#status').innerText(),/151 selected/);
        await page.locator('[data-action="toggle-selection"]').click();
        await page.locator('[data-action="select-shown"]').click();
        assert.match(await page.locator('#status').innerText(),/150 selected/);
        await page.locator('#items .resource').first().focus();
        await page.keyboard.press('End');
        assert.equal(await page.locator('#items .resource').count(),25);
        assert.match(await page.locator('.resource-pager').innerText(),/301–325 of 325 · Page 3\/3/);
        assert.match(await page.evaluate(()=>document.activeElement?.dataset.item||''),/file-324/);
        await page.locator('[data-page-step="-1"]').click();
        assert.equal(await page.locator('#items .resource').count(),150);
        await page.locator('#search-input').fill('file-324');
        assert.equal(await page.locator('#items .resource').count(),1);
        assert.equal(await page.locator('.resource-pager').count(),0);
        const count=await page.evaluate(async name=>{
          const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(name);
          let n=0;for await(const _ of dir.entries())n++;return n;
        },fixture);
        assert.equal(count,325,'all ordinary files remain untouched');
      }finally{
        await page.evaluate(async name=>{
          const {removeLocal}=await import('./src/storage.mjs');
          await removeLocal('folder-tabs-v1');await removeLocal('last-mode');
          const root=await navigator.storage.getDirectory();await root.removeEntry(name,{recursive:true});
        },fixture);
      }
    });
    process.stdout.write('Chromium smoke '+passed+'/15 passed. Real Chromium OPFS is origin-private; external Folder, Windows/Pixel 8 and Syncthing M0 acceptance OPEN.\n');
  }finally{
    await browser?.close();
    await new Promise(resolveClose=>server.close(resolveClose));
  }
}
main().catch(error=>{console.error('Chromium smoke failed:',error);process.exitCode=1;});
