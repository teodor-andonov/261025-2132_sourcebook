// Bounded, cooperative, read-only enumeration of one browser Folder.
// A partial result is never presented as a complete directory snapshot.
export const FOLDER_ENUMERATION_LIMIT=20000;
export async function enumerateFolderEntries(directory,{
  sourceId,parts=[],include=()=>true,isCurrent=()=>true,onProgress=()=>{},
  maxEntries=FOLDER_ENUMERATION_LIMIT,batchSize=256,progressIntervalMs=180,
  now=()=>Date.now(),yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0))
}={}){
  if(!directory||typeof directory.entries!=='function')throw TypeError('A readable Folder is required');
  if(typeof sourceId!=='string'||!sourceId)throw TypeError('A Folder source ID is required');
  if(!Array.isArray(parts)||parts.some(p=>typeof p!=='string'||!p||p==='.'||p==='..'||/[\\/]/.test(p)))throw TypeError('Invalid Folder path');
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>FOLDER_ENUMERATION_LIMIT)throw RangeError('Invalid Folder entry limit');
  if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>maxEntries)throw RangeError('Invalid Folder batch size');
  if(!Number.isFinite(progressIntervalMs)||progressIntervalMs<0)throw RangeError('Invalid progress interval');
  if([include,isCurrent,onProgress,now,yieldControl].some(fn=>typeof fn!=='function'))throw TypeError('Invalid Folder enumeration callback');
  const items=[];
  let visited=0,truncated=false,lastProgress=-Infinity;
  for await(const entry of directory.entries()){
    if(!isCurrent())return {items:[],cancelled:true,truncated:false,visited};
    if(!Array.isArray(entry)||entry.length!==2)throw Error('Invalid Folder entry');
    const [name,handle]=entry;
    if(typeof name!=='string'||!name||name==='.'||name==='..'||/[\\/\x00-\x1f]/.test(name)||
      !handle||!['file','directory'].includes(handle.kind))throw Error('Invalid Folder entry');
    visited++;
    if(include(name,handle)){
      if(items.length===maxEntries){truncated=true;break;}
      items.push({id:sourceId+':'+[...parts,name].join('/'),name,handle,kind:handle.kind});
    }
    // Give other UI events, navigation and cancellation an opportunity to run.
    // Render no more frequently than the configured interval, even for huge Folders.
    if(visited%batchSize===0){
      if(items.length&&now()-lastProgress>=progressIntervalMs){
        await onProgress([...items]);lastProgress=now();
      }
      await yieldControl();
    }
  }
  if(!isCurrent())return {items:[],cancelled:true,truncated:false,visited};
  return {items,truncated,cancelled:false,visited};
}
