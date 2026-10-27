import {recordTagPaths,includesTagPath,normalizeTagPath} from './tags.mjs';

// A non-mutating catalog-wide discovery index. Records are not file handles;
// missing/offline physical roots remain discoverable from catalog metadata.
export function catalogTagResults(records,sources,taxonomy,selectedTag){
  const tag=normalizeTagPath(selectedTag);
  if(!tag)throw Error('Choose a tag.');
  if(!Array.isArray(records)||!Array.isArray(sources)||!Array.isArray(taxonomy))throw Error('Invalid catalog index');
  const roots=new Map(sources.filter(s=>s&&typeof s.id==='string').map(s=>[s.id,s]));
  const seen=new Set(),results=[];
  for(const record of records){
    const root=roots.get(record?.sourceId);
    if(!root||typeof record.path!=='string'||!['file','directory'].includes(record.kind))continue;
    const segments=record.path.split('/');
    if(!segments.length||segments.some(s=>!s||s==='.'||s==='..'||/[\\\u0000-\u001f]/.test(s)))continue;
    const paths=recordTagPaths(record,taxonomy);
    if(!includesTagPath(paths,tag))continue;
    const key=record.sourceId+'\u0000'+record.path;
    if(seen.has(key))continue;
    seen.add(key);
    const name=segments.at(-1),parts=segments.slice(0,-1);
    results.push({
      id:'catalog:'+record.sourceId+':'+record.path,
      sourceId:record.sourceId,sourceName:String(root.name||'Folder'),
      parts,name,kind:record.kind,path:record.path,record,
      location:String(root.name||'Folder')+(parts.length?' / '+parts.join(' / '):'')
    });
  }
  return results.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})||
    a.sourceName.localeCompare(b.sourceName,undefined,{numeric:true,sensitivity:'base'})||
    a.path.localeCompare(b.path,undefined,{numeric:true,sensitivity:'base'}));
}
