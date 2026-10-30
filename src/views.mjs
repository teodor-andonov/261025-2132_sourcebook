import {normalizeTableColumns} from './view-layout.mjs';
// Catalog-local saved Views: stable IDs, scope/query and presentation together.
export function normalizeView(value){
  if(!value||typeof value!=='object')throw Error('Invalid View');
  const id=value.id,name=value.name;
  if(typeof id!=='string'||!id||id.length>128||/[\u0000-\u001f]/.test(id))throw Error('Invalid View ID');
  if(typeof name!=='string'||!name.trim()||name.trim().length>80||/[\u0000-\u001f]/.test(name))throw Error('Invalid View name');
  const sourceId=value.sourceId??null,folderPath=value.folderPath??'',tagId=value.tagId??null;
  if(sourceId!==null&&(typeof sourceId!=='string'||!sourceId||sourceId.length>128))throw Error('Invalid View source');
  if(typeof folderPath!=='string'||folderPath.startsWith('/')||folderPath.endsWith('/')||folderPath.includes('\\')||folderPath.split('/').some(p=>p==='.'||p==='..'||(!p&&folderPath!=='')||/[\u0000-\u001f]/.test(p)))throw Error('Invalid View folder');
  if(folderPath&&!sourceId)throw Error('View folder requires a source');
  if(tagId!==null&&(typeof tagId!=='string'||!tagId||tagId.length>128))throw Error('Invalid View tag');
  // A legacy single tagId becomes a one-element compound filter. Preserve
  // stable tag IDs and do not silently discard missing/deleted taxonomy IDs.
  const tagIds=value.tagIds??(tagId?[tagId]:[]);
  if(!Array.isArray(tagIds)||tagIds.length>16||tagIds.some(id=>typeof id!=='string'||!id||id.length>128)||new Set(tagIds).size!==tagIds.length)throw Error('Invalid View tag IDs');
  const tagMode=value.tagMode??'all';
  if(!['all','any'].includes(tagMode))throw Error('Invalid View tag logic');
  const fileType=value.fileType??'all';
  if(!['all','image','pdf','video','folder','other','url'].includes(fileType))throw Error('Invalid View file type');
  const pinned=value.pinned===true;
  if(value.pinned!==undefined&&typeof value.pinned!=='boolean')throw Error('Invalid View pin');
  const fileStatus=value.fileStatus??'all';
  if(!['all','cataloged','unobjectified','missing','changed'].includes(fileStatus))throw Error('Invalid View status filter');
  const query=value.query??'';
  if(typeof query!=='string'||query.length>200||/[\u0000-\u001f]/.test(query))throw Error('Invalid View query');
  const p=value.presentation;
  if(!p||!['gallery','list','table'].includes(p.mode)||!Number.isInteger(p.size)||p.size<110||p.size>280||!['name','name-desc','type','location'].includes(p.sort))throw Error('Invalid View presentation');
  const groupBy=p.groupBy??'none';
  if(!['none','source','folder','type'].includes(groupBy))throw Error('Invalid View grouping');
  const columns=normalizeTableColumns(p.columns);
  return {id,name:name.trim(),sourceId,folderPath,tagId:tagIds[0]??null,tagIds:[...tagIds],tagMode,query,fileType,fileStatus,pinned,presentation:{mode:p.mode,size:p.size,sort:p.sort,groupBy,columns}};
}
export function validateViews(value){
  if(!Array.isArray(value)||value.length>200)throw Error('Invalid views.json');
  const ids=new Set(),names=new Set();
  return value.map(entry=>{
    const view=normalizeView(entry),key=view.name.toLocaleLowerCase();
    if(ids.has(view.id)||names.has(key))throw Error('Duplicate View ID or name');
    ids.add(view.id);names.add(key);return view;
  });
}
export function createSavedView(views,spec,id){return validateViews([...validateViews(views),{...spec,id}]);}
export function updateSavedView(views,id,patch){
  const current=validateViews(views);
  if(!current.some(v=>v.id===id))throw Error('View no longer exists');
  return validateViews(current.map(v=>v.id===id?{...v,...patch,id}:v));
}
export function removeSavedView(views,id){
  const current=validateViews(views);
  if(!current.some(v=>v.id===id))throw Error('View no longer exists');
  return current.filter(v=>v.id!==id);
}
export function assertViewsSnapshotUnchanged(snapshot,disk){
  // Canonicalise older Views without mutating their files. Optional properties
  // are materialised only after an explicit View save.
  try{
    if(JSON.stringify(validateViews(snapshot))===JSON.stringify(validateViews(disk)))return;
  }catch{}
  throw Error('Views changed on disk. Reopen the catalog before saving.');
}
export function sortViewsForSidebar(views){
  return validateViews(views).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));
}
