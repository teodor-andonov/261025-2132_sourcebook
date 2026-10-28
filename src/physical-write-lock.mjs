// Cooperative same-origin serialization for Sourcebook ordinary-file creation.
// Web Locks coordinate Sourcebook tabs/windows, NOT other apps, Syncthing or devices.
// Browsers without Web Locks retain preflight checks but cannot claim this protection.
export const PHYSICAL_WRITE_LOCK='sourcebook-physical-write-v1';
export async function withPhysicalWriteLock(work,{signal,locks=globalThis.navigator?.locks}={}){
  if(typeof work!=='function')throw Error('Physical write operation is required');
  if(signal?.aborted)throw Error('File operation cancelled before acquiring the write lock');
  if(typeof locks?.request!=='function')return work();
  return locks.request(PHYSICAL_WRITE_LOCK,{mode:'exclusive',...(signal?{signal}:{})},async lock=>{
    if(!lock)throw Error('Physical write lock was not granted');
    if(signal?.aborted)throw Error('File operation cancelled before writing');
    return work();
  });
}
