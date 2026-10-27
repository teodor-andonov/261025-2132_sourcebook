// Conservative, metadata-only recovery of resource records missing from a Catalog.
// Never overwrites existing records, deletes files, or changes ordinary sources.
// Every selected restoration uses the existing verified recovery journal.
import {createCatalogBackup,validateCatalogBackup} from './catalog-backup.mjs';
import {commitCatalogTransaction} from './catalog-transactions.mjs';

const RESOURCE=/^resources\/([a-z0-9_-]{1,100})\.json$/;
const MAX_BATCH=250;
const parse=(data,path)=>{
  try{return JSON.parse(data);}catch{throw Error('Malformed catalog JSON: '+path);}
};
const key=(record)=>record.sourceId+'\0'+record.path;
const validPath=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&
  !path.startsWith('/')&&!path.endsWith('/')&&!path.includes('\\')&&
  path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!/[\u0000-\u001f]/.test(part));
const uniqueIds=(value,label)=>{
  if(!Array.isArray(value))throw Error('Invalid '+label+' metadata');
  const ids=new Set();
  for(const item of value){
    if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error('Duplicate or invalid '+label+' ID');
    ids.add(item.id);
  }
  return ids;
};
function checkRecord(record,path,code,sourceIds,tagIds,strict){
  const id=RESOURCE.exec(path)?.[1];
  if(!record||typeof record!=='object'||Array.isArray(record)||record.id!==id||
    typeof record.sourceId!=='string'||!record.sourceId||!validPath(record.path))
    throw Error('Invalid resource identity or path: '+path);
  if(strict&& !['file','directory'].includes(record.kind))
    throw Error('Invalid resource kind: '+path);
  const ids=record.tagIds??[];
  if(!Array.isArray(ids)||ids.length>64||new Set(ids).size!==ids.length||
    ids.some(tag=>typeof tag!=='string'||!tagIds.has(tag)))
    throw Error('Resource references missing or invalid Tags: '+path);
  if(record.tags!==undefined&&(!Array.isArray(record.tags)||record.tags.some(tag=>typeof tag!=='string')))
    throw Error('Invalid legacy resource tags: '+path);
  if(!sourceIds.has(record.sourceId))throw Error('Resource references a missing Catalog Folder: '+path);
  const match=new RegExp('^'+code+'([1-9][0-9]*)$').exec(record.id);
  if(!match||!Number.isSafeInteger(Number(match[1])))
    throw Error('Resource ID does not belong to this Catalog: '+path);
  return Number(match[1]);
}
function snapshotSignature(files){
  return JSON.stringify(files.map(file=>[file.path,file.sha256]));
}
export async function planMissingResourceRestore(handle,backup,{selectedPaths}={}){
  const saved=await validateCatalogBackup(backup);
  if(!handle)throw Error('Open a Catalog first');
  const current=await createCatalogBackup(handle); // double-read, read-only snapshot
  if(current.catalogId!==saved.catalogId||current.catalogCode!==saved.catalogCode)
    throw Error('Backup belongs to a different Catalog');
  const disk=new Map(current.files.map(file=>[file.path,file]));
  const prior=new Map(saved.files.map(file=>[file.path,file]));
  if(prior.has('.sourcebook-pending.json')||disk.has('.sourcebook-pending.json'))
    throw Error('Resolve the pending Catalog journal before restoring records');
  const catalog=parse(disk.get('catalog.json').data,'catalog.json');
  const sources=disk.get('sources.json')?parse(disk.get('sources.json').data,'sources.json'):[];
  const tags=disk.get('tags.json')?parse(disk.get('tags.json').data,'tags.json'):[];
  const sourceIds=uniqueIds(sources,'Catalog Folder'),tagIds=uniqueIds(tags,'Tag');
  const occupied=new Set();
  let highest=0;
  for(const file of current.files){
    if(!RESOURCE.test(file.path))continue;
    const record=parse(file.data,file.path);
    const number=checkRecord(record,file.path,catalog.code,sourceIds,tagIds,false);
    const location=key(record);
    if(occupied.has(location))throw Error('Duplicate current resource location: '+record.path);
    occupied.add(location);highest=Math.max(highest,number);
  }
  const missing=[...prior.keys()].filter(path=>RESOURCE.test(path)&&!disk.has(path)).sort();
  if(selectedPaths!==undefined&&(!Array.isArray(selectedPaths)||new Set(selectedPaths).size!==selectedPaths.length||
    selectedPaths.some(path=>!missing.includes(path))))
    throw Error('Selected restoration records are no longer missing');
  // Reserve IDs of ALL missing backup records, including those deferred to a
  // later batch. Otherwise new objectification could steal a restorable ID.
  for(const path of missing){
    const token=RESOURCE.exec(path)?.[1];
    const match=new RegExp('^'+catalog.code+'([1-9][0-9]*)
  if(selected.length>MAX_BATCH)throw Error('Restore at most 250 missing records per batch');
  const restored=[],locations=new Set(occupied);
  for(const path of selected){
    const record=parse(prior.get(path).data,path);
    const number=checkRecord(record,path,catalog.code,sourceIds,tagIds,true);
    const location=key(record);
    if(locations.has(location))throw Error('Restoration would duplicate a resource location: '+record.path);
    locations.add(location);highest=Math.max(highest,number);
    restored.push({path,before:null,after:record});
  }
  const next=catalog.nextSequence;
  if(!Number.isSafeInteger(next)||next<1)throw Error('Invalid Catalog sequence');
  if(highest>=Number.MAX_SAFE_INTEGER)throw Error('Catalog identity sequence exhausted');
  const changes=[...restored];
  if(selected.length&&highest>=next)
    changes.unshift({path:'catalog.json',before:catalog,after:{...catalog,nextSequence:highest+1}});
  return {catalogId:catalog.id,signature:snapshotSignature(current.files),
    missingPaths:missing,selectedPaths:selected,changes,
    extraFiles:current.files.filter(file=>!prior.has(file.path)).length,
    changedFiles:current.files.filter(file=>prior.has(file.path)&&file.sha256!==prior.get(file.path).sha256).length,
    nonResourceMissing:[...prior.keys()].filter(path=>!RESOURCE.test(path)&&!disk.has(path)),
    remaining:missing.length-selected.length};
}
export async function restoreMissingResourceRecords(handle,backup,approvedPlan){
  if(!approvedPlan||!Array.isArray(approvedPlan.selectedPaths)||!approvedPlan.selectedPaths.length)
    throw Error('Select missing resource records to restore');
  // Rebuild from disk AFTER permission/confirmation. No stale preview may authorize a write.
  const fresh=await planMissingResourceRestore(handle,backup,{selectedPaths:approvedPlan.selectedPaths});
  if(fresh.catalogId!==approvedPlan.catalogId||fresh.signature!==approvedPlan.signature||
    JSON.stringify(fresh.changes)!==JSON.stringify(approvedPlan.changes))
    throw Error('Catalog changed since the restore preview; inspect the backup again');
  await commitCatalogTransaction({handle,catalogId:fresh.catalogId,changes:fresh.changes});
  return {restored:fresh.selectedPaths.length,sequenceUpdated:fresh.changes[0]?.path==='catalog.json'};
}
).exec(token);
    if(!match||!Number.isSafeInteger(Number(match[1])))
      throw Error('Backup contains an unsafe resource ID: '+path);
    highest=Math.max(highest,Number(match[1]));
  }
  const selected=(selectedPaths??missing.slice(0,MAX_BATCH)).slice();
  if(selected.length>MAX_BATCH)throw Error('Restore at most 250 missing records per batch');
  const restored=[],locations=new Set(occupied);
  for(const path of selected){
    const record=parse(prior.get(path).data,path);
    const number=checkRecord(record,path,catalog.code,sourceIds,tagIds,true);
    const location=key(record);
    if(locations.has(location))throw Error('Restoration would duplicate a resource location: '+record.path);
    locations.add(location);highest=Math.max(highest,number);
    restored.push({path,before:null,after:record});
  }
  const next=catalog.nextSequence;
  if(!Number.isSafeInteger(next)||next<1)throw Error('Invalid Catalog sequence');
  if(highest>=Number.MAX_SAFE_INTEGER)throw Error('Catalog identity sequence exhausted');
  const changes=[...restored];
  if(selected.length&&highest>=next)
    changes.unshift({path:'catalog.json',before:catalog,after:{...catalog,nextSequence:highest+1}});
  return {catalogId:catalog.id,signature:snapshotSignature(current.files),
    missingPaths:missing,selectedPaths:selected,changes,
    extraFiles:current.files.filter(file=>!prior.has(file.path)).length,
    changedFiles:current.files.filter(file=>prior.has(file.path)&&file.sha256!==prior.get(file.path).sha256).length,
    nonResourceMissing:[...prior.keys()].filter(path=>!RESOURCE.test(path)&&!disk.has(path)),
    remaining:missing.length-selected.length};
}
export async function restoreMissingResourceRecords(handle,backup,approvedPlan){
  if(!approvedPlan||!Array.isArray(approvedPlan.selectedPaths)||!approvedPlan.selectedPaths.length)
    throw Error('Select missing resource records to restore');
  // Rebuild from disk AFTER permission/confirmation. No stale preview may authorize a write.
  const fresh=await planMissingResourceRestore(handle,backup,{selectedPaths:approvedPlan.selectedPaths});
  if(fresh.catalogId!==approvedPlan.catalogId||fresh.signature!==approvedPlan.signature||
    JSON.stringify(fresh.changes)!==JSON.stringify(approvedPlan.changes))
    throw Error('Catalog changed since the restore preview; inspect the backup again');
  await commitCatalogTransaction({handle,catalogId:fresh.catalogId,changes:fresh.changes});
  return {restored:fresh.selectedPaths.length,sequenceUpdated:fresh.changes[0]?.path==='catalog.json'};
}
