// Catalog-only bulk tag editing. No ordinary source files are written.
// Preflight checks and a recoverable catalog journal protect interrupted batches.
import {planResourceIdentity} from './catalog.mjs';
import {readJson} from './storage.mjs';
import {commitCatalogTransaction} from './catalog-transactions.mjs';
import {normalizeTagLabel,recordTagPaths,ensureTagPath,assertTagSnapshotUnchanged} from './tags.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const key=(source,path)=>source+'\0'+path;
const location=(parts,item)=>[...parts,item.name].join('/');
function byPath(records){
  const map=new Map();
  for(const r of records){
    if(!r?.sourceId||!r?.path)continue;
    const k=key(r.sourceId,r.path);
    if(map.has(k))throw Error('Duplicate catalog path: '+r.path);
    map.set(k,r);
  }
  return map;
}
export function assertSelectedUnchanged(before,after,items,sourceId,parts){
  const a=byPath(before),b=byPath(after);
  for(const item of items){
    const k=key(sourceId,location(parts,item));
    if(!same(a.get(k)||null,b.get(k)||null))throw Error('Selected metadata changed on disk: '+item.name);
  }
}
export function planBulkTags({catalog,taxonomy,records,items,sourceId,parts,paths,mode,siblingNames=[],idFactory=()=>crypto.randomUUID(),timestamp=new Date().toISOString()}){
  if(mode!=='add'&&mode!=='remove')throw Error('Invalid bulk action');
  if(!Array.isArray(items)||!items.length||items.length>250)throw Error('Select 1–250 resources.');
  if(!Array.isArray(parts)||parts.some(p=>typeof p!=='string'||!p||p==='.'||p==='..'||/[\\/]/.test(p)))throw Error('Invalid folder path');
  if(typeof sourceId!=='string'||!sourceId||!Array.isArray(records)||!Array.isArray(taxonomy)||!Array.isArray(paths))throw Error('Invalid catalog data');
  const labels=[...new Map(paths.map(p=>{const label=normalizeTagLabel(p);return [label.toLocaleLowerCase(),label];})).values()];
  if(!labels.length)throw Error('Enter tags first.');
  const targets=new Set(labels.map(x=>x.toLocaleLowerCase()));
  const index=byPath(records),known=new Set(taxonomy.map(t=>t.id));
  const allocations=[...records],changes=[],names=new Set();
  let nextSequence=catalog.nextSequence||1,updatedTaxonomy=taxonomy;
  for(const item of items){
    if(!item||!['file','directory'].includes(item.kind)||typeof item.name!=='string'||!item.name||item.name==='.'||item.name==='..'||/[\\/]/.test(item.name)||names.has(item.name))throw Error('Invalid or duplicate selected item');
    names.add(item.name);
    const path=location(parts,item),before=index.get(key(sourceId,path))||null;
    if(before){
      if(before.kind!==item.kind)throw Error('Resource type changed: '+item.name);
      if(!Array.isArray(before.tagIds||[])||!Array.isArray(before.tags||[])||(before.tagIds||[]).some(id=>!known.has(id)))throw Error('Unresolved tag ID: '+item.name);
      for(const legacy of before.tags||[])normalizeTagLabel(legacy);
    }
    const old=recordTagPaths(before,updatedTaxonomy),oldKeys=new Set(old.map(x=>x.toLocaleLowerCase()));
    const desired=mode==='add'?[...old,...labels.filter(x=>!oldKeys.has(x.toLocaleLowerCase()))]:old.filter(x=>!targets.has(x.toLocaleLowerCase()));
    if(!before&&mode==='remove')continue;
    if(same(old,desired)&&!(before?.tags?.length))continue;
    if(desired.length>64)throw Error('Maximum 64 tags per resource: '+item.name);
    const tagIds=[];
    for(const tag of desired){const result=ensureTagPath(updatedTaxonomy,tag,idFactory);updatedTaxonomy=result.tags;tagIds.push(result.id);}
    let id=before?.id;
    if(!id){
      const planned=planResourceIdentity({...catalog,nextSequence},allocations,item.name,siblingNames);
      id=planned.id;nextSequence=planned.nextSequence;
    }
    const base=Date.parse(timestamp),previous=Date.parse(before?.updatedAt||'');
    const updatedAt=new Date(Number.isFinite(previous)?Math.max(base,previous+1):base).toISOString();
    const after=before?{...before,tagIds,updatedAt}:{formatVersion:1,id,kind:item.kind,sourceId,path,tagIds,notes:'',renamed:false,updatedAt};
    delete after.tags;
    changes.push({before,after});
    if(!before)allocations.push(after);
  }
  return {changes,taxonomy:updatedTaxonomy,nextSequence};
}
export async function commitBulkTags({handle,plan,expectedCatalog,expectedTaxonomy}){
  const catalog=await readJson(handle,'catalog.json');
  if(!same(catalog,expectedCatalog))throw Error('Catalog changed on disk.');
  const rawTags=await readJson(handle,'tags.json',null),tags=rawTags??[];
  assertTagSnapshotUnchanged(expectedTaxonomy,tags);
  if(!plan.changes.length)return 0;
  let dir=null;
  try{dir=await handle.getDirectoryHandle('resources');}
  catch(e){if(e.name!=='NotFoundError')throw e;}
  const changes=[];
  if(!same(plan.taxonomy,tags))changes.push({path:'tags.json',before:rawTags,after:plan.taxonomy});
  if(plan.nextSequence>(catalog.nextSequence||1))
    changes.push({path:'catalog.json',before:catalog,after:{...catalog,nextSequence:plan.nextSequence}});
  for(const {before,after} of plan.changes){
    const disk=dir?await readJson(dir,after.id+'.json',null):null;
    if(!same(disk,before))throw Error('Resource changed on disk: '+after.path);
    changes.push({path:'resources/'+after.id+'.json',before,after});
  }
  await commitCatalogTransaction({handle,catalogId:catalog.id,changes});
  return plan.changes.length;
}
