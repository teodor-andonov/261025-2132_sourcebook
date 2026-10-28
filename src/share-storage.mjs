// M0 diagnostic only. Storage quota estimates are origin-wide and not a guarantee of persistence.
export const STORAGE_STATES=['not-run','ok','unsupported','error'];
const spaceBucket=bytes=>!Number.isFinite(bytes)||bytes<0?'unknown':bytes<50*1048576?'under-50-MiB':bytes<250*1048576?'50-250-MiB':'over-250-MiB';
export function normalizeShareStorageProbe(value){
  const v=value&&typeof value==='object'?value:{};
  return {
    status:STORAGE_STATES.includes(v.status)?v.status:'not-run',
    persisted:['unknown','yes','no'].includes(v.persisted)?v.persisted:'unknown',
    available:['unknown','under-50-MiB','50-250-MiB','over-250-MiB'].includes(v.available)?v.available:'unknown',
    pressure:['unknown','low','medium','high'].includes(v.pressure)?v.pressure:'unknown'
  };
}
export async function inspectShareStorage(env=globalThis){
  const storage=env.navigator?.storage;
  if(typeof storage?.estimate!=='function')return normalizeShareStorageProbe({status:'unsupported'});
  try{
    const estimate=await storage.estimate();
    const quota=estimate?.quota,usage=estimate?.usage;
    const valid=Number.isFinite(quota)&&quota>0&&Number.isFinite(usage)&&usage>=0&&usage<=quota;
    let persisted='unknown';
    if(typeof storage.persisted==='function'){
      try{persisted=await storage.persisted()?'yes':'no';}catch{}
    }
    return normalizeShareStorageProbe({
      status:valid?'ok':'error',persisted,
      available:valid?spaceBucket(quota-usage):'unknown',
      pressure:valid?(usage/quota>=0.9?'high':usage/quota>=0.7?'medium':'low'):'unknown'
    });
  }catch{return normalizeShareStorageProbe({status:'error'});}
}
// Must be invoked from an explicit button click, never on app startup or share receipt.
export async function requestShareStoragePersistence(env=globalThis){
  if(typeof env.navigator?.storage?.persist!=='function')
    return normalizeShareStorageProbe({status:'unsupported'});
  try{
    const granted=await env.navigator.storage.persist();
    const snapshot=await inspectShareStorage(env);
    return normalizeShareStorageProbe({...snapshot,persisted:granted?'yes':'no'});
  }catch{return normalizeShareStorageProbe({status:'error'});}
}
