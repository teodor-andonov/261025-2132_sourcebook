// Read-only filename/type discovery for physical Folder Tabs. No Catalog mutation.
export const FOLDER_FILE_TYPES=Object.freeze([
  ['all','All types'],['folder','Folders'],['image','Images'],['pdf','PDFs'],
  ['video','Videos'],['audio','Audio'],['url','Links'],['text','Text / code'],
  ['archive','Archives'],['other','Other']
]);
const VALID_TYPES=new Set(FOLDER_FILE_TYPES.map(([type])=>type));
export function folderFileType(item){
  if(item?.kind==='directory')return 'folder';
  if(item?.kind!=='file')return 'other';
  const name=String(item.name||'').toLocaleLowerCase();
  if(name.endsWith('.url'))return 'url';
  if(/\.(jpe?g|png|webp|gif|avif|bmp|svg|tiff?)$/.test(name))return 'image';
  if(name.endsWith('.pdf'))return 'pdf';
  if(/\.(mp4|mov|webm|mkv|avi|m4v)$/.test(name))return 'video';
  if(/\.(mp3|wav|flac|ogg|opus|m4a|aac)$/.test(name))return 'audio';
  if(/\.(md|markdown|txt|csv|tsv|json|jsonl|ya?ml|xml|html?|css|js|mjs|cjs|ts|tsx|jsx|py|rb|rs|go|java|c|cc|cpp|h|hpp|sh|sql|ini|toml|log)$/.test(name))return 'text';
  if(/\.(zip|7z|rar|tar|gz|bz2|xz|zst|tgz)$/.test(name))return 'archive';
  return 'other';
}
export function filterFolderEntries(items,{query='',fileType='all',showHidden=true,nameOf=item=>item.name}={}){
  if(!Array.isArray(items)||typeof query!=='string'||!VALID_TYPES.has(fileType)||
    typeof showHidden!=='boolean'||typeof nameOf!=='function')throw TypeError('Invalid Folder filter');
  const needle=query.trim().toLocaleLowerCase();
  return items.filter(item=>{
    if(!item||typeof item.name!=='string')return false;
    if(!showHidden&&item.name.startsWith('.'))return false;
    if(fileType!=='all'&&folderFileType(item)!==fileType)return false;
    return !needle||String(nameOf(item)).toLocaleLowerCase().includes(needle);
  });
}
