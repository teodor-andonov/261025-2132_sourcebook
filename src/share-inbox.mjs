// Device-local, explicitly reviewed Android/Web Share Target inbox.
// No ordinary source-file or portable Catalog writes are performed here.
import {normalizeCaptureURL} from './link-capture.mjs';
import {prepareSharedFiles,validateSharedFileDescriptors,restoreSharedFiles,verifySharedFileIntegrity,requestSharedFileDownload} from './shared-files.mjs';
import {createPreparedShareSession} from './prepared-share-handoff.mjs';

export const SHARE_INBOX_LIMIT=12;
export const SHARE_INBOX_TOTAL_BYTES=100*1024*1024;
export const SHARE_INBOX_DB='sourcebook-share-inbox-v1';
const STORE='items';
const ATTACHMENTS='attachments';
const MAX_TEXT=8192;
const MAX_TITLE=120;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function boundedText(value,max,label){
  if(value===null||value===undefined)return '';
  if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
    throw Error('Invalid shared '+label);
  return value.trim();
}
export function prepareIncomingShare(fields,{idFactory=()=>globalThis.crypto.randomUUID(),now=()=>new Date().toISOString(),fileDescriptors=[]}={}){
  if(!fields||typeof fields!=='object')throw Error('Invalid shared content');
  const title=boundedText(fields.title,MAX_TITLE,'title');
  const text=boundedText(fields.text,MAX_TEXT,'text');
  const url=boundedText(fields.url,2048,'URL');
  const files=validateSharedFileDescriptors(fileDescriptors);
  if(!title&&!text&&!url&&!files.length)throw Error('Nothing was shared');
  const matches=[];
  if(url)matches.push(url);
  else if(text)matches.push(...(text.match(/https?:\/\/[^\s<>"']+/giu)||[]).map(s=>s.replace(/[),.;!?]+$/u,'')));
  const canonical=[];
  for(const match of matches){
    try{const normalized=normalizeCaptureURL(match);if(!canonical.includes(normalized))canonical.push(normalized);}
    catch{ /* Unsupported or malformed URLs remain visible as text, never saved as links. */ }
  }
  const candidate=canonical.length===1?canonical[0]:null;
  const kind=files.length?'files':canonical.length>1?'ambiguous':candidate?'url':'text';
  const id=idFactory(),receivedAt=now();
  if(typeof id!=='string'||!UUID.test(id)||typeof receivedAt!=='string'||!Number.isFinite(Date.parse(receivedAt)))
    throw Error('Could not create a valid incoming share record');
  return {id,receivedAt,title,text,url,candidate,kind,files};
}
export function normalizeIncomingRecord(raw){
  if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||!UUID.test(raw.id)||
    typeof raw.receivedAt!=='string'||!Number.isFinite(Date.parse(raw.receivedAt)))
    throw Error('Incoming share data is damaged');
  const clean=prepareIncomingShare(raw,{idFactory:()=>raw.id,now:()=>raw.receivedAt,fileDescriptors:raw.files||[]});
  if(clean.candidate!==raw.candidate||clean.kind!==raw.kind||
    (raw.files!==undefined&&JSON.stringify(clean.files)!==JSON.stringify(raw.files)))
    throw Error('Incoming share data is inconsistent');
  return clean;
}
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(SHARE_INBOX_DB,2);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});
      if(!req.result.objectStoreNames.contains(ATTACHMENTS))req.result.createObjectStore(ATTACHMENTS,{keyPath:'id'});
    };
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
export function assertShareInboxCapacity(existing,newRecord){
  if(!Array.isArray(existing)||existing.length>=SHARE_INBOX_LIMIT)
    throw Error('Incoming share inbox is full; review or discard earlier shares');
  const total=[...existing,newRecord].reduce((sum,item)=>{
    const descriptors=validateSharedFileDescriptors(item.files||[]);
    return sum+descriptors.reduce((n,file)=>n+file.size,0);
  },0);
  if(total>SHARE_INBOX_TOTAL_BYTES)
    throw Error('Incoming share inbox exceeds the 100 MiB temporary storage limit');
  return total;
}
export async function enqueueIncomingShare(item,{files=[]}={}){
  const record=normalizeIncomingRecord(item);
  const prepared=prepareSharedFiles(files);
  if(JSON.stringify(prepared.descriptors)!==JSON.stringify(record.files.map(({sha256,...plain})=>plain)))
    throw Error('Shared file payload does not match its inbox metadata');
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    let failure=null;
    const tx=db.transaction([STORE,ATTACHMENTS],'readwrite'),store=tx.objectStore(STORE),existing=store.getAll();
    existing.onsuccess=()=>{
      try{
        assertShareInboxCapacity(existing.result,record);
        store.add(record);
        if(prepared.files.length)tx.objectStore(ATTACHMENTS).add({id:record.id,files:prepared.files});
      }catch(error){failure=error;tx.abort();}
    };
    existing.onerror=()=>{failure=existing.error;tx.abort();};
    tx.oncomplete=()=>{db.close();resolve(record.id);};
    tx.onabort=()=>{db.close();reject(failure||tx.error||Error('Incoming share could not be saved'));};
    tx.onerror=()=>{failure=tx.error;};
  });
}
export async function getIncomingShareFiles(id){
  if(typeof id!=='string'||!UUID.test(id))throw Error('Invalid incoming share ID');
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([STORE,ATTACHMENTS],'readonly');
    const recordReq=tx.objectStore(STORE).get(id);
    const attachmentReq=tx.objectStore(ATTACHMENTS).get(id);
    tx.oncomplete=async()=>{
      db.close();
      try{
        if(!recordReq.result)throw Error('Incoming share no longer exists');
        const record=normalizeIncomingRecord(recordReq.result);
        if(!record.files.length)throw Error('Incoming share contains no files');
        const files=await verifySharedFileIntegrity(attachmentReq.result?.files,record.files);
        resolve(files);
      }catch(error){reject(error);}
    };
    tx.onabort=()=>{db.close();reject(tx.error||Error('Shared files could not be read'));};
    tx.onerror=()=>{ /* transaction abort handles the error */ };
  });
}
export async function removeIncomingShare(id){
  if(typeof id!=='string'||!UUID.test(id))throw Error('Invalid incoming share ID');
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    let failure=null;
    const tx=db.transaction([STORE,ATTACHMENTS],'readwrite'),store=tx.objectStore(STORE),get=store.get(id);
    get.onsuccess=()=>{
      if(!get.result){failure=Error('Incoming share no longer exists');tx.abort();}
      else{store.delete(id);tx.objectStore(ATTACHMENTS).delete(id);}
    };
    get.onerror=()=>{failure=get.error;tx.abort();};
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=()=>{db.close();reject(failure||tx.error||Error('Could not remove incoming share'));};
    tx.onerror=()=>{failure=tx.error;};
  });
}
export function createShareInboxUI({openDialog,escapeHTML,toast,linkCapture,onSaveFile,onDownloadFile,onImportFiles,env=globalThis}){
  let busy=false;
  const $=selector=>env.document.querySelector(selector);
  async function open(){
    const handoff=createPreparedShareSession();
    openDialog('<h2>Incoming shares</h2><p>Shared URLs, text and files are temporary on this device. Review and copy them into a real Folder. Download or Send to app only requests external delivery: neither verifies a saved file nor clears the inbox. No Catalog-only Resource is created.</p><div id="share-handoff-ready" role="status" aria-live="polite"></div><div id="share-inbox-list" aria-live="polite">Loading…</div><div class="dialog-actions"><button class="primary" type="button" data-action="dismiss">Done</button></div>');
    const dialog=$('#dialog');
    async function render(){
      handoff.clear();
      const ready=$('#share-handoff-ready');if(ready)ready.textContent='';
      const host=$('#share-inbox-list');if(!host)return;
      try{
        const items=await listIncomingShares();if(!$('#share-inbox-list'))return;
        host.innerHTML=items.length?items.map(item=>
          '<div class="capture-row"><div class="capture-link"><strong>'+escapeHTML(item.title||item.candidate||(item.files.length?'Shared files':'Shared text'))+'</strong><small>'+escapeHTML(item.files.length?item.files.length+' files · temporary device inbox':item.candidate||(item.kind==='ambiguous'?'Multiple URLs · copy or review manually':'Text only · copy or review manually'))+'</small>'+
          (item.text||item.url?'<textarea readonly rows="2" aria-label="Original shared content">'+escapeHTML(item.text||item.url)+'</textarea>':'')+
          (item.files.length?'<div>'+item.files.map((file,index)=>'<div>'+escapeHTML(file.name)+' <small>'+file.size+' bytes</small> <button class="secondary" type="button" data-share="download-file" data-file-index="'+index+'" data-share-id="'+item.id+'">Download</button> <button class="secondary" type="button" data-share="share-file" data-file-index="'+index+'" data-share-id="'+item.id+'">Prepare to send</button></div>').join('')+'</div>':'')+'</div>'+
          (item.files.length?'<button class="secondary" type="button" data-share="review-files" data-share-id="'+item.id+'">Review files</button><button class="secondary" type="button" data-share="share-files" data-share-id="'+item.id+'">Prepare all to send</button>':'')+
          (item.candidate?'<button class="secondary" type="button" data-share="file-url" data-share-id="'+item.id+'">Create .url</button><button class="secondary" type="button" data-share="download-url" data-share-id="'+item.id+'">Download .url</button><button class="secondary" type="button" data-share="review" data-share-id="'+item.id+'">Stage URL</button>':'')+
          (item.text||item.url||(!item.files.length&&item.title)?'<button class="secondary" type="button" data-share="file-text" data-share-id="'+item.id+'">Create .md</button><button class="secondary" type="button" data-share="download-text" data-share-id="'+item.id+'">Download .md</button>':'')+
          (item.text||item.url||item.title?'<button class="secondary" type="button" data-share="copy" data-share-id="'+item.id+'">Copy text</button>':'')+'<button class="secondary" type="button" data-share="discard" data-share-id="'+item.id+'">Discard</button></div>'
        ).join(''):'<p>No pending shares.</p>';
      }catch(error){host.textContent='Cannot read incoming shares: '+error.message+'. Nothing was removed.';}
    }
    dialog.addEventListener('click',async event=>{
      const button=event.target.closest('[data-share]');if(!button||busy)return;
      // This branch must run before ANY await: Android Web Share needs the
      // final navigator.share() call within this second trusted click.
      if(button.dataset.share==='send-prepared'){
        busy=true;
        try{
          const operation=handoff.send({env});
          const ready=$('#share-handoff-ready');if(ready)ready.textContent='';
          await operation;
          toast('System share requested. Verify the receiving app saved the files; inbox staging remains.');
        }catch(error){toast('Incoming share: '+error.message,true);}
        finally{busy=false;}
        return;
      }
      if(button.dataset.share==='cancel-prepared'){
        handoff.clear();
        const ready=$('#share-handoff-ready');if(ready)ready.textContent='';
        return;
      }
      handoff.clear();
      const ready=$('#share-handoff-ready');if(ready)ready.textContent='';
      busy=true;
      try{
        const items=await listIncomingShares(),item=items.find(x=>x.id===button.dataset.shareId);
        if(!item)throw Error('Share changed; reopen the inbox');
        if(button.dataset.share==='review-files'){
          if(typeof onImportFiles!=='function')throw Error('Reviewed file import is unavailable');
          const files=await getIncomingShareFiles(item.id);
          await onImportFiles(files,item.id);
        }else if(['share-file','share-files'].includes(button.dataset.share)){
          // Integrity is checked before handoff. The system destination cannot
          // be inspected or trusted, and staged content is NEVER cleared here.
          const files=await getIncomingShareFiles(item.id);
          const selected=button.dataset.share==='share-files'?files:(()=>{
            const index=Number(button.dataset.fileIndex);
            if(!Number.isSafeInteger(index)||index<0||index>=files.length)
              throw Error('Invalid shared file selection');
            return [files[index]];
          })();
          // IndexedDB read and SHA-256 verification are complete NOW. A second
          // explicit click opens the OS sheet without an intervening await.
          const summary=handoff.prepare({shareId:item.id,files:selected});
          const host=$('#share-handoff-ready');
          if(!host){handoff.clear();throw Error('Share review closed; prepare again');}
          host.innerHTML='<p>Ready to send '+summary.count+' verified file(s), '+summary.totalBytes+' bytes. Files are temporary; the receiving app and destination are unverified. Prepared files expire after 2 minutes.</p>'+
            '<div>'+summary.names.map(name=>'<small>'+escapeHTML(name)+'</small>').join(' · ')+'</div>'+
            '<button class="primary" type="button" data-share="send-prepared">Send prepared file(s)…</button> '+
            '<button class="secondary" type="button" data-share="cancel-prepared">Cancel</button>';
        }else if(button.dataset.share==='download-file'){
          const files=await getIncomingShareFiles(item.id);
          const index=Number(button.dataset.fileIndex);
          if(!Number.isSafeInteger(index)||index<0||index>=files.length)throw Error('Invalid shared file selection');
          requestSharedFileDownload(files[index],{env});
          toast('Browser download requested. Inspect Downloads before discarding the temporary share.');
        }else if(['file-url','download-url','file-text','download-text'].includes(button.dataset.share)){
          const action=button.dataset.share,isURL=action.endsWith('url'),download=action.startsWith('download');
          if(isURL&&!item.candidate)throw Error('This share does not have a single verified URL');
          const handler=download?onDownloadFile:onSaveFile;
          if(typeof handler!=='function')throw Error('File capture is unavailable');
          const input=isURL?{kind:'url',value:item.candidate,title:item.title}:
            {kind:'text',value:item.text||item.url||item.title,title:item.title};
          const result=await handler(input);
          if(!download&&result?.handle){
            if(item.files.length)toast('Text saved. File attachments remain in the temporary inbox until verified or discarded.');
            else await removeIncomingShare(item.id);
            await render();
          }else if(download)toast('Browser download requested. Verify the file in Downloads before discarding the share.');
        }else if(button.dataset.share==='review'&&item.candidate){
          linkCapture.open({prefill:item.candidate,notice:'Shared URL · stage for review only. The pending share remains until a verified file write or explicit Discard.',onSaved:async()=>{
            toast('URL staged temporarily. Create a .url file before discarding the original share.');
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
