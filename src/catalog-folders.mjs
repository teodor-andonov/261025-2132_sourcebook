// Catalog folder navigation is a read-only projection of existing source roots
// and objectified resource locations. It does not create physical or virtual folders.
function validSegments(path){
  if(typeof path!=='string'||!path||path.startsWith('/')||path.endsWith('/')||path.includes('\\'))return null;
  const parts=path.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||/[\u0000-\u001f]/.test(p)))return null;
  return parts;
}
export function catalogFolderTree(sources,records){
  const roots=[],known=new Map();
  for(const source of Array.isArray(sources)?sources:[]){
    if(!source||typeof source.id!=='string'||!source.id||known.has(source.id))continue;
    const root={sourceId:source.id,path:'',name:String(source.name||'Folder'),depth:0,root:true};
    roots.push(root);known.set(source.id,new Map([['',root]]));
  }
  const rows=[];
  for(const record of records||[]){
    const map=known.get(record?.sourceId);
    if(!map)continue;
    const parts=validSegments(record.path);
    if(!parts)continue;
    const max=record.kind==='directory'?parts.length:parts.length-1;
    for(let depth=1;depth<=max;depth++){
      const path=parts.slice(0,depth).join('/');
      if(map.has(path))continue;
      const folder={sourceId:record.sourceId,path,name:parts[depth-1],depth,root:false};
      map.set(path,folder);rows.push(folder);
    }
  }
  const childrenByRoot=new Map();
  for(const root of roots)childrenByRoot.set(root.sourceId,[]);
  for(const child of rows)childrenByRoot.get(child.sourceId).push(child);
  const byDisplay=[];
  for(const root of roots){
    byDisplay.push(root);
    const paths=childrenByRoot.get(root.sourceId);
    paths.sort((a,b)=>{
      const aa=a.path.split('/'),bb=b.path.split('/');
      const n=Math.min(aa.length,bb.length);
      for(let i=0;i<n;i++){
        const cmp=aa[i].localeCompare(bb[i],undefined,{sensitivity:'base',numeric:true});
        if(cmp)return cmp;
      }
      return aa.length-bb.length;
    });
    byDisplay.push(...paths);
  }
  return byDisplay;
}
export function catalogFolderParts(path){
  if(path==='')return [];
  const segments=validSegments(path);
  if(!segments)throw Error('Invalid catalog folder path');
  return segments;
}
// Future canonical-save support: a deeper overlapping source root yields a
// shorter relative route to the same file. Never silently reassign existing IDs.
export function nearestRootMatch(matches){
  const valid=(Array.isArray(matches)?matches:[]).filter(m=>m&&typeof m.sourceId==='string'&&Array.isArray(m.parts)&&m.parts.length>0&&m.parts.every(p=>typeof p==='string'&&p&&p!=='..'&&p!=='.'&&!p.includes('/')));
  return valid.sort((a,b)=>a.parts.length-b.parts.length||a.sourceId.localeCompare(b.sourceId))[0]||null;
}
