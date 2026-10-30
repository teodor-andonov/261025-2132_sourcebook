// Portable Catalog URL resources. These live only in resources/<id>.json,
// never in a registered source Folder and never fetch remote page content.
import {normalizeCaptureURL} from './link-capture.mjs';
import {CODE_PATTERN} from './identity.mjs';

const validText=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f\u007f]/u.test(value);
const safeId=id=>typeof id==='string'&&/^[a-z0-9_-]{1,100}$/.test(id);
const tagList=ids=>Array.isArray(ids)&&ids.length<=64&&
  ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=128)&&new Set(ids).size===ids.length;

export function validateCatalogURLRecord(record){
  if(!record||record.kind!=='url'||!safeId(record.id)||!validText(record.title,120)||
    !validText(record.notes,4000)||!tagList(record.tagIds)||typeof record.url!=='string'||
    normalizeCaptureURL(record.url)!==record.url||
    record.sourceId!==undefined||record.path!==undefined)
    throw Error('Invalid Catalog URL resource');
  return record;
}
export function catalogURLName(record){
  validateCatalogURLRecord(record);
  return record.title||new URL(record.url).hostname;
}
export function planCatalogURLImport(catalog,records,links,{tagIds=[],timestamp=new Date().toISOString()}={}){
  if(!catalog||!CODE_PATTERN.test(catalog.code)||!Number.isSafeInteger(catalog.nextSequence)||
    catalog.nextSequence<1||!Array.isArray(records)||!Array.isArray(links)||
    !links.length||links.length>20||!tagList(tagIds)||!Number.isFinite(Date.parse(timestamp)))
    throw Error('Invalid Catalog URL import');
  const used=new Set(),urls=new Set();
  for(const record of records){
    if(!record||!safeId(record.id)||used.has(record.id))throw Error('Duplicate or invalid Catalog resource ID');
    used.add(record.id);
    if(record.kind==='url'){
      validateCatalogURLRecord(record);
      if(urls.has(record.url))throw Error('Duplicate Catalog URL records require manual review');
      urls.add(record.url);
    }
  }
  let sequence=catalog.nextSequence,skipped=0;
  const newRecords=[];
  for(const input of links){
    if(!input||typeof input.url!=='string')throw Error('Invalid URL import entry');
    const url=normalizeCaptureURL(input.url),title=input.title??'';
    if(!validText(title,120))throw Error('Invalid URL title');
    if(urls.has(url)){skipped++;continue;}
    urls.add(url);
    while(used.has(catalog.code+sequence)){
      if(sequence>=Number.MAX_SAFE_INTEGER)throw Error('Catalog URL identity sequence exhausted');
      sequence++;
    }
    if(sequence>=Number.MAX_SAFE_INTEGER)throw Error('Catalog URL identity sequence exhausted');
    const id=catalog.code+sequence++;
    used.add(id);
    newRecords.push({formatVersion:1,id,kind:'url',url,title:title.trim(),tagIds:[...tagIds],
      notes:'',updatedAt:timestamp});
  }
  return {newRecords,nextSequence:sequence,skipped};
}
export function planCatalogURLEdit(record,{title,notes,tagIds},timestamp=new Date().toISOString()){
  validateCatalogURLRecord(record);
  if(!validText(title,120)||!validText(notes,4000)||!tagList(tagIds)||
    !Number.isFinite(Date.parse(timestamp)))throw Error('Invalid URL metadata');
  const prior=Date.parse(record.updatedAt||'');
  const when=new Date(Math.max(Date.parse(timestamp),Number.isFinite(prior)?prior+1:0)).toISOString();
  return {...record,title:title.trim(),notes,tagIds:[...tagIds],updatedAt:when};
}
