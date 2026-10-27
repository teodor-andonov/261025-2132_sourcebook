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

// Inspector tag-entry helpers. Use the same slash-path normalization as
// the stable-ID taxonomy above; legacy record strings are preserved on read.
export function normalizeTagLabel(value){
  const label=normalizeTagPath(value);
  if(!label)throw Error('Enter a tag name.');
  if(label.length>120)throw Error('Tag names must be at most 120 characters.');
  return label;
}
function comparableTag(value){
  try{return normalizeTagPath(value).toLocaleLowerCase();}
  catch{return String(value).toLocaleLowerCase();}
}
export function mergeTagInput(existing,input){
  if(!Array.isArray(existing))throw Error('Invalid existing tags.');
  const result=[...existing],seen=new Set(result.map(comparableTag));
  for(const raw of String(input).split(',')){
    if(!raw.trim())continue;
    const label=normalizeTagLabel(raw),key=comparableTag(label);
    if(seen.has(key))continue;
    if(result.length>=64)throw Error('A resource can have at most 64 tags.');
    result.push(label);seen.add(key);
  }
  return result;
}

/** Search filenames and resolved tag paths without changing resource metadata.
 * A leading # restricts search to tags; # alone matches tagged resources.
 */
export function matchesResourceSearch(filename,paths,query){
  const raw=String(query??'').trim();
  if(!raw)return true;
  const tagsOnly=raw.startsWith('#');
  const needle=(tagsOnly?raw.slice(1):raw).trim().replace(/\s*\/\s*/g,' / ').toLocaleLowerCase();
  const tagPaths=Array.isArray(paths)?paths:[];
  if(!needle)return tagsOnly?tagPaths.length>0:true;
  if(!tagsOnly&&String(filename??'').toLocaleLowerCase().includes(needle))return true;
  return tagPaths.some(path=>String(path).replace(/\s*\/\s*/g,' / ').toLocaleLowerCase().includes(needle));
}


// Offer existing stable-ID tags while the user types a hashtag or path.
// Suggestions are read-only: choosing one never changes the taxonomy.
export function suggestTagPaths(tags,draft,input,limit=5){
  const raw=String(input??'').trim();
  if(!raw)return [];
  const needle=raw.replace(/^#+\s*/,'').trim().replace(/\s*\/\s*/g,' / ').toLocaleLowerCase();
  const selected=new Set((Array.isArray(draft)?draft:[]).map(value=>{
    try{return normalizeTagPath(value).toLocaleLowerCase();}
    catch{return String(value).toLocaleLowerCase();}
  }));
  return flattenedTagTree(tags).filter(tag=>
    !selected.has(tag.path.toLocaleLowerCase())&&
    (!needle||tag.path.toLocaleLowerCase().includes(needle))
  ).slice(0,Math.max(0,Math.min(20,Number.isInteger(limit)?limit:5)));
}
export function nextTagSuggestionIndex(current,direction,count){
  if(!Number.isInteger(count)||count<1)return -1;
  if(direction!==1&&direction!==-1)return current;
  if(!Number.isInteger(current)||current<0||current>=count)return direction===1?0:count-1;
  return (current+direction+count)%count;
}
