// Read-only physical overlap proof for registered Catalog Folders.
// Matching names, paths or Catalog IDs are never proof of a shared resource.
// Only FileSystemHandle.isSameEntry, including a live ancestor traversal,
// can establish a relationship. Inconclusive pairs remain independent.
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=128&&!/[\u0000-\u001f]/.test(id);
const validPart=s=>typeof s==='string'&&!!s&&s!=='.'&&s!=='..'&&!/[\\/\u0000-\u001f]/.test(s);
const validPath=s=>typeof s==='string'&&s.length>0&&s.length<=4096&&s.split('/').every(validPart);
const depth=path=>path?path.split('/').length:0;
async function same(a,b){
  try{if(typeof a?.isSameEntry==='function'&&await a.isSameEntry(b)===true)return true;}catch{}
  try{if(typeof b?.isSameEntry==='function'&&await b.isSameEntry(a)===true)return true;}catch{}
  return false;
}
async function granted(handle){
  try{return handle?.kind==='directory'&&typeof handle.queryPermission==='function'&&
    await handle.queryPermission({mode:'read'})==='granted';}catch{return false;}
}
async function atPath(root,path){
  let h=root;
  for(const part of path.split('/'))h=await h.getDirectoryHandle(part);
  return h;
}
// A bounded number of live identity comparisons, with no directory enumeration
// or permission prompts. The index only nominates possible paths; it is never
// itself accepted as proof of physical overlap.
export async function inspectIndexedRootOverlaps(index,handles,{maxCandidates=128,maxComparisons=2048}={}){
  if(!index||!Array.isArray(index.roots)||!(handles instanceof Map)||
    !Number.isSafeInteger(maxCandidates)||maxCandidates<1||
    !Number.isSafeInteger(maxComparisons)||maxComparisons<1)
    throw Error('Invalid Folder overlap inspection');
  const roots=[],problems=[];
  for(const cached of index.roots){
    const handle=handles.get(cached.sourceId);
    if(!validId(cached.sourceId)||!Array.isArray(cached.entries)||!await granted(handle)||
      !await same(handle,cached.handle)){
      problems.push('Indexed Folder '+String(cached.sourceId)+' cannot be identity-verified for overlap checks');
      continue;
    }
    // Build bounded candidate buckets once, rather than rescanning up to
    // 50,000 indexed entries for every possible ancestor/descendant pair.
    const byName=new Map();
    for(const entry of cached.entries){
      if(entry?.kind!=='directory'||!validPath(entry.path))continue;
      const name=entry.path.split('/').at(-1);
      if(!byName.has(name))byName.set(name,[]);
      const paths=byName.get(name);
      if(paths.length<=maxCandidates)paths.push(entry.path);
    }
    roots.push({id:cached.sourceId,handle,byName});
  }
  const overlaps=[],seen=new Set();
  let comparisons=0;
  for(let i=0;i<roots.length;i++)for(let j=i+1;j<roots.length;j++){
    const a=roots[i],b=roots[j];
    if(++comparisons>maxComparisons){problems.push('Overlap identity comparison limit reached');return {overlaps,problems};}
    if(await same(a.handle,b.handle)){
      const [ancestor,descendant]=[a.id,b.id].sort();
      overlaps.push({ancestorId:ancestor,descendantId:descendant,prefix:''});
      continue;
    }
    for(const [ancestor,descendant] of [[a,b],[b,a]]){
      const matches=ancestor.byName.get(descendant.handle.name)||[];
      if(matches.length>maxCandidates){
        problems.push('Too many candidate paths to verify '+ancestor.id+' / '+descendant.id);
        continue;
      }
      const verified=[];
      for(const path of matches){
        if(++comparisons>maxComparisons){
          problems.push('Overlap identity comparison limit reached');
          return {overlaps,problems};
        }
        try{if(await same(await atPath(ancestor.handle,path),descendant.handle))verified.push(path);}catch{}
      }
      if(verified.length>1){
        problems.push('Ambiguous physical paths between '+ancestor.id+' and '+descendant.id);
        continue;
      }
      if(verified.length===1){
        const key=ancestor.id+'\u0000'+descendant.id;
        if(!seen.has(key)){
          seen.add(key);
          overlaps.push({ancestorId:ancestor.id,descendantId:descendant.id,prefix:verified[0]});
        }
      }
    }
  }
  // Directory junctions can create cyclic ancestry. Do not use either direction
  // of such a relationship for deduplication.
  const relations=overlaps.filter(o=>!overlaps.some(reverse=>
    reverse.ancestorId===o.descendantId&&reverse.descendantId===o.ancestorId));
  if(relations.length!==overlaps.length)problems.push('Cyclic Folder relationship; overlapping results kept separate');
  return {overlaps:relations,problems};
}

