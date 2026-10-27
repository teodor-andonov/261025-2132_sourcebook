// Ephemeral, read-only discovery of files under already-granted Catalog Folders.
// This index is deliberately NOT a catalog mutation or a durable filesystem watcher.
const validPart=name=>typeof name==='string'&&!!name&&name!=='.'&&name!=='..'&&!/[\/\\\u0000-\u001f]/.test(name);
const key=(sourceId,path)=>sourceId+'\u0000'+path;
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

export async function scanRegisteredFolders(sources,handles,options={}){
  if(!Array.isArray(sources)||!(handles instanceof Map))throw Error('Invalid scan sources');
  const {onProgress=()=>{},isCancelled=()=>false,maxEntries=50000,maxDepth=32}=options;
  if(!Number.isInteger(maxEntries)||maxEntries<1||!Number.isInteger(maxDepth)||maxDepth<1)throw Error('Invalid scan limits');
  const entries=[],completeRootIds=[],problems=[],seenRoots=new Set(),seenPaths=new Set();
  const progress=()=>onProgress({count:entries.length,completeRoots:completeRootIds.length,totalRoots:sources.length,problems:problems.length});
  const result=cancelled=>({entries,completeRootIds,problems,cancelled});
  for(const source of sources){
    if(isCancelled())return result(true);
    if(!source||!validPart(source.id)||seenRoots.has(source.id)){
      problems.push('Invalid or repeated source ID');progress();continue;
    }
    seenRoots.add(source.id);
    const root=handles.get(source.id);
    if(!root||root.kind!=='directory'||typeof root.entries!=='function'||typeof root.queryPermission!=='function'){
      problems.push(String(source.name||source.id)+': disconnected');progress();continue;
    }
    let granted=false;
    try{granted=await root.queryPermission({mode:'read'})==='granted';}
    catch{}
    if(!granted){problems.push(String(source.name||source.id)+': read permission unavailable');progress();continue;}
    const stack=[{handle:root,parts:[]}];
    let complete=true,limitReached=false;
    while(stack.length){
      if(isCancelled())return result(true);
      const {handle,parts}=stack.pop();
      try{
        for await(const [name,child] of handle.entries()){
          if(isCancelled())return result(true);
          if(!validPart(name)||!child||!['file','directory'].includes(child.kind)){
            complete=false;problems.push(String(source.name||source.id)+': invalid directory entry');continue;
          }
          if(child.kind==='directory'&&name.endsWith('.sb'))continue;
          if(entries.length>=maxEntries){
            complete=false;limitReached=true;problems.push('Scan limit reached ('+maxEntries+' entries)');break;
          }
          const path=[...parts,name].join('/'),identity=key(source.id,path);
          if(seenPaths.has(identity)){
            complete=false;problems.push(String(source.name||source.id)+': duplicate entry '+path);continue;
          }
          seenPaths.add(identity);
          entries.push({sourceId:source.id,path,kind:child.kind});
          if(child.kind==='directory'){
            if(parts.length+1>=maxDepth){
              complete=false;problems.push(String(source.name||source.id)+': depth limit at '+path);
            }else if(typeof child.entries==='function')stack.push({handle:child,parts:[...parts,name]});
            else{complete=false;problems.push(String(source.name||source.id)+': unreadable directory '+path);}
          }
          if(entries.length%250===0){progress();await tick();}
        }
      }catch(error){
        complete=false;problems.push(String(source.name||source.id)+': '+(error?.message||'Folder read failed'));
      }
      if(limitReached)break;
    }
    if(complete)completeRootIds.push(source.id);
    progress();
    if(limitReached)break;
  }
  return result(false);
}


// A registered root is a catalog identity, not an arbitrary directory with a
// similar name. On another device no same-entry proof exists: require explicit
// human confirmation, and never silently accept a different folder name.
export async function verifyCatalogRootReconnect(previous,picked,expectedName,approve=()=>false){
  if(!picked||picked.kind!=='directory'||typeof picked.entries!=='function')throw Error('Choose a directory');
  if(previous&&typeof previous.isSameEntry==='function'){
    if(!await previous.isSameEntry(picked))throw Error('This is not the previously registered Catalog Folder.');
    return 'verified';
  }
  if(typeof expectedName!=='string'||picked.name!==expectedName)throw Error('Folder name differs from the registered Catalog Folder. Reconnect the original folder.');
  if(!approve())throw Error('Folder reconnection not confirmed.');
  return 'confirmed';
}

// Verify the selected physical entry still exists at its original path before
// any metadata write. No getFile, writable handle, rename or move is involved.
export async function assertLiveSourceEntry(root,parts,item){
  if(!root||root.kind!=='directory'||!Array.isArray(parts)||parts.some(p=>!validPart(p))||
    !item||!validPart(item.name)||!['file','directory'].includes(item.kind))throw Error('Invalid source binding');
  let folder=root;
  for(const part of parts)folder=await folder.getDirectoryHandle(part);
  const live=item.kind==='directory'?await folder.getDirectoryHandle(item.name):await folder.getFileHandle(item.name);
  if(live.kind!==item.kind)throw Error('Source entry type changed: '+item.name);
  if(typeof live.isSameEntry==='function'&&typeof item.handle?.isSameEntry==='function'&&
    !await live.isSameEntry(item.handle))throw Error('Source entry was replaced: '+item.name);
  return true;
}


// Targeted, read-only traversal of a known subfolder within a registered root.
// The root is never replaced by a same-named directory, and a failed traversal
// never claims that cached siblings (or missing catalog records) are absent.
export async function scanRegisteredSubfolder(source,root,folderPath,options={}){
  if(!source||!validPart(source.id)||typeof folderPath!=='string'||!folderPath||
     folderPath.length>4096||folderPath.split('/').some(part=>!validPart(part)))
    throw Error('Invalid indexed subfolder path');
  if(root?.kind!=='directory'||typeof root.getDirectoryHandle!=='function'||typeof root.queryPermission!=='function')
    throw Error('Registered Catalog Folder is disconnected');
  if(await root.queryPermission({mode:'read'})!=='granted')throw Error('Registered Catalog Folder read permission unavailable');
  const parts=folderPath.split('/');
  const maxDepth=options.maxDepth??32;
  if(!Number.isInteger(maxDepth)||maxDepth<1||parts.length>=maxDepth)
    throw Error('Indexed subfolder exceeds scan depth limit');
  let directory=root;
  for(const part of parts)directory=await directory.getDirectoryHandle(part);
  if(directory?.kind!=='directory')throw Error('Indexed subfolder is no longer a directory');
  const result=await scanRegisteredFolders([source],new Map([[source.id,directory]]),{
    ...options,maxEntries:Math.min(options.maxEntries??50000,49999),maxDepth:maxDepth-parts.length
  });
  const entries=[{sourceId:source.id,path:folderPath,kind:'directory'},
    ...result.entries.map(entry=>({...entry,path:folderPath+'/'+entry.path}))];
  const complete=result.completeRootIds.includes(source.id)&&!result.cancelled;
  return {...result,entries,completeRootIds:[],
    completeSubtreePaths:complete?[{sourceId:source.id,path:folderPath}]:[]};
}
