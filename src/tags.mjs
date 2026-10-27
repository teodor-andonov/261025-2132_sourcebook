// Portable catalog taxonomy. Stable IDs; labels and hierarchy can change
// without rewriting resource records.
export function splitTagPath(value) {
  const raw=String(value??'').trim().replace(/^#+\s*/,'');
  if(!raw)return [];
  const parts=raw.split('/').map(s=>s.trim());
  if(parts.some(s=>!s||s.length>80||/[<>\u0000-\u001f]/.test(s)))throw Error('Invalid tag path');
  if(parts.length>12)throw Error('Tag hierarchy is too deep');
  return parts;
}
export function normalizeTagPath(value){return splitTagPath(value).join(' / ');}
export function tagPath(tags,id){
  const byId=new Map(tags.map(t=>[t.id,t]));
  const names=[],visited=new Set();
  let node=byId.get(id);
  while(node){
    if(visited.has(node.id))throw Error('Cyclic tag hierarchy');
    visited.add(node.id);names.unshift(node.name);
    node=node.parentId?byId.get(node.parentId):null;
  }
  return names.join(' / ');
}
export function ensureTagPath(tags,value,idFactory=()=>crypto.randomUUID()){
  const parts=splitTagPath(value);
  if(!parts.length)throw Error('Empty tag');
  const next=[...tags];let parentId=null,created=false,tag=null;
  for(const name of parts){
    tag=next.find(t=>(t.parentId??null)===parentId&&t.name.toLocaleLowerCase()===name.toLocaleLowerCase());
    if(!tag){
      tag={id:idFactory(),name,parentId};
      if(next.some(t=>t.id===tag.id))throw Error('Duplicate tag ID');
      next.push(tag);created=true;
    }
    parentId=tag.id;
  }
  return {tags:next,id:tag.id,created};
}
export function recordTagPaths(record,tags){
  const paths=[];
  for(const id of record?.tagIds||[]){
    const path=tagPath(tags,id);if(path)paths.push(path);
  }
  // Old Sourcebook records had plain string tags. Preserve those on read
  // and promote them to stable taxonomy IDs only when explicitly saved.
  for(const name of record?.tags||[]){
    try{const path=normalizeTagPath(name);if(path)paths.push(path);}catch{}
  }
  return [...new Map(paths.map(x=>[x.toLocaleLowerCase(),x])).values()];
}
export function flattenedTagTree(tags){
  const output=[],visited=new Set();
  function visit(parentId,depth){
    const children=tags.filter(t=>(t.parentId??null)===parentId)
      .sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
    for(const t of children){
      if(visited.has(t.id))continue;
      visited.add(t.id);output.push({...t,depth,path:tagPath(tags,t.id)});
      visit(t.id,depth+1);
    }
  }
  visit(null,0);
  return output;
}
export function includesTagPath(paths,filterPath){
  const f=normalizeTagPath(filterPath).toLocaleLowerCase();
  return paths.some(path=>{
    const value=normalizeTagPath(path).toLocaleLowerCase();
    return value===f||value.startsWith(f+' / ');
  });
}
