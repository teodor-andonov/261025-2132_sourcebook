// Explicit, disposable M0 filesystem probes. Never use an existing source/Catalog Folder.
export const M0_HANDLE_KEY='sourcebook-m0-disposable-read-handle-v1';
const blankWrite=()=>({status:'not-run',permission:'unknown',writeVerified:false,cleanupVerified:false,cleanupRequired:false});
const blankReopen=()=>({status:'not-run',permission:'unknown',enumerated:false});
const failureStatus=error=>error?.name==='AbortError'?'cancelled':error?.name==='NotAllowedError'?'denied':'error';
const permission=async(handle,mode)=>{
  if(typeof handle?.queryPermission!=='function')return 'unavailable';
  try{const value=await handle.queryPermission({mode});return ['granted','prompt','denied'].includes(value)?value:'unknown';}
  catch{return 'unknown';}
};
export function normalizeWriteProbe(value){
  const p=value&&typeof value==='object'?value:{};
  return {
    status:['not-run','ok','unsupported','cancelled','denied','error','collision','not-confirmed'].includes(p.status)?p.status:'not-run',
    permission:['unknown','unavailable','granted','prompt','denied'].includes(p.permission)?p.permission:'unknown',
    writeVerified:p.writeVerified===true,
    cleanupVerified:p.cleanupVerified===true,
    cleanupRequired:p.cleanupRequired===true
  };
}
export function normalizeReopenProbe(value){
  const p=value&&typeof value==='object'?value:{};
  return {
    status:['not-run','saved','ok','not-saved','needs-regrant','unsupported','cancelled','denied','error'].includes(p.status)?p.status:'not-run',
    permission:['unknown','unavailable','granted','prompt','denied'].includes(p.permission)?p.permission:'unknown',
    enumerated:p.enumerated===true
  };
}
// Requires a fresh user confirmation BEFORE opening the picker. Never requests permissions implicitly.
// The only file created is an unpredictable .sourcebook-m0-probe-UUID.txt in a user-selected disposable Folder.
// A failed/modified write is NOT blindly removed; the user is warned to inspect the synthetic leftover.
export async function probeDisposableWriteFolder(picker,{confirmed=false,randomUUID=globalThis.crypto?.randomUUID?.bind(globalThis.crypto)}={}){
  if(!confirmed)return {...blankWrite(),status:'not-confirmed'};
  if(typeof picker!=='function'||typeof randomUUID!=='function')return {...blankWrite(),status:'unsupported'};
  let dir;
  try{dir=await picker({mode:'readwrite'});}
  catch(error){return {...blankWrite(),status:failureStatus(error)};}
  if(!dir||typeof dir.getFileHandle!=='function'||typeof dir.removeEntry!=='function')return {...blankWrite(),status:'unsupported'};
  const grant=await permission(dir,'readwrite');
  if(grant!=='granted')return {...blankWrite(),status:grant==='denied'?'denied':'unsupported',permission:grant};
  const id=randomUUID();
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))return {...blankWrite(),status:'error',permission:grant};
  const fileName='.sourcebook-m0-probe-'+id+'.txt';
  const marker='Sourcebook disposable M0 probe '+id+'\n';
  try{
    await dir.getFileHandle(fileName);
    return {...blankWrite(),status:'collision',permission:grant};
  }catch(error){
    if(error?.name!=='NotFoundError')return {...blankWrite(),status:'error',permission:grant};
  }
  let created=false,verified=false,removed=false,handle=null,status='error';
  try{
    handle=await dir.getFileHandle(fileName,{create:true});
    created=true;
    const writer=await handle.createWritable();
    try{await writer.write(marker);await writer.close();}
    catch(error){try{await writer.abort?.();}catch{}throw error;}
    verified=(await (await handle.getFile()).text())===marker;
    if(!verified)throw Error('Probe readback mismatch');
    status='ok';
  }catch(error){status=failureStatus(error);}
  if(created){
    // No deletion unless the exact synthetic marker and original handle identity are still verified.
    try{
      const current=await dir.getFileHandle(fileName);
      if(typeof current.isSameEntry!=='function'||await current.isSameEntry(handle)!==true)throw Error('Identity unavailable');
      if(await (await current.getFile()).text()!==marker)throw Error('Probe content changed');
      await dir.removeEntry(fileName);
      // Confirm the synthetic file is actually absent.
      try{await dir.getFileHandle(fileName);}
      catch(error){if(error?.name==='NotFoundError')removed=true;else throw error;}
    }catch{}
  }
  return {
    status:status==='ok'&&!removed?'error':status,permission:grant,writeVerified:verified,
    cleanupVerified:removed,cleanupRequired:created&&!removed,
    // Synthetic name is only for immediate manual cleanup, never persisted/exported.
    ...(created&&!removed?{leftoverName:fileName}:{})
  };
}
// Save a user-selected disposable read handle in device-local IndexedDB, never portable Catalog JSON.
export async function rememberDisposableReadFolder(picker,setLocal){
  if(typeof picker!=='function'||typeof setLocal!=='function')return {...blankReopen(),status:'unsupported'};
  let handle;
  try{handle=await picker({mode:'read'});}
  catch(error){return {...blankReopen(),status:failureStatus(error)};}
  if(!handle||handle.kind!=='directory'||typeof handle.queryPermission!=='function')return {...blankReopen(),status:'unsupported'};
  const grant=await permission(handle,'read');
  if(grant!=='granted')return {...blankReopen(),status:grant==='denied'?'denied':'needs-regrant',permission:grant};
  try{await setLocal(M0_HANDLE_KEY,handle);}
  catch{return {...blankReopen(),status:'error',permission:grant};}
  return {...blankReopen(),status:'saved',permission:grant};
}
// On later launch this NEVER invokes a picker or requestPermission. An actual regrant is a separate user action.
export async function recheckDisposableReadFolder(getLocal){
  if(typeof getLocal!=='function')return {...blankReopen(),status:'unsupported'};
  let handle;
  try{handle=await getLocal(M0_HANDLE_KEY);}
  catch{return {...blankReopen(),status:'error'};}
  if(!handle)return {...blankReopen(),status:'not-saved'};
  const grant=await permission(handle,'read');
  if(grant!=='granted')return {...blankReopen(),status:grant==='unavailable'?'unsupported':'needs-regrant',permission:grant};
  if(typeof handle.values!=='function')return {...blankReopen(),status:'unsupported',permission:grant};
  try{
    let enumerated=false;
    for await(const _entry of handle.values()){enumerated=true;break;}
    return {status:'ok',permission:grant,enumerated};
  }catch(error){return {...blankReopen(),status:failureStatus(error),permission:grant,enumerated:false};}
}
export async function forgetDisposableReadFolder(removeLocal){
  if(typeof removeLocal!=='function')throw Error('Device storage unavailable');
  await removeLocal(M0_HANDLE_KEY);
}
