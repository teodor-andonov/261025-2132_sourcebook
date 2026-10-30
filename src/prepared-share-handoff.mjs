// Two-gesture Web Share handoff for device-local staged attachments.
// Async IndexedDB read + SHA-256 verification happen during preparation, NOT
// inside the final user-activation click. Files stay in memory only until
// sent/cancelled/expired; a share result is never a verified filesystem save.
import {prepareSharedFiles} from './shared-files.mjs';
import {shareIncomingFiles} from './file-share-out.mjs';

export const PREPARED_SHARE_TTL_MS=2*60*1000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export function createPreparedShareSession({clock=()=>Date.now(),ttlMs=PREPARED_SHARE_TTL_MS}={}){
  if(!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>10*60*1000)
    throw Error('Invalid prepared share lifetime');
  let pending=null;
  function clear(){pending=null;}
  function prepare({shareId,files}){
    clear();
    if(typeof shareId!=='string'||!UUID.test(shareId))
      throw Error('Invalid staged share identity');
    const selected=prepareSharedFiles(files);
    if(!selected.files.length)throw Error('No shared files selected');
    const timestamp=clock();
    if(!Number.isFinite(timestamp))throw Error('Invalid share preparation time');
    pending={shareId,files:[...selected.files],expiresAt:timestamp+ttlMs};
    return {shareId,count:pending.files.length,
      names:pending.files.map(file=>file.name),totalBytes:selected.descriptors.reduce((sum,file)=>sum+file.size,0)};
  }
  // IMPORTANT: no await, Promise.then, IndexedDB call or permission prompt
  // before shareIncomingFiles invokes navigator.share synchronously.
  function send({env=globalThis}={}){
    const selected=pending;
    clear(); // one-shot even when cancelled, denied or unsupported
    if(!selected)throw Error('Prepare files before requesting the share sheet');
    if(clock()>selected.expiresAt)throw Error('Prepared files expired; prepare them again');
    return shareIncomingFiles(selected.files,{env});
  }
  return {prepare,send,clear};
}
