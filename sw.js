import {prepareIncomingShare,enqueueIncomingShare} from './src/share-inbox.mjs';
import {prepareSharedFiles,fingerprintSharedFiles,MAX_SHARED_TOTAL_BYTES} from './src/shared-files.mjs';
const CACHE='sourcebook-shell-0.0.49-m0-provider-evidence';
const FILES=['./','./index.html','./src/styles.css','./src/app.mjs','./src/device-readiness.mjs','./src/link-capture.mjs','./src/catalog-urls.mjs','./src/catalog-url-bulk.mjs','./src/catalog-links-ui.mjs','./src/file-capture.mjs','./src/capture-intake.mjs','./src/clipboard-images.mjs','./src/file-import.mjs','./src/file-stream-import.mjs','./src/legacy-url-migration.mjs','./src/share-inbox.mjs','./src/share-storage.mjs','./src/m0-feasibility.mjs','./src/m0-acceptance.mjs','./src/m0-capture-acceptance.mjs','./src/m0-evidence-review.mjs','./src/m0-provider-gate.mjs','./src/storage.mjs','./src/identity.mjs','./src/catalog.mjs','./src/catalog-transactions.mjs','./src/catalog-backup.mjs','./src/catalog-restore.mjs','./src/catalog-conflicts.mjs','./src/catalog-folders.mjs','./src/catalog-search.mjs','./src/source-scan.mjs','./src/source-index.mjs','./src/source-overlap.mjs','./src/overlap-review.mjs','./src/overlap-review-ui.mjs','./src/view-layout.mjs','./src/file-symbols.mjs','./src/views.mjs','./src/views-controller.mjs','./src/bulk-tags.mjs','./src/navigation.mjs','./src/workspace.mjs','./src/tags.mjs','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable-192.png','./assets/icon-maskable-512.png','./manifest.webmanifest'];
const SHARE_PATH=new URL('./share-target',self.registration.scope).pathname;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sourcebook-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function receiveShare(request){
  try{
    if(!/^multipart\/form-data(?:;|$)/iu.test(request.headers.get('content-type')||''))throw Error('Unsupported share format');
    const contentLength=Number(request.headers.get('content-length'));
    if(Number.isFinite(contentLength)&&contentLength>MAX_SHARED_TOTAL_BYTES+1024*1024)
      throw Error('Shared request exceeds the temporary inbox limit');
    const form=await request.formData();
    for(const [key,value] of form){
      if(key==='files'){if(typeof value==='string')throw Error('Invalid shared file');continue;}
      if(!['title','text','url'].includes(key)||typeof value!=='string'||form.getAll(key).length!==1)
        throw Error('Only a single title, text and URL field may be shared');
    }
    const shared=prepareSharedFiles(form.getAll('files'));
    const hashed=await fingerprintSharedFiles(shared.files);
    const item=prepareIncomingShare({title:form.get('title'),text:form.get('text'),url:form.get('url')},{fileDescriptors:hashed.descriptors});
    await enqueueIncomingShare(item,{files:shared.files});
    // Only a constant marker is in the navigation URL. Private share content stays in IndexedDB.
    return Response.redirect(new URL('./?shared=1',self.registration.scope).href,303);
  }catch(error){
    return new Response('Sourcebook could not receive this share. Copy the content through the system file manager or try sharing again. '+error.message,
      {status:400,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  }
}
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.registration.scope).pathname))return;
  if(e.request.method==='POST'&&url.pathname===SHARE_PATH){
    e.respondWith(receiveShare(e.request));return;
  }
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(async()=>await caches.match('./index.html')||Response.error()));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));
});
