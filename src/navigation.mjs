// Pure, testable selection movement for Sourcebook's gallery and list.
export function nextSelectionIndex(current,key,count,columns=1) {
  if(!Number.isInteger(count)||count<=0)return -1;
  columns=Math.max(1,Math.floor(columns)||1);
  if(key==='Home')return 0;
  if(key==='End')return count-1;
  if(current<0)return 0;
  if(key==='ArrowLeft')return Math.max(0,current-1);
  if(key==='ArrowRight')return Math.min(count-1,current+1);
  if(key==='ArrowUp')return Math.max(0,current-columns);
  if(key==='ArrowDown')return Math.min(count-1,current+columns);
  return Math.min(count-1,current);
}

// Shift selection must never include items hidden by a search or tag filter.
export function selectionRangeIds(visibleItems,anchorId,targetId){
  const ids=visibleItems.map(item=>item.id);
  const a=ids.indexOf(anchorId),b=ids.indexOf(targetId);
  if(b<0)return [];
  if(a<0)return [targetId];
  return ids.slice(Math.min(a,b),Math.max(a,b)+1);
}

export function resourceFocusId(ids,preferred=null){
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id))throw TypeError('Invalid resource IDs');
  return ids.includes(preferred)?preferred:ids[0]||null;
}
export function nextResourceFocusId(ids,currentId,key,columns=1){
  if(!resourceFocusId(ids,currentId))return null;
  const target=nextSelectionIndex(ids.indexOf(currentId),key,ids.length,columns);
  return target<0?null:ids[target];
}
