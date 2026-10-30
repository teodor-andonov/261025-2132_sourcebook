// Read-only file information and root-labelled relative paths.
// No absolute OS path is exposed by the browser, and no source files are written.
export const MAX_COPIED_PATHS=250;
export const MAX_COPIED_PATH_CHARS=65536;
function validSegment(value){
  return typeof value==='string'&&value.length>0&&value!=='.'&&value!=='..'&&
    !/[\\/\x00-\x1f\x7f]/.test(value);
}
export function resourceRelativePath(item,folderParts=[]){
  if(!item||!['file','directory'].includes(item.kind)||!validSegment(item.name))
    throw Error('Only ordinary filesystem Resources have relative paths');
  const parts=item.catalogResult||Array.isArray(item.parts)?item.parts:folderParts;
  if(!Array.isArray(parts)||parts.length>128||parts.some(part=>!validSegment(part)))
    throw Error('Invalid Resource parent Folder');
  const path=[...parts,item.name].join('/');
  if(path.length>4096)throw Error('Resource path is too long to copy');
  return path;
}
export function resourceDisplayPath(item,{folderParts=[],rootName=''}={}){
  const relative=resourceRelativePath(item,folderParts);
  const root=item.catalogResult||Array.isArray(item.parts)?item.sourceName:rootName;
  if(!validSegment(root))throw Error('Resource Folder name is unavailable');
  return root+'/'+relative;
}
export function selectedResourcePaths(items,selected,{folderParts=[],rootName=''}={}){
  if(!Array.isArray(items)||!(selected instanceof Set)||selected.size<1||
    selected.size>MAX_COPIED_PATHS)throw Error('Select 1–250 filesystem Resources');
  const found=new Set(),paths=[];
  for(const item of items){
    if(!selected.has(item?.id))continue;
    if(found.has(item.id))throw Error('Duplicate selected Resource');
    found.add(item.id);
    paths.push(resourceDisplayPath(item,{folderParts,rootName}));
  }
  if(found.size!==selected.size)throw Error('Selection changed; select Resources again');
  const value=paths.join('\n');
  if(value.length>MAX_COPIED_PATH_CHARS)throw Error('Selected paths exceed clipboard safety limit');
  return value;
}
export function formatFileSize(size){
  if(!Number.isSafeInteger(size)||size<0)throw Error('Invalid file size');
  if(size<1024)return size+' B';
  const units=['KiB','MiB','GiB','TiB'];
  let value=size,unit=-1;
  do{value/=1024;unit++;}while(value>=1024&&unit<units.length-1);
  return value.toLocaleString('en-US',{maximumFractionDigits:1})+' '+units[unit];
}
export async function readResourceFileMetadata(handle){
  if(handle?.kind!=='file'||typeof handle.getFile!=='function')throw Error('A readable file handle is required');
  const file=await handle.getFile(); // metadata only; never reads file bytes
  if(!file||!Number.isSafeInteger(file.size)||file.size<0||
    !Number.isFinite(file.lastModified)||file.lastModified<0)
    throw Error('File provider returned invalid metadata');
  return {size:file.size,lastModified:file.lastModified,
    type:typeof file.type==='string'?file.type:''};
}
