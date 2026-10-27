// Device-local, read-only source index. Catalog JSON and ordinary files are never
// modified by this module. Cached results are snapshots, NOT filesystem truth.
// A persisted root is usable only after isSameEntry proves its handle binding.
export const SOURCE_INDEX_VERSION=1;
export const SOURCE_INDEX_LIMIT=50000;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=128&&!/[\u0000-\u001f]/.test(id);
const validPart=part=>typeof part==='string'&&part.length>0&&part!=='.'&&part!=='..'&&!/[\/\\\u0000-\u001f]/.test(part);
const validPath=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&path.split('/').every(validPart);
const entryKey=entry=>entry.path;
const kinds=new Set(['file','directory']);

export function sourceIndexKey(catalogId){
  if(!validId(catalogId))throw Error('Invalid Catalog identity for device index');
  return 'source-index-v1:'+catalogId;
}
export function emptySourceIndex(catalogId){
  sourceIndexKey(catalogId);
  return {version:SOURCE_INDEX_VERSION,catalogId,roots:[]};
}
export function validateSourceIndex(value,catalogId,sourceIds){
  if(!validId(catalogId)||!(sourceIds instanceof Set)||[...sourceIds].some(id=>!validId(id)))throw Error('Invalid source index scope');
  if(!value||value.version!==SOURCE_INDEX_VERSION||value.catalogId!==catalogId||!Array.isArray(value.roots)||value.roots.length>sourceIds.size)throw Error('Invalid or foreign source index cache');
  const seenRoots=new Set(),roots=[];
  let total=0;
  for(const root of value.roots){
    if(!root||!sourceIds.has(root.sourceId)||seenRoots.has(root.sourceId)||
       root.handle?.kind!=='directory'||typeof root.handle.isSameEntry!=='function'||
       !Number.isSafeInteger(root.scannedAt)||root.scannedAt<0||!Array.isArray(root.entries))
      throw Error('Invalid or unverified indexed Folder');
    seenRoots.add(root.sourceId);
    const seenPaths=new Set(),entries=[];
    for(const entry of root.entries){
      if(!entry||entry.sourceId!==root.sourceId||!validPath(entry.path)||!kinds.has(entry.kind)||seenPaths.has(entryKey(entry)))
        throw Error('Invalid or duplicate indexed path');
      seenPaths.add(entryKey(entry));
      entries.push({sourceId:root.sourceId,path:entry.path,kind:entry.kind});
      if(++total>SOURCE_INDEX_LIMIT)throw Error('Device index exceeds entry limit');
    }
    roots.push({sourceId:root.sourceId,handle:root.handle,scannedAt:root.scannedAt,entries});
  }
  return {version:SOURCE_INDEX_VERSION,catalogId,roots};
}
// Cached handles are device-specific. Name equality, source IDs and granted
// permissions do NOT establish that a directory is the same physical root.
export async function restoreSourceIndex(saved,catalogId,sources,handles){
  const sourceIds=new Set(sources.map(s=>s?.id));
  if(!(handles instanceof Map))throw Error('Invalid device source handles');
  const validated=saved===null||saved===undefined?emptySourceIndex(catalogId):validateSourceIndex(saved,catalogId,sourceIds);
  const roots=[],skippedRootIds=[];
  for(const root of validated.roots){
    const current=handles.get(root.sourceId);
    let same=false;
    if(current?.kind==='directory'&&typeof current.isSameEntry==='function'){
      try{same=await current.isSameEntry(root.handle)===true;}catch{}
    }
    if(same)roots.push(root);
    else skippedRootIds.push(root.sourceId);
  }
  return {index:{version:SOURCE_INDEX_VERSION,catalogId,roots},skippedRootIds};
}
function assertEntries(entries,targetIds){
  if(!Array.isArray(entries)||entries.length>SOURCE_INDEX_LIMIT)throw Error('Invalid source scan entries');
  const seen=new Set(),out=[];
  for(const entry of entries){
    if(!entry||!targetIds.has(entry.sourceId)||!validPath(entry.path)||!kinds.has(entry.kind))
      throw Error('Invalid source scan entry');
    const k=entry.sourceId+'\u0000'+entry.path;
    if(seen.has(k))throw Error('Duplicate source scan entry');
    seen.add(k);
    out.push({sourceId:entry.sourceId,path:entry.path,kind:entry.kind});
  }
  return out;
}
function diffEntries(previous,next){
  if(!previous)return {initial:true,added:0,removed:0,typeChanged:0};
  const old=new Map(previous.map(e=>[e.path,e.kind])),now=new Map(next.map(e=>[e.path,e.kind]));
  let added=0,removed=0,typeChanged=0;
  for(const [path,kind] of now){if(!old.has(path))added++;else if(old.get(path)!==kind)typeChanged++;}
  for(const path of old.keys())if(!now.has(path))removed++;
  return {initial:false,added,removed,typeChanged};
}
// Incremental at the *registered Folder* level: a selected Folder is traversed
// fully; other complete cached roots are retained. Partial/cancelled scans never
// replace a known-good root snapshot or manufacture "missing" results.
export function refreshSourceIndex(index,scan,targetIds,handles,now=Date.now()){
  if(!index||index.version!==SOURCE_INDEX_VERSION||!validId(index.catalogId)||!Array.isArray(index.roots)||
     !Array.isArray(targetIds)||!targetIds.length||!(handles instanceof Map)||
     !Number.isSafeInteger(now)||now<0)throw Error('Invalid source index refresh');
  const targets=new Set(targetIds);
  if(targets.size!==targetIds.length||[...targets].some(id=>!validId(id)))throw Error('Invalid refresh targets');
  const complete=new Set(scan?.completeRootIds);
  if(!Array.isArray(scan?.completeRootIds)||[...complete].some(id=>!targets.has(id))||complete.size!==scan.completeRootIds.length||scan.cancelled)throw Error('Incomplete or cancelled source index refresh');
  const entries=assertEntries(scan.entries,targets);
  const existing=new Map(index.roots.map(root=>[root.sourceId,root]));
  const changes=[],partialRootIds=[],partialEntries=[];
  for(const id of targets){
    if(!complete.has(id)){
      partialRootIds.push(id);
      if(!existing.has(id))partialEntries.push(...entries.filter(e=>e.sourceId===id));
      continue;
    }
    const handle=handles.get(id);
    if(handle?.kind!=='directory'||typeof handle.isSameEntry!=='function')throw Error('Cannot verify indexed Folder identity');
    const current=entries.filter(e=>e.sourceId===id),previous=existing.get(id);
    changes.push({sourceId:id,...diffEntries(previous?.entries,current)});
    existing.set(id,{sourceId:id,handle,scannedAt:now,entries:current});
  }
  const roots=[...existing.values()].sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
  const total=roots.reduce((n,r)=>n+r.entries.length,0);
  if(total>SOURCE_INDEX_LIMIT)throw Error('Device index entry limit reached; clear or refresh a smaller set of Folders');
  return {index:{version:SOURCE_INDEX_VERSION,catalogId:index.catalogId,roots},
    changes,completeRootIds:[...complete],partialRootIds,partialEntries,problems:Array.isArray(scan.problems)?[...scan.problems]:[]};
}
export function sourceIndexOverlay(index,{freshRootIds=[],partialRootIds=[],partialEntries=[],problems=[]}={}){
  if(!index||!Array.isArray(index.roots))throw Error('Invalid source index');
  const known=new Set(index.roots.map(root=>root.sourceId));
  const fresh=[...new Set(freshRootIds)].filter(id=>known.has(id)&&!partialRootIds.includes(id));
  const stale=[...known].filter(id=>!fresh.includes(id));
  const partial=[...new Set(partialRootIds)];
  const extra=assertEntries(partialEntries,new Set(partial.filter(id=>!known.has(id))));
  return {entries:[...index.roots.flatMap(root=>root.entries),...extra],
    completeRootIds:fresh,staleRootIds:[...new Set([...stale,...partial])],
    cachedRootIds:[...known],partialRootIds:partial,problems:[...problems],cancelled:false};
}
