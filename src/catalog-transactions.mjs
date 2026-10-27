// Recoverable catalog-only JSON transactions. The journal lives inside the .sb
// directory; ordinary registered source folders are never opened for writing.
// This is NOT a cross-device lock or a filesystem-wide atomic commit.
import {readJson,writeJson} from './storage.mjs';
import {assertNoCatalogConflictCopies} from './catalog-conflicts.mjs';

export const CATALOG_JOURNAL='.sourcebook-pending.json';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safePath=path=>['catalog.json','tags.json','sources.json','views.json'].includes(path)||
  /^resources\/[a-z0-9_-]{1,100}\.json$/.test(path);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=128&&!/[\u0000-\u001f]/.test(value);
const inFlight=new WeakSet();

export function validateCatalogChanges(changes){
  if(!Array.isArray(changes)||!changes.length||changes.length>300)throw Error('Invalid catalog transaction size');
  const seen=new Set();
  return changes.map(change=>{
    if(!change||!safePath(change.path)||seen.has(change.path)||
       !Object.hasOwn(change,'before')||!Object.hasOwn(change,'after')||
       change.after===null||change.after===undefined)throw Error('Invalid catalog transaction path or snapshot');
    seen.add(change.path);
    const array=['tags.json','sources.json','views.json'].includes(change.path);
    const valid=value=>value===null||((array?Array.isArray(value):value&&typeof value==='object'&&!Array.isArray(value)));
    if(!valid(change.before)||!valid(change.after)||change.after===null||
       same(change.before,change.after))throw Error('Invalid catalog transaction value');
    // Round-trip before accepting: no undefined, functions or non-JSON values.
    let before,after;
    try{
      before=change.before===null?null:JSON.parse(JSON.stringify(change.before));
      after=JSON.parse(JSON.stringify(change.after));
    }catch{throw Error('Catalog transaction contains non-JSON data');}
    if(!same(before,change.before)||!same(after,change.after))throw Error('Catalog transaction contains non-JSON data');
    return {path:change.path,before,after};
  });
}
function validateJournal(value,expectedCatalogId){
  if(!value||value.formatVersion!==1||!validId(value.id)||!validId(value.catalogId)||
     (expectedCatalogId&&value.catalogId!==expectedCatalogId)||
     typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt)))throw Error('Invalid or foreign pending catalog transaction');
  const changes=validateCatalogChanges(value.changes);
  const identityChange=changes.find(change=>change.path==='catalog.json');
  if(identityChange&&(identityChange.before?.id!==value.catalogId||identityChange.after?.id!==value.catalogId))
    throw Error('Pending transaction would change catalog identity');
  return {...value,changes};
}
async function readPath(handle,path){
  let folder=handle,name=path;
  if(path.startsWith('resources/')){
    name=path.slice('resources/'.length);
    try{folder=await handle.getDirectoryHandle('resources');}
    catch(error){if(error.name==='NotFoundError')return null;throw error;}
  }
  return readJson(folder,name,null);
}
async function writePath(handle,path,value){
  let folder=handle,name=path;
  if(path.startsWith('resources/')){
    name=path.slice('resources/'.length);
    folder=await handle.getDirectoryHandle('resources',{create:true});
  }
  await writeJson(folder,name,value);
  if(!same(await readPath(handle,path),value))throw Error('Catalog write verification failed: '+path);
}
async function assertIdentity(handle,catalogId){
  const catalog=await readJson(handle,'catalog.json');
  if(!catalog||catalog.id!==catalogId)throw Error('Catalog identity changed; reopen the catalog');
}
async function readJournal(handle,catalogId){
  const raw=await readJson(handle,CATALOG_JOURNAL,null);
  return raw===null?null:validateJournal(raw,catalogId);
}
async function statuses(handle,journal){
  const status=[];
  for(const change of journal.changes){
    const disk=await readPath(handle,change.path);
    status.push(same(disk,change.after)?'applied':same(disk,change.before)?'pending':'conflict');
  }
  return status;
}
export async function inspectPendingCatalogTransaction(handle,catalogId){
  const journal=await readJournal(handle,catalogId);
  if(!journal)return null;
  const status=await statuses(handle,journal);
  return {id:journal.id,createdAt:journal.createdAt,total:status.length,
    applied:status.filter(x=>x==='applied').length,
    pending:status.filter(x=>x==='pending').length,
    conflicts:journal.changes.filter((_,i)=>status[i]==='conflict').map(x=>x.path)};
}
async function applyJournal(handle,catalogId,journal){
  await assertNoCatalogConflictCopies(handle);
  await assertIdentity(handle,catalogId);
  const initial=await statuses(handle,journal);
  if(initial.includes('conflict'))throw Error('Catalog transaction conflicts with external edits: '+
    journal.changes.filter((_,i)=>initial[i]==='conflict').map(x=>x.path).join(', '));
  for(let i=0;i<journal.changes.length;i++){
    const change=journal.changes[i];
    const current=await readJournal(handle,catalogId);
    if(!current||!same(current,journal))throw Error('Pending transaction changed during save');
    // Previously applied critical metadata cannot change during a long batch.
    for(let j=0;j<i;j++){
      const earlier=journal.changes[j];
      if(!['tags.json','catalog.json','sources.json','views.json'].includes(earlier.path))continue;
      if(!same(await readPath(handle,earlier.path),earlier.after))
        throw Error('Catalog changed during transaction: '+earlier.path);
    }
    const disk=await readPath(handle,change.path);
    if(same(disk,change.after))continue; // Idempotent replay after interruption.
    if(!same(disk,change.before))throw Error('Catalog changed during transaction: '+change.path);
    await writePath(handle,change.path,change.after);
  }
  const current=await readJournal(handle,catalogId);
  if(!current||!same(current,journal))throw Error('Pending transaction changed before completion');
  if((await statuses(handle,journal)).some(x=>x!=='applied'))throw Error('Catalog transaction is incomplete');
  await assertNoCatalogConflictCopies(handle); // Keep journal if a sync copy appeared during the write.
  if(typeof handle.removeEntry!=='function')throw Error('Catalog cannot clear its recovery journal');
  await handle.removeEntry(CATALOG_JOURNAL);
  if(await readJson(handle,CATALOG_JOURNAL,null)!==null)throw Error('Catalog recovery journal could not be cleared');
  return journal.changes.length;
}
export async function commitCatalogTransaction({handle,catalogId,changes,transactionId=crypto.randomUUID()}){
  if(!handle||!validId(catalogId)||!validId(transactionId))throw Error('Invalid catalog transaction identity');
  const checked=validateCatalogChanges(changes);
  const identityChange=checked.find(change=>change.path==='catalog.json');
  if(identityChange&&(identityChange.before?.id!==catalogId||identityChange.after?.id!==catalogId))
    throw Error('Catalog transaction cannot change catalog identity');
  if(inFlight.has(handle))throw Error('Another catalog write is already in progress');
  inFlight.add(handle);
  try{
    await assertNoCatalogConflictCopies(handle);
    await assertIdentity(handle,catalogId);
    if(await readJournal(handle,catalogId))throw Error('An interrupted catalog save needs recovery first');
    for(const change of checked){
      if(!same(await readPath(handle,change.path),change.before))
        throw Error('Catalog metadata changed on disk: '+change.path);
    }
    const journal={formatVersion:1,id:transactionId,catalogId,
      createdAt:new Date().toISOString(),changes:checked};
    await writeJson(handle,CATALOG_JOURNAL,journal);
    if(!same(await readJournal(handle,catalogId),journal))throw Error('Could not verify catalog recovery journal');
    return await applyJournal(handle,catalogId,journal);
  }finally{inFlight.delete(handle);}
}
export async function resumeCatalogTransaction(handle,catalogId){
  if(!handle||!validId(catalogId))throw Error('Invalid catalog recovery identity');
  if(inFlight.has(handle))throw Error('Another catalog write is already in progress');
  inFlight.add(handle);
  try{
    await assertNoCatalogConflictCopies(handle);
    const journal=await readJournal(handle,catalogId);
    if(!journal)throw Error('No pending catalog save to recover');
    return await applyJournal(handle,catalogId,journal);
  }finally{inFlight.delete(handle);}
}
