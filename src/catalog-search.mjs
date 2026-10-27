import {recordTagPaths,includesTagPath,normalizeTagPath,matchesResourceSearch,tagPath} from './tags.mjs';

// Read-only catalog-wide projection: records only, no file handles or writes.
export function catalogFileType(item){
  if(item?.kind==='directory')return 'folder';
  if(item?.kind!=='file')return 'other';
  const name=String(item.name||'').toLocaleLowerCase();
  if(/\.(jpe?g|png|webp|gif|avif|bmp|svg)$/.test(name))return 'image';
  if(/\.pdf$/.test(name))return 'pdf';
  if(/\.(mp4|mov|webm)$/.test(name))return 'video';
  return 'other';
}
export function sortCatalogResults(items,mode='name'){
  if(!['name','name-desc','type','location'].includes(mode))throw Error('Invalid sort mode');
  const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
  const ext=x=>x.kind==='directory'?'':x.name.includes('.')?x.name.split('.').at(-1).toLowerCase():'';
  return [...items].sort((a,b)=>{
    const loc=x=>String(x.location||x.sourceName||'')+' / '+(Array.isArray(x.parts)?x.parts.join('/'):'');
    const primary=mode==='type'?cmp(ext(a),ext(b)):mode==='location'?cmp(loc(a),loc(b)):mode==='name-desc'?cmp(b.name,a.name):cmp(a.name,b.name);
    return primary||cmp(a.name,b.name)||cmp(a.sourceName,b.sourceName)||cmp(a.sourceId,b.sourceId)||cmp(a.path,b.path);
  });
}
// Physical folders retain folder-first ordering under each explicit sort.
export function sortBrowserItems(items,mode='name'){
  return sortCatalogResults(items,mode).sort((a,b)=>Number(b.kind==='directory')-Number(a.kind==='directory'));
}
function validScope(path){
  if(path==='')return [];
  if(typeof path!=='string'||path.startsWith('/')||path.endsWith('/')||path.includes('\\'))throw Error('Invalid View folder scope');
  const parts=path.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||/[\u0000-\u001f]/.test(p)))throw Error('Invalid View folder scope');
  return parts;
}
export function catalogQueryResults(records,sources,taxonomy,filter={}){
  if(!Array.isArray(records)||!Array.isArray(sources)||!Array.isArray(taxonomy))throw Error('Invalid catalog index');
  const roots=new Map(sources.filter(s=>s&&typeof s.id==='string').map(s=>[s.id,s]));
  const sourceId=filter.sourceId??null,scope=validScope(filter.folderPath??'');
  const fileType=filter.fileType??'all';
  if(!['all','image','pdf','video','folder','other'].includes(fileType))throw Error('Invalid file type filter');
  if(scope.length&&!sourceId)throw Error('Folder scope needs a source');
  if(sourceId&&!roots.has(sourceId))return [];
  const tagIds=filter.tagIds??(filter.tagId?[filter.tagId]:[]);
  if(!Array.isArray(tagIds)||tagIds.length>16||tagIds.some(id=>typeof id!=='string'||!id||id.length>128)||new Set(tagIds).size!==tagIds.length)throw Error('Invalid tag filter');
  const tagMode=filter.tagMode??'all';
  if(!['all','any'].includes(tagMode))throw Error('Invalid tag logic');
  const tags=tagIds.map(id=>tagPath(taxonomy,id));
  // Missing IDs are never dropped and never convert a restrictive View
  // into an unrestricted search. OR retains matching surviving branches.
  if(tagIds.length&&!tags.some(Boolean))return [];
  if(tagMode==='all'&&tags.some(path=>!path))return [];
  const fallbackTag=normalizeTagPath(filter.tagPath||'');
  const seen=new Set(),results=[];
  for(const record of records){
    const root=roots.get(record?.sourceId);
    if(!root||(sourceId&&record.sourceId!==sourceId)||typeof record.path!=='string'||!['file','directory'].includes(record.kind))continue;
    const segments=record.path.split('/');
    if(!segments.length||segments.some(s=>!s||s==='.'||s==='..'||/[\\\u0000-\u001f]/.test(s)))continue;
    if(scope.length&&scope.some((p,i)=>segments[i]!==p))continue;
    const paths=recordTagPaths(record,taxonomy);
    if(tagIds.length){
      const matches=tags.map(tag=>!!tag&&includesTagPath(paths,tag));
      if(tagMode==='all'?!matches.every(Boolean):!matches.some(Boolean))continue;
    }else if(fallbackTag&&!includesTagPath(paths,fallbackTag))continue;
    const name=segments.at(-1);
    if(fileType!=='all'&&catalogFileType({name,kind:record.kind})!==fileType)continue;
    if(!matchesResourceSearch(name,paths,filter.query||''))continue;
    const key=record.sourceId+'\u0000'+record.path;
    if(seen.has(key))continue;
    seen.add(key);
    const parts=segments.slice(0,-1);
    results.push({id:'catalog:'+record.sourceId+':'+record.path,sourceId:record.sourceId,
      sourceName:String(root.name||'Folder'),parts,name,kind:record.kind,path:record.path,record,
      location:String(root.name||'Folder')+(parts.length?' / '+parts.join(' / '):'')});
  }
  return sortCatalogResults(results,filter.sort||'name');
}
export function catalogTagResults(records,sources,taxonomy,selectedTag){
  const tag=normalizeTagPath(selectedTag);
  if(!tag)throw Error('Choose a tag.');
  return catalogQueryResults(records,sources,taxonomy,{tagPath:tag});
}


// Overlay an explicit, disposable disk scan onto catalog records. Tag conditions
// naturally exclude unobjectified entries; unfiltered Views include them.
// Missing is asserted only for roots whose traversal completed without errors.
export function catalogQueryWithScan(records,sources,taxonomy,filter={},scan=null){
  const originals=[...records];
  if(!scan)return catalogQueryResults(originals,sources,taxonomy,filter).map(item=>({...item,unobjectified:false,missing:false}));
  const recordKeys=new Set(originals.filter(r=>r&&typeof r.sourceId==='string'&&typeof r.path==='string').map(r=>r.sourceId+'\u0000'+r.path));
  const found=new Map(),extra=[];
  for(const entry of Array.isArray(scan.entries)?scan.entries:[]){
    if(!entry||typeof entry.sourceId!=='string'||typeof entry.path!=='string'||!['file','directory'].includes(entry.kind))continue;
    const k=entry.sourceId+'\u0000'+entry.path;
    if(found.has(k))continue;
    found.set(k,entry.kind);
    if(!recordKeys.has(k))extra.push({id:null,sourceId:entry.sourceId,path:entry.path,kind:entry.kind,tagIds:[]});
  }
  const complete=new Set(Array.isArray(scan.completeRootIds)?scan.completeRootIds:[]);
  return catalogQueryResults([...originals,...extra],sources,taxonomy,filter).map(item=>{
    const unobjectified=item.record?.id===null;
    const k=item.sourceId+'\u0000'+item.path;
    const missing=!unobjectified&&complete.has(item.sourceId)&&!found.has(k);
    const changedKind=!unobjectified&&found.has(k)&&found.get(k)!==item.kind;
    return {...item,record:unobjectified?null:item.record,unobjectified,missing,changedKind};
  });
}
