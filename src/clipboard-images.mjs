// Image clipboard intake: temporary, in-memory Files for explicit import review.
// No IndexedDB, Catalog or ordinary filesystem writes happen in this module.
// PNG/JPEG/WebP/GIF only; SVG and unknown image types are deliberately refused.
export const MAX_CLIPBOARD_IMAGE_FILES=10;
export const MAX_CLIPBOARD_IMAGE_BYTES=25*1024*1024;
export const MAX_CLIPBOARD_IMAGE_TOTAL_BYTES=50*1024*1024;
const FORMATS=new Map([['image/png','png'],['image/jpeg','jpg'],['image/webp','webp'],['image/gif','gif']]);
const format=type=>String(type||'').toLowerCase();

export function collectPastedImageBlobs(data){
  const files=Array.from(data?.files||[]).filter(file=>format(file?.type).startsWith('image/'));
  if(files.length)return files;
  return Array.from(data?.items||[])
    .filter(item=>item?.kind==='file'&&format(item.type).startsWith('image/'))
    .map(item=>item.getAsFile?.()).filter(Boolean);
}

export function prepareClipboardImages(blobs,{
  now=new Date(),idFactory=()=>globalThis.crypto.randomUUID(),
  fileFactory=(parts,name,options)=>new File(parts,name,options)
}={}){
  const selected=Array.from(blobs||[]);
  if(!selected.length||selected.length>MAX_CLIPBOARD_IMAGE_FILES)
    throw Error('Select 1–'+MAX_CLIPBOARD_IMAGE_FILES+' clipboard images');
  const date=new Date(now);
  if(!Number.isFinite(date.valueOf()))throw Error('Invalid clipboard timestamp');
  const token=String(idFactory()).replace(/-/g,'');
  if(!/^[a-z0-9]{8,32}$/i.test(token))throw Error('Invalid clipboard image identity');
  let total=0;
  for(const blob of selected){
    const type=format(blob?.type);
    if(!FORMATS.has(type))throw Error('Unsupported clipboard image format; use PNG, JPEG, WebP or GIF');
    if(!Number.isSafeInteger(blob.size)||blob.size<=0||blob.size>MAX_CLIPBOARD_IMAGE_BYTES||
      typeof blob.arrayBuffer!=='function')
      throw Error('Clipboard image must be a readable nonempty Blob no larger than 25 MiB');
    total+=blob.size;
  }
  if(total>MAX_CLIPBOARD_IMAGE_TOTAL_BYTES)throw Error('Clipboard images exceed the 50 MiB limit');
  const stamp=date.toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15);
  return selected.map((blob,index)=>{
    const type=format(blob.type),name='Clipboard-'+stamp+'-'+token+'-'+(index+1)+'.'+FORMATS.get(type);
    return fileFactory([blob],name,{type,lastModified:date.valueOf()});
  });
}

export async function readClipboardImages(clipboard=globalThis.navigator?.clipboard,options={}){
  if(typeof clipboard?.read!=='function')throw Error('Clipboard image read is unavailable; paste an image into a Folder or choose Add files');
  const items=await clipboard.read();
  if(!items?.length)throw Error('Clipboard has no image');
  const selections=[];
  for(const item of items){
    const types=Array.from(item.types||[]).map(format);
    const type=[...FORMATS.keys()].find(candidate=>types.includes(candidate));
    if(type)selections.push({item,type});
    else if(types.some(t=>t.startsWith('image/')))
      throw Error('Unsupported clipboard image format; use PNG, JPEG, WebP or GIF');
  }
  if(!selections.length)throw Error('Clipboard has no supported image; use text capture instead');
  if(selections.length>MAX_CLIPBOARD_IMAGE_FILES)throw Error('Too many clipboard images');
  const blobs=[];
  for(const {item,type} of selections){
    if(typeof item.getType!=='function')throw Error('Clipboard image cannot be read');
    blobs.push(await item.getType(type));
  }
  return prepareClipboardImages(blobs,options);
}
