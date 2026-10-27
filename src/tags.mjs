// Tag paths are provisional string labels, not stable hierarchical tag IDs.
export function normalizeTagLabel(value) {
  if(typeof value!=='string')throw Error('Tag must be text.');
  const parts=value.trim().replace(/^#/, '').split('/').map(x=>x.trim().replace(/\s+/g,' '));
  if(parts.length>8)throw Error('Tags support up to 8 nested levels for now.');
  if(parts.some(x=>!x||x==='.'||x==='..'||/[#\u0000-\u001f\u007f]/.test(x)))throw Error('Use a tag name, with / between non-empty levels.');
  const label=parts.join('/');
  if(label.length>120)throw Error('Tag names must be at most 120 characters.');
  return label;
}
export function mergeTagInput(existing,input) {
  if(!Array.isArray(existing))throw Error('Invalid existing tags.');
  const result=[...existing],seen=new Set(result.map(x=>String(x).toLowerCase()));
  for(const raw of String(input).split(',')){
    if(!raw.trim())continue;
    const label=normalizeTagLabel(raw),key=label.toLowerCase();
    if(seen.has(key))continue;
    if(result.length>=64)throw Error('A resource can have at most 64 tags.');
    result.push(label);seen.add(key);
  }
  return result;
}
