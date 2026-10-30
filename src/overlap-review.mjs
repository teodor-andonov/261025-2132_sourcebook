// Explicit, read-only review of competing Catalog records under proven Folder
// overlaps. Root identity only nominates paths; live per-resource isSameEntry
// checks are required before calling two bindings the same physical entry.
// No metadata or ordinary source file is ever written by this module.
import {physicalResultKey} from './source-overlap.mjs';
import {recordTagPaths} from './tags.mjs';

const validId=value=>typeof value==='string'&&value.length>0&&value.length<=128&&!/[\u0000-\u001f]/.test(value);
const validPath=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&
  path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!/[\\\u0000-\u001f]/.test(part));
const stable=value=>JSON.stringify(value,(_key,item)=>
  item&&typeof item==='object'&&!Array.isArray(item)?
    Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const extras=record=>Object.fromEntries(Object.entries(record).filter(([key])=>
  !['id','sourceId','path','kind','tagIds','tags','notes'].includes(key)));

export function buildOverlapRecordReview(records,sources,taxonomy,overlaps,{maxRecords=20000,maxGroups=500}={}){
  if(!Array.isArray(records)||!Array.isArray(sources)||!Array.isArray(taxonomy)||
    !Array.isArray(overlaps)||!Number.isSafeInteger(maxRecords)||maxRecords<1||
    !Number.isSafeInteger(maxGroups)||maxGroups<1||records.length>maxRecords)
    throw Error('Invalid or oversized overlap review input');
  const sourceNames=new Map();
  for(const source of sources){
    if(!validId(source?.id)||sourceNames.has(source.id))throw Error('Invalid or duplicate Catalog Folder');
    sourceNames.set(source.id,String(source.name||'Folder'));
  }
  const knownTags=new Set(taxonomy.map(tag=>tag?.id));
  const groups=new Map(),recordIds=new Set();
  for(const record of records){
    if(!validId(record?.id)||recordIds.has(record.id)||!sourceNames.has(record.sourceId)||
      !validPath(record.path)||!['file','directory'].includes(record.kind))
      throw Error('Invalid or duplicate Catalog resource in overlap review');
    recordIds.add(record.id);
    const tagIds=record.tagIds??[];
    if(!Array.isArray(tagIds)||tagIds.some(id=>!validId(id))||
      new Set(tagIds).size!==tagIds.length||tagIds.length>64)
      throw Error('Invalid resource Tags in overlap review: '+record.id);
    if(record.notes!==undefined&&typeof record.notes!=='string')
      throw Error('Invalid resource notes in overlap review: '+record.id);
    const key=physicalResultKey(record,overlaps).key;
    const item={id:record.id,sourceId:record.sourceId,sourceName:sourceNames.get(record.sourceId),
      path:record.path,kind:record.kind,tagIds:[...tagIds],
      tagPaths:recordTagPaths(record,taxonomy),missingTagIds:tagIds.filter(id=>!knownTags.has(id)),
      notes:record.notes||'',otherMetadata:extras(record)};
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(item);
  }
  const output=[];
  for(const [key,items] of groups){
    if(items.length<2)continue;
    if(output.length>=maxGroups)throw Error('Overlap review group limit reached; no partial report produced');
    items.sort((a,b)=>a.sourceName.localeCompare(b.sourceName)||a.path.localeCompare(b.path)||a.id.localeCompare(b.id));
    const flags=[];
    if(new Set(items.map(x=>x.kind)).size>1)flags.push('Kinds differ');
    if(new Set(items.map(x=>x.notes)).size>1)flags.push('Notes differ');
    if(new Set(items.map(x=>stable([...x.tagIds].sort()))).size>1||
       new Set(items.map(x=>stable([...x.tagPaths].sort()))).size>1)flags.push('Tags differ');
    if(items.some(x=>x.missingTagIds.length))flags.push('Missing Tag references');
    if(new Set(items.map(x=>stable(x.otherMetadata))).size>1)flags.push('Other metadata differs');
    output.push({key,location:key.replace('\u0000',' / '),flags,
      status:flags.length?'metadata-differs':'metadata-matches',binding:'not-checked',records:items});
  }
  output.sort((a,b)=>a.location.localeCompare(b.location));
  return {groups:output,counts:{groups:output.length,records:output.reduce((n,g)=>n+g.records.length,0),
    differing:output.filter(g=>g.flags.length).length}};
}

async function granted(handle){
  try{return handle?.kind==='directory'&&await handle.queryPermission({mode:'read'})==='granted';}
  catch{return false;}
}
async function entryHandle(root,record){
  let folder=root;
  const parts=record.path.split('/');
  for(const part of parts.slice(0,-1))folder=await folder.getDirectoryHandle(part);
  return record.kind==='directory'?folder.getDirectoryHandle(parts.at(-1)):
    folder.getFileHandle(parts.at(-1));
}
async function sameEntry(a,b){
  let tested=false;
  for(const [x,y] of [[a,b],[b,a]]){
    if(typeof x?.isSameEntry!=='function')continue;
    try{if(await x.isSameEntry(y)===true)return 'same';tested=true;}catch{}
  }
  return tested?'different':'unverified';
}
// A bounded, read-only recheck of the actual source entries. A verified root
// relationship alone does not prove that cached descendant files still exist.
export async function verifyOverlapRecordBindings(report,handles,{maxEntries=1000}={}){
  if(!report||!Array.isArray(report.groups)||!(handles instanceof Map)||
    !Number.isSafeInteger(maxEntries)||maxEntries<1)
    throw Error('Invalid overlap binding inspection');
  const count=report.groups.reduce((n,g)=>n+g.records.length,0);
  if(count>maxEntries)throw Error('Overlap review entry limit reached; no partial verification');
  const permission=new Map(),groups=[];
  for(const group of report.groups){
    const resolved=[];
    for(const record of group.records){
      const root=handles.get(record.sourceId);
      if(!permission.has(record.sourceId))permission.set(record.sourceId,await granted(root));
      if(!permission.get(record.sourceId)){resolved.push({status:'permission',handle:null});continue;}
      try{resolved.push({status:'found',handle:await entryHandle(root,record)});}
      catch(error){resolved.push({status:error?.name==='NotFoundError'?'missing':'unverified',handle:null});}
    }
    let binding='same-entry';
    if(resolved.some(x=>x.status==='missing'))binding='missing';
    else if(resolved.some(x=>x.status!=='found'))binding='unverified';
    else{
      for(let i=1;i<resolved.length;i++){
        const match=await sameEntry(resolved[0].handle,resolved[i].handle);
        if(match==='different'){binding='different-entry';break;}
        if(match==='unverified')binding='unverified';
      }
    }
    groups.push({...group,binding,records:group.records.map((record,i)=>({
      ...record,entryStatus:resolved[i].status
    }))});
  }
  return {...report,groups,counts:{...report.counts,
    verified:groups.filter(g=>g.binding==='same-entry').length,
    different:groups.filter(g=>g.binding==='different-entry').length,
    unresolved:groups.filter(g=>!['same-entry','different-entry'].includes(g.binding)).length}};
}
