// Portable, read-only metadata snapshots. Deliberately NO restore/write API.
// Backups contain catalog JSON and the pending recovery journal, not ordinary
// source files, preview caches or device-local directory permissions.
const FORMAT='sourcebook-catalog-backup';
const ROOT_FILES=['catalog.json','sources.json','tags.json','views.json','.sourcebook-pending.json'];
const RESOURCE=/^resources\/[a-z0-9_-]{1,100}\.json$/;
const MAX_FILES=10000;
const MAX_BYTES=25*1024*1024;
const encoder=new TextEncoder();
const bytes=s=>encoder.encode(s).byteLength;
const isMissing=e=>e?.name==='NotFoundError';
const validPath=path=>ROOT_FILES.includes(path)||RESOURCE.test(path);
const safeId=id=>typeof id==='string'&&id.length>0&&id.length<=128&&!/[\u0000-\u001f]/.test(id);
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
async function digest(data){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(data)));}
async function readText(handle,path){
  if(!validPath(path))throw Error('Unsafe catalog backup path');
  let dir=handle,name=path;
  if(path.startsWith('resources/')){
    name=path.slice(10);
    try{dir=await handle.getDirectoryHandle('resources');}
    catch(error){if(isMissing(error))return null;throw error;}
  }
  try{return await (await dir.getFileHandle(name)).getFile().then(file=>file.text());}
  catch(error){if(isMissing(error))return null;throw error;}
}
async function resourcePaths(handle){
  let dir;
  try{dir=await handle.getDirectoryHandle('resources');}
  catch(error){if(isMissing(error))return [];throw error;}
  const names=[];
  for await(const [name,entry] of dir.entries()){
    if(entry.kind!=='file'||!name.endsWith('.json'))continue;
    const path='resources/'+name;
    if(!RESOURCE.test(path))throw Error('Unexpected catalog resource JSON filename: '+name);
    names.push(path);
    if(names.length>MAX_FILES-ROOT_FILES.length)throw Error('Catalog has too many resource records for a backup');
  }
  return names.sort();
}
async function snapshot(handle){
  const paths=[...ROOT_FILES,...await resourcePaths(handle)];
  const files=[];let total=0;
  for(const path of paths){
    const data=await readText(handle,path);
    if(data===null){if(path==='catalog.json'||path.startsWith('resources/'))throw Error('Catalog changed during backup: '+path);continue;}
    total+=bytes(data);
    if(total>MAX_BYTES)throw Error('Catalog metadata exceeds 25 MiB backup limit');
    files.push({path,data,sha256:await digest(data)});
  }
  // A second pass catches most concurrent edits, deletions and new resource
  // records. Browser filesystem APIs cannot provide an atomic directory snapshot.
  const again=await resourcePaths(handle);
  if(JSON.stringify(again)!==JSON.stringify(paths.filter(path=>path.startsWith('resources/'))))
    throw Error('Catalog resource list changed during backup; retry');
  for(const file of files){
    if(await readText(handle,file.path)!==file.data)
      throw Error('Catalog changed during backup: '+file.path);
  }
  for(const path of ROOT_FILES){
    if(!files.some(file=>file.path===path)&&await readText(handle,path)!==null)
      throw Error('Catalog changed during backup: '+path);
  }
  return files;
}
function catalogFromFiles(files){
  const file=files.find(x=>x.path==='catalog.json');
  if(!file)throw Error('Backup lacks catalog.json');
  let catalog;
  try{catalog=JSON.parse(file.data);}
  catch{throw Error('Invalid catalog.json in backup');}
  if(!catalog||!safeId(catalog.id)||!/^[a-z]{1,4}$/.test(catalog.code))
    throw Error('Invalid catalog identity in backup');
  return catalog;
}
export async function createCatalogBackup(handle){
  if(!handle)throw Error('Choose a catalog first');
  const files=await snapshot(handle);
  const catalog=catalogFromFiles(files);
  return {format:FORMAT,formatVersion:1,createdAt:new Date().toISOString(),
    catalogId:catalog.id,catalogCode:catalog.code,
    scope:'catalog-metadata-only',files};
}
export async function validateCatalogBackup(value){
  if(!value||value.format!==FORMAT||value.formatVersion!==1||
    value.scope!=='catalog-metadata-only'||!safeId(value.catalogId)||
    !/^[a-z]{1,4}$/.test(value.catalogCode)||
    !Number.isFinite(Date.parse(value.createdAt))||
    !Array.isArray(value.files)||!value.files.length||value.files.length>MAX_FILES)
    throw Error('Unsupported or malformed Sourcebook backup');
  let total=0;const seen=new Set();
  for(const file of value.files){
    if(!file||!validPath(file.path)||seen.has(file.path)||typeof file.data!=='string'||
      typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256))
      throw Error('Invalid or duplicate backup entry');
    seen.add(file.path);total+=bytes(file.data);
    if(total>MAX_BYTES)throw Error('Backup metadata exceeds 25 MiB limit');
    if(await digest(file.data)!==file.sha256)throw Error('Backup checksum mismatch: '+file.path);
  }
  const catalog=catalogFromFiles(value.files);
  if(catalog.id!==value.catalogId||catalog.code!==value.catalogCode)
    throw Error('Backup catalog identity mismatch');
  return value;
}
export async function inspectCatalogBackup(handle,value){
  const backup=await validateCatalogBackup(value);
  const current=await readText(handle,'catalog.json');
  if(current===null)throw Error('Current catalog.json is missing');
  let catalog;
  try{catalog=JSON.parse(current);}
  catch{throw Error('Current catalog.json is malformed');}
  if(catalog?.id!==backup.catalogId||catalog?.code!==backup.catalogCode)
    throw Error('Backup belongs to a different catalog; no files were changed');
  const currentFiles=await snapshot(handle);
  const live=new Map(currentFiles.map(file=>[file.path,file]));
  const saved=new Map(backup.files.map(file=>[file.path,file]));
  const entries=[];
  for(const path of [...new Set([...saved.keys(),...live.keys()])].sort()){
    const a=saved.get(path),b=live.get(path);
    entries.push({path,status:!a?'added-since-backup':!b?'missing-now':a.sha256===b.sha256?'unchanged':'changed'});
  }
  return {catalogId:catalog.id,entries,
    counts:Object.fromEntries(['unchanged','changed','missing-now','added-since-backup']
      .map(status=>[status,entries.filter(entry=>entry.status===status).length])),
    hasPendingJournal:saved.has('.sourcebook-pending.json'),
    currentPendingJournal:live.has('.sourcebook-pending.json')};
}
