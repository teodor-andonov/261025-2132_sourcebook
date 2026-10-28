// Serialize Catalog JSON transactions across cooperating Sourcebook tabs on
// the same browser origin. This is not a filesystem lock: other browsers,
// Syncthing, native apps and devices can still edit the portable .sb directory.
// A single origin-wide name is intentional: independent handles to the same
// Catalog may not have a reliable shared path or identity across tabs.
export const CATALOG_WRITE_LOCK='sourcebook-catalog-write-v1';

export async function withCatalogWriteLock(work,{locks=globalThis.navigator?.locks}={}){
  if(typeof work!=='function')throw Error('Catalog write operation is required');
  if(typeof locks?.request!=='function')return work(); // Previous snapshot/journal checks still apply.
  // If Web Locks exists but refuses a request, fail closed; do not bypass it.
  return locks.request(CATALOG_WRITE_LOCK,{mode:'exclusive'},async lock=>{
    if(!lock)throw Error('Catalog write lock was not granted');
    return work();
  });
}
