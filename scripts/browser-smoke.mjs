// Headless Linux Chromium smoke, NOT physical Windows/Pixel 8 acceptance.
// No screenshots, traces, video or ordinary source file writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
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
      assert.match(await page.locator('.landing').innerText(),/Folder access is unavailable/);
      await page.locator('[data-action="device-checks"]').click();
      assert.match(await page.locator('[data-m0-provider-gate]').innerText(),/blocked/i);
      await page.locator('[data-action="dismiss"]').click();
      await page.locator('[data-action="capture-file"]').click();
      await page.locator('#capture-file-form textarea[name="content"]').fill('https://example.org/sourcebook-smoke');
      const pending=page.waitForEvent('download');
      await page.locator('#capture-file-form button[data-delivery="download"]').click();
      const download=await pending;
      assert.match(download.suggestedFilename(),/\.url$/);
      const chunks=[];
      for await(const chunk of await download.createReadStream())chunks.push(chunk);
      assert.equal(Buffer.concat(chunks).toString('utf8'),'[InternetShortcut]\r\nURL=https://example.org/sourcebook-smoke\r\n');
    });
    process.stdout.write('Chromium smoke '+passed+'/3 passed. Synthetic Linux browser only; M0 device acceptance OPEN.\n');
  }finally{
    await browser?.close();
    await new Promise(resolveClose=>server.close(resolveClose));
  }
}
main().catch(error=>{console.error('Chromium smoke failed:',error);process.exitCode=1;});
