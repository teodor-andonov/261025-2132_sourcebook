// Read-only, bounded selection state shared by gallery, list and table views.
// Selection is never persisted, never includes filtered-out entries and cannot
// mutate ordinary files or Catalog metadata.
export const SELECTION_LIMIT=250;
function visibleIds(ids){
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id))throw TypeError('Invalid visible selection IDs');
  return [...new Set(ids)];
}
function bounded(limit){
  if(!Number.isSafeInteger(limit)||limit<1||limit>SELECTION_LIMIT)throw RangeError('Invalid selection limit');
  return limit;
}
export function pruneVisibleSelection(ids,selected,anchorId=null,focusId=null){
  const allowed=new Set(visibleIds(ids));
  const next=new Set([...selected].filter(id=>allowed.has(id)));
  const anchor=allowed.has(anchorId)?anchorId:null;
  const focus=allowed.has(focusId)?focusId:null;
  return {selected:next,anchorId:anchor,focusId:focus,
    changed:next.size!==selected.size||anchor!==anchorId||focus!==focusId};
}
export function changeVisibleSelection(ids,state,targetId,{range=false,additive=false,toggle=false,limit=SELECTION_LIMIT}={}){
  const order=visibleIds(ids),max=bounded(limit);
  if(!order.includes(targetId))throw RangeError('Selection target is not visible');
  const kept=pruneVisibleSelection(order,state.selected||new Set(),state.anchorId,state.focusId);
  let selected,anchorId;
  if(range){
    anchorId=kept.anchorId||kept.focusId||targetId;
    const a=order.indexOf(anchorId),b=order.indexOf(targetId);
    const span=order.slice(Math.min(a,b),Math.max(a,b)+1);
    selected=additive?new Set([...kept.selected,...span]):new Set(span);
  }else if(toggle){
    selected=new Set(kept.selected);
    if(selected.has(targetId))selected.delete(targetId);else selected.add(targetId);
    anchorId=targetId;
  }else{
    selected=new Set([targetId]);anchorId=targetId;
  }
  if(selected.size>max)throw RangeError('Select at most '+max+' visible items');
  return {selected,anchorId,focusId:targetId};
}
export function selectDisplayedItems(ids,limit=SELECTION_LIMIT){
  const order=visibleIds(ids),max=bounded(limit);
  const chosen=order.slice(0,max);
  return {selected:new Set(chosen),anchorId:chosen[0]||null,focusId:chosen.at(-1)||null,truncated:order.length>max};
}
