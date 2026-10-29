// Physical folder tabs are device-local browser state; never catalog records.
// All helpers are pure and never mutate a FileSystemHandle or ordinary files.
export const PLAIN_ROOT_ID='plain-root';
import {FOLDER_FILE_TYPES} from './folder-filters.mjs';
export const FOLDER_TAB_DEFAULTS=Object.freeze({search:'',sort:'name',view:'gallery',size:164,fileType:'all',showHidden:true});
const FOLDER_TYPES=new Set(FOLDER_FILE_TYPES.map(([id])=>id));
const FOLDER_SORTS=new Set(['name','name-desc','type']);
const FOLDER_VIEWS=new Set(['gallery','list','table']);
// Device-local tab presentation state only; no source-file writes or selections.
export function folderTabPreferences(value){
  const v=value&&typeof value==='object'?value:{};
  return {
    search:typeof v.search==='string'&&v.search.length<=256&&!/[\x00-\x1f\x7f]/.test(v.search)?v.search:'',
    sort:FOLDER_SORTS.has(v.sort)?v.sort:FOLDER_TAB_DEFAULTS.sort,
    view:FOLDER_VIEWS.has(v.view)?v.view:FOLDER_TAB_DEFAULTS.view,
    size:Number.isFinite(v.size)&&v.size>=110&&v.size<=280?Math.round(v.size):FOLDER_TAB_DEFAULTS.size,
    fileType:FOLDER_TYPES.has(v.fileType)?v.fileType:FOLDER_TAB_DEFAULTS.fileType,
    showHidden:typeof v.showHidden==='boolean'?v.showHidden:FOLDER_TAB_DEFAULTS.showHidden
  };
}
export function updateFolderTabPreferences(tabs,id,changes){
  if(!tabs.some(tab=>tab.id===id))throw Error('Unknown folder tab');
  return tabs.map(tab=>tab.id===id?{...tab,preferences:folderTabPreferences({...tab.preferences,...changes})}:tab);
}
export function adjacentFolderTabId(tabs,id,delta){
  const index=tabs.findIndex(tab=>tab.id===id);
  if(index<0||tabs.length<2||!Number.isInteger(delta)||delta===0)return null;
  return tabs[((index+delta)%tabs.length+tabs.length)%tabs.length].id;
}
export function plainRoot(handle){
  if(!handle||handle.kind!=='directory'||typeof handle.entries!=='function')throw TypeError('A readable directory is required');
  return {id:PLAIN_ROOT_ID,name:String(handle.name||'Folder')};
}
function validParts(parts){
  return Array.isArray(parts)&&parts.length<=128&&parts.every(part=>typeof part==='string'&&part.length>0&&part!=='.'&&part!=='..'&&!part.includes('/')&&!part.includes('\\'));
}
export function createFolderTab(handle,id,preferences={}){
  const root=plainRoot(handle);
  if(typeof id!=='string'||!id||id.length>128)throw Error('Invalid folder tab ID');
  return {...root,id,handle,parts:[],history:[[]],position:0,preferences:folderTabPreferences(preferences)};
}
export function loadFolderTabs(saved){
  const seen=new Set(),tabs=[];
  for(const item of Array.isArray(saved?.tabs)?saved.tabs:[]){
    try{
      if(!item||typeof item.id!=='string'||seen.has(item.id))continue;
      const root=createFolderTab(item.handle,item.id,item.preferences);
      const history=Array.isArray(item.history)&&item.history.length>0&&item.history.length<=500&&item.history.every(validParts)?item.history.map(p=>[...p]):[[]];
      const position=Number.isInteger(item.position)&&item.position>=0&&item.position<history.length?item.position:0;
      const parts=history[position];
      tabs.push({...root,name:root.name,history,position,parts});
      seen.add(item.id);
    }catch{} // A damaged saved tab must not block other folders from opening.
    if(tabs.length>=32)break;
  }
  const activeId=tabs.some(t=>t.id===saved?.activeId)?saved.activeId:tabs[0]?.id||null;
  return {tabs,activeId};
}
export function visitFolderTab(tabs,id,parts,{historyPosition=null}={}){
  if(!validParts(parts))throw Error('Invalid folder path');
  if(!tabs.some(t=>t.id===id))throw Error('Unknown folder tab');
  return tabs.map(tab=>{
    if(tab.id!==id)return tab;
    if(historyPosition!==null){
      if(!Number.isInteger(historyPosition)||historyPosition<0||historyPosition>=tab.history.length||JSON.stringify(tab.history[historyPosition])!==JSON.stringify(parts))throw Error('Invalid navigation history');
      return {...tab,position:historyPosition,parts:[...parts]};
    }
    if(JSON.stringify(tab.parts)===JSON.stringify(parts))return tab;
    const history=[...tab.history.slice(0,tab.position+1),[...parts]].slice(-500);
    return {...tab,parts:[...parts],history,position:history.length-1};
  });
}
export function folderHistoryTarget(tabs,id,delta){
  const tab=tabs.find(t=>t.id===id);
  if(!tab||!Number.isInteger(delta))return null;
  const position=tab.position+delta;
  if(position<0||position>=tab.history.length)return null;
  return {position,parts:[...tab.history[position]]};
}
export function closeFolderTab(tabs,id,activeId){
  const idx=tabs.findIndex(t=>t.id===id);
  if(idx<0)return {tabs:[...tabs],activeId};
  const next=tabs.filter(t=>t.id!==id);
  return {tabs:next,activeId:activeId===id?(next[Math.min(idx,next.length-1)]?.id||null):activeId};
}
