import {recordTagPaths,includesTagPath,normalizeTagPath,matchesResourceSearch,tagPath} from './tags.mjs';

// Read-only catalog-wide projection: records only, no file handles or writes.
export function sortCatalogResults(items,mode='name'){
  if(!['name','name-desc','type'].includes(mode))throw Error('Invalid sort mode');
  const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
  const ext=x=>x.kind==='directory'?'':x.name.includes('.')?x.name.split('.').at(-1).toLowerCase():'';
  return [...items].sort((a,b)=>{
    const primary=mode==='type'?cmp(ext(a),ext(b)):mode==='name-desc'?cmp(b.name,a.name):cmp(a.name,b.name);
    return primary||cmp(a.name,b.name)||cmp(a.sourceName,b.sourceName)||cmp(a.sourceId,b.sourceId)||cmp(a.path,b.path);
  });
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
  if(scope.length&&!sourceId)throw Error('Folder scope needs a source');
  if(sourceId&&!roots.has(sourceId))return [];
  const tag=filter.tagId?tagPath(taxonomy,filter.tagId):normalizeTagPath(filter.tagPath||'');
  if(filter.tagId&&!tag)return []; // Deleted tag must never widen a View.
  const seen=new Set(),results=[];
  for(const record of records){
    const root=roots.get(record?.sourceId);
    if(!root||(sourceId&&record.sourceId!==sourceId)||typeof record.path!=='string'||!['file','directory'].includes(record.kind))continue;
    const segments=record.path.split('/');
    if(!segments.length||segments.some(s=>!s||s==='.'||s==='..'||/[\\\u0000-\u001f]/.test(s)))continue;
    if(scope.length&&scope.some((p,i)=>segments[i]!==p))continue;
    const paths=recordTagPaths(record,taxonomy);
    if(tag&&!includesTagPath(paths,tag))continue;
    const name=segments.at(-1);
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