// A verified relation describes a descendant root's relative location inside
// its ancestor. Resolve to the shallowest proven root without changing the
// original sourceId/path, Catalog records, or their metadata assignments.
function overlapParents(overlaps){
  const parents=new Map();
  for(const o of overlaps){
    if(!o||!validId(o.ancestorId)||!validId(o.descendantId)||
      o.ancestorId===o.descendantId||!(o.prefix===''||validPath(o.prefix)))continue;
    const candidate={id:o.ancestorId,prefix:o.prefix};
    const previous=parents.get(o.descendantId);
    if(!previous||depth(candidate.prefix)<depth(previous.prefix)||
      (depth(candidate.prefix)===depth(previous.prefix)&&candidate.id.localeCompare(previous.id)<0))
      parents.set(o.descendantId,candidate);
  }
  return parents;
}
function physicalKeyWithParents(item,parents){
  if(item?.kind==='url')return {key:'catalog-url:'+String(item?.record?.id||item?.id),depth:0};
  const original=String(item?.sourceId||'')+'\u0000'+String(item?.path||'');
  if(!validId(item?.sourceId)||!validPath(item?.path))return {key:original,depth:0};
  let id=item.sourceId,path=item.path,steps=0;
  const visited=new Set();
  while(parents.has(id)){
    if(visited.has(id))return {key:original,depth:0};
    visited.add(id);
    const parent=parents.get(id);
    if(visited.has(parent.id))return {key:original,depth:0};
    path=parent.prefix?parent.prefix+'/'+path:path;
    id=parent.id;steps++;
    if(path.length>4096)return {key:original,depth:0};
  }
  return {key:id+'\u0000'+path,depth:steps};
}
export function physicalResultKey(item,overlaps=[]){
  return physicalKeyWithParents(item,overlapParents(Array.isArray(overlaps)?overlaps:[]));
}

// Global Views suppress only PROVEN duplicate physical paths. Two distinct
// Catalog metadata records are NEVER collapsed: both stay visible with a
// conflict warning. Explicit source-scoped Views keep their source projection.
export function collapseVerifiedOverlaps(items,overlaps=[],{sourceId=null}={}){
  if(!Array.isArray(items))throw Error('Invalid overlapping View results');
  if(sourceId||!Array.isArray(overlaps)||!overlaps.length)return [...items];
  const groups=new Map(),parents=overlapParents(overlaps);
  for(const item of items){
    const {key,depth:distance}=physicalKeyWithParents(item,parents);
    const groupKey=key;
    if(!groups.has(groupKey))groups.set(groupKey,[]);
    groups.get(groupKey).push({item,distance});
  }
  const output=[];
  for(const group of groups.values()){
    if(group.length===1){output.push(group[0].item);continue;}
    const cataloged=group.filter(x=>x.item.record&&!x.item.unobjectified);
    const suspect=group.some(x=>x.item.missing||x.item.changedKind)||
      new Set(group.map(x=>x.item.kind)).size>1;
    if(cataloged.length>1||suspect){
      // Never hide contradictory metadata or a possible stale physical binding.
      output.push(...group.map(x=>({...x.item,overlapConflict:true})));
      continue;
    }
    if(cataloged.length===1){output.push(cataloged[0].item);continue;}
    // Prefer a freshly scanned root, then the nearest/deepest registered root.
    // Sorting makes results stable regardless of scan enumeration order.
    group.sort((a,b)=>Number(!!a.item.staleIndex)-Number(!!b.item.staleIndex)||
      b.distance-a.distance||a.item.sourceId.localeCompare(b.item.sourceId)||
      a.item.path.localeCompare(b.item.path));
    output.push(group[0].item);
  }
  return output;
}
