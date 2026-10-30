// Bulk metadata-only Tag changes for portable Catalog URL resources.
// This planner never writes files, changes URL identities, or creates taxonomy
// entries for removals. The caller commits its plan in one Catalog journal.
import {validateCatalogURLRecord,planCatalogURLEdit} from './catalog-urls.mjs';
import {ensureTagPath,normalizeTagLabel,tagPath} from './tags.mjs';

export const MAX_BULK_URLS=250;
export function parseBulkURLTagPaths(value){
  if(typeof value!=='string'||value.length>1000)throw Error('Invalid bulk Tag input');
  const paths=value.split(',').map(path=>path.trim()).filter(Boolean).map(normalizeTagLabel);
  if(!paths.length||paths.length>16)throw Error('Enter 1–16 Tag paths');
  if(new Set(paths.map(path=>path.toLocaleLowerCase())).size!==paths.length)
    throw Error('Duplicate Tag paths');
  return paths;
}

export function planBulkCatalogURLTags({records,taxonomy,selectedIds,paths,mode,
  idFactory=()=>globalThis.crypto.randomUUID(),timestamp=new Date().toISOString()}){
  if(!['add','remove'].includes(mode)||!Array.isArray(records)||!Array.isArray(taxonomy)||
    !Array.isArray(selectedIds)||selectedIds.length<1||selectedIds.length>MAX_BULK_URLS||
    !Array.isArray(paths)||paths.length<1||paths.length>16||
    !Number.isFinite(Date.parse(timestamp)))throw Error('Invalid bulk Catalog URL Tag operation');
  const labels=paths.map(normalizeTagLabel);
  if(new Set(labels.map(path=>path.toLocaleLowerCase())).size!==labels.length)
    throw Error('Duplicate Tag paths');
  if(selectedIds.some(id=>typeof id!=='string'||!id)||
    new Set(selectedIds).size!==selectedIds.length)throw Error('Duplicate or invalid selected URL ID');
  const byId=new Map();
  for(const record of records){
    if(!record||typeof record.id!=='string'||byId.has(record.id))
      throw Error('Duplicate or invalid Catalog resource ID');
    byId.set(record.id,record);
  }
  const tagIds=new Set();
  for(const tag of taxonomy){
    if(!tag||typeof tag.id!=='string'||!tag.id||tagIds.has(tag.id))
      throw Error('Duplicate or invalid Catalog Tag ID');
    tagIds.add(tag.id);
  }
  const selected=selectedIds.map(id=>{
    const record=byId.get(id);
    if(!record||record.kind!=='url')throw Error('Selected Catalog URL changed: '+id);
    validateCatalogURLRecord(record);
    if(record.tagIds.some(tagId=>!tagIds.has(tagId)))
      throw Error('Unresolved Tag ID on Catalog URL: '+id);
    return record;
  });
  let nextTaxonomy=taxonomy;
  const targets=[];
  if(mode==='add'){
    for(const label of labels){
      const result=ensureTagPath(nextTaxonomy,label,idFactory);
      nextTaxonomy=result.tags;targets.push(result.id);
    }
  }
  const removePaths=new Set(labels.map(label=>label.toLocaleLowerCase()));
  const changes=[];
  for(const record of selected){
    const nextIds=mode==='add'?
      [...record.tagIds,...targets.filter(id=>!record.tagIds.includes(id))]:
      record.tagIds.filter(id=>!removePaths.has(tagPath(taxonomy,id).toLocaleLowerCase()));
    if(nextIds.length===record.tagIds.length&&nextIds.every((id,i)=>id===record.tagIds[i]))continue;
    if(nextIds.length>64)throw Error('Maximum 64 Tags on Catalog URL: '+record.id);
    const after=planCatalogURLEdit(record,{title:record.title,notes:record.notes,tagIds:nextIds},timestamp);
    changes.push({path:'resources/'+record.id+'.json',before:record,after});
  }
  return {taxonomy:nextTaxonomy,changes,selected:selected.length,changed:changes.length};
}
