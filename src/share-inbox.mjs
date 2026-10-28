// Device-local, explicitly reviewed Android/Web Share Target inbox.
// No ordinary source-file or portable Catalog writes are performed here.
import {normalizeCaptureURL} from './link-capture.mjs';

export const SHARE_INBOX_LIMIT=12;
export const SHARE_INBOX_DB='sourcebook-share-inbox-v1';
const STORE='items';
const MAX_TEXT=8192;
const MAX_TITLE=120;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function boundedText(value,max,label){
  if(value===null||value===undefined)return '';
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
    throw Error('Invalid shared '+label);
  return value.trim();
}
export function prepareIncomingShare(fields,{idFactory=()=>globalThis.crypto.randomUUID(),now=()=>new Date().toISOString()}={}){
  if(!fields||typeof fields!=='object')throw Error('Invalid shared content');
  const title=boundedText(fields.title,MAX_TITLE,'title');
  const text=boundedText(fields.text,MAX_TEXT,'text');
  const url=boundedText(fields.url,2048,'URL');
  if(!title&&!text&&!url)throw Error('Nothing was shared');
  const matches=[];
  if(url)matches.push(url);
  else if(text)matches.push(...(text.match(/https?:\/\/[^\s<>"']+/giu)||[]).map(s=>s.replace(/[),.;!?]+$/u,'')));
  const canonical=[];
  for(const match of matches){
    try{const normalized=normalizeCaptureURL(match);if(!canonical.includes(normalized))canonical.push(normalized);}
    catch{ /* Unsupported or malformed URLs remain visible as text, never saved as links. */ }
  }
  const candidate=canonical.length===1?canonical[0]:null;
  const kind=canonical.length>1?'ambiguous':candidate?'url':'text';
  const id=idFactory(),receivedAt=now();
  if(typeof id!=='string'||!UUID.test(id)||typeof receivedAt!=='string'||!Number.isFinite(Date.parse(receivedAt)))
    throw Error('Could not create a valid incoming share record');
  return {id,receivedAt,title,text,url,candidate,kind};
}
export function normalizeIncomingRecord(raw){
  if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||!UUID.test(raw.id)||
    typeof raw.receivedAt!=='string'||!Number.isFinite(Date.parse(raw.receivedAt)))
    throw Error('Incoming share data is damaged');
  const clean=prepareIncomingShare(raw,{idFactory:()=>raw.id,now:()=>raw.receivedAt});
  if(clean.candidate!==raw.candidate||clean.kind!==raw.kind)
    throw Error('Incoming share data is inconsistent');
  return clean;
}
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(SHARE_INBOX_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('Share inbox unavailable'));
  });
}
export async function listIncomingShares(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>{
      try{
        if(req.result.length>SHARE_INBOX_LIMIT)throw Error('Incoming share inbox exceeds its safety limit');
        const items=req.result.map(normalizeIncomingRecord);
        items.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt));
        resolve(items);
      }catch(error){reject(error);}
    };
    req.onerror=()=>reject(req.error||Error('Cannot read incoming shares'));
    tx.oncomplete=()=>db.close();
    tx.onabort=()=>{db.close();reject(tx.error||Error('Share inbox read aborted'));};
  });
}
export async function enqueueIncomingShare(item){
  const record=normalizeIncomingRecord(item),db=await openDB();
  return new Promise((resolve,reject)=>{
    let failure=null;
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),count=store.count();
    count.onsuccess=()=>{
      if(count.result>=SHARE_INBOX_LIMIT){failure=Error('Incoming share inbox is full; review or discard earlier shares');tx.abort();return;}
      store.add(record);
    };
    count.onerror=()=>{failure=count.error;tx.abort();};
    tx.oncomplete=()=>{db.close();resolve(record.id);};
    tx.onabort=()=>{db.close();reject(failure||tx.error||Error('Incoming share could not be saved'));};
    tx.onerror=()=>{failure=tx.error;};
  });
}
export async function removeIncomingShare(id){
  if(typeof id!=='string'||!UUID.test(id))throw Error('Invalid incoming share ID');
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    let failure=null;
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),get=store.get(id);
    get.onsuccess=()=>{
      if(!get.result){failure=Error('Incoming share no longer exists');tx.abort();}
      else store.delete(id);
    };
    get.onerror=()=>{failure=get.error;tx.abort();};
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=()=>{db.close();reject(failure||tx.error||Error('Could not remove incoming share'));};
    tx.onerror=()=>{failure=tx.error;};
  });
}
export function createShareInboxUI({openDialog,escapeHTML,toast,linkCapture,onSaveFile,onDownloadFile,env=globalThis}){
  let busy=false;
  const $=selector=>env.document.querySelector(selector);
  async function open(){
    openDialog('<h2>Incoming shares</h2><p>Shared URLs and text are temporary. Create a real .url or .md in a chosen Folder; browser Download is a fallback with no verified destination. Only verified Folder saves clear a share automatically. No Catalog-only Resource is created.</p><div id="share-inbox-list" aria-live="polite">Loading…</div><div class="dialog-actions"><button class="primary" type="button" data-action="dismiss">Done</button></div>');
    const dialog=$('#dialog');
    async function render(){
      const host=$('#share-inbox-list');if(!host)return;
      try{
        const items=await listIncomingShares();if(!$('#share-inbox-list'))return;
        host.innerHTML=items.length?items.map(item=>
          '<div class="capture-row"><div class="capture-link"><strong>'+escapeHTML(item.title||item.candidate||'Shared text')+'</strong><small>'+escapeHTML(item.candidate||(item.kind==='ambiguous'?'Multiple URLs · copy or review manually':'Text only · copy or review manually'))+'</small><textarea readonly rows="2" aria-label="Original shared content">'+escapeHTML(item.text||item.url)+'</textarea></div>'+
          (item.candidate?'<button class="secondary" type="button" data-share="file-url" data-share-id="'+item.id+'">Create .url</button><button class="secondary" type="button" data-share="download-url" data-share-id="'+item.id+'">Download .url</button><button class="secondary" type="button" data-share="review" data-share-id="'+item.id+'">Stage URL</button>':'')+
          '<button class="secondary" type="button" data-share="file-text" data-share-id="'+item.id+'">Create .md</button><button class="secondary" type="button" data-share="download-text" data-share-id="'+item.id+'">Download .md</button>'+
          '<button class="secondary" type="button" data-share="copy" data-share-id="'+item.id+'">Copy</button><button class="secondary" type="button" data-share="discard" data-share-id="'+item.id+'">Discard</button></div>'
        ).join(''):'<p>No pending shares.</p>';
      }catch(error){host.textContent='Cannot read incoming shares: '+error.message+'. Nothing was removed.';}
    }
    dialog.addEventListener('click',async event=>{
      const button=event.target.closest('[data-share]');if(!button||busy)return;
      busy=true;
      try{
        const items=await listIncomingShares(),item=items.find(x=>x.id===button.dataset.shareId);
        if(!item)throw Error('Share changed; reopen the inbox');
        if(['file-url','download-url','file-text','download-text'].includes(button.dataset.share)){
          const action=button.dataset.share,isURL=action.endsWith('url'),download=action.startsWith('download');
          if(isURL&&!item.candidate)throw Error('This share does not have a single verified URL');
          const handler=download?onDownloadFile:onSaveFile;
          if(typeof handler!=='function')throw Error('File capture is unavailable');
          const input=isURL?{kind:'url',value:item.candidate,title:item.title}:
            {kind:'text',value:item.text||item.url||item.title,title:item.title};
          const result=await handler(input);
          if(!download&&result?.handle){
            await removeIncomingShare(item.id);
            await render();
          }else if(download)toast('Browser download requested. Verify the file in Downloads before discarding the share.');
        }else if(button.dataset.share==='review'&&item.candidate){
          linkCapture.open({prefill:item.candidate,notice:'Shared URL · review and explicitly Save links. The pending share is removed only after a successful save.',onSaved:async()=>{
            await removeIncomingShare(item.id);
            toast('Shared URL saved on this device. Pending share cleared.');
          }});
        }else if(button.dataset.share==='copy'){
          if(typeof env.navigator?.clipboard?.writeText!=='function')throw Error('Clipboard write is unavailable; select the text in the inbox instead');
          await env.navigator.clipboard.writeText(item.text||item.url||item.title);
          toast('Shared text copied.');
        }else if(button.dataset.share==='discard'&&env.confirm('Discard this pending share from this device?')){
          await removeIncomingShare(item.id);await render();
        }
      }catch(error){toast('Incoming share: '+error.message,true);}
      finally{busy=false;}
    });
    await render();
  }
  return {open};
}
