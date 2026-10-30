// Bounded, read-only resource paging. Only the current page is rendered;
// page changes never write a Folder, Catalog, or device-local preference.
export const RESOURCE_PAGE_SIZE=150;
export function pageWindow(total,offset=0,size=RESOURCE_PAGE_SIZE){
  if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(offset)||offset<0||
    !Number.isSafeInteger(size)||size<1||size>1000)throw RangeError('Invalid resource page');
  const pages=Math.max(1,Math.ceil(total/size));
  const page=Math.min(Math.floor(offset/size),pages-1);
  const start=page*size,end=Math.min(total,start+size);
  return {start,end,page:page+1,pages,total,hasPrevious:page>0,hasNext:page+1<pages};
}
export function pageForIndex(total,index,size=RESOURCE_PAGE_SIZE){
  if(!Number.isSafeInteger(index)||index<0||index>=total)throw RangeError('Resource index is outside listing');
  return pageWindow(total,Math.floor(index/size)*size,size);
}
