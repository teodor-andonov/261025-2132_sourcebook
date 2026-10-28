// Android Web Share Target file attachments are temporary device-local inbox items.
// They become durable Resources only after an explicit, verified physical Folder copy.
import {planOrdinaryFileImport} from './file-import.mjs';

export const MAX_SHARED_FILES=5;
export const MAX_SHARED_FILE_BYTES=25*1024*1024;
export const MAX_SHARED_TOTAL_BYTES=50*1024*1024;
const MIME=/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

function checkType(type){
  if(typeof type!=='string'||type.length>120||(type&&!MIME.test(type)))
    throw Error('Unsupported shared file content type');
  return type;
}
export function validateSharedFileDescriptors(descriptors){
  if(!Array.isArray(descriptors)||descriptors.length>MAX_SHARED_FILES)
    throw Error('Too many shared files');
  if(!descriptors.length)return [];
  const names=new Set();let total=0;
  return descriptors.map(d=>{
    if(!d||typeof d!=='object'||!Number.isSafeInteger(d.size)||d.size<=0||d.size>MAX_SHARED_FILE_BYTES)
      throw Error('Shared file must be nonempty and no larger than 25 MiB');
    const name=d.name;
    // Apply the same cross-platform filename policy as reviewed ordinary-file imports.
    planOrdinaryFileImport([{name,size:d.size,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(0)),slice:()=>{}}]);
    const key=name.normalize('NFKC').toLocaleLowerCase();
    if(names.has(key))throw Error('Shared files contain colliding names');
    names.add(key);
    total+=d.size;
    if(total>MAX_SHARED_TOTAL_BYTES)throw Error('Shared files exceed the 50 MiB temporary inbox limit');
    const type=checkType(d.type);
    if(d.sha256!==undefined&&(typeof d.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(d.sha256)))
      throw Error('Invalid shared file checksum');
    return d.sha256===undefined?{name,size:d.size,type}:{name,size:d.size,type,sha256:d.sha256};
  });
}
export function prepareSharedFiles(files){
  const selected=Array.from(files||[]);
  if(!selected.length)return {files:[],descriptors:[]};
  const descriptors=validateSharedFileDescriptors(selected.map(f=>({name:f?.name,size:f?.size,type:f?.type||''})));
  for(const file of selected){
    if(typeof file?.arrayBuffer!=='function'||typeof file?.slice!=='function')
      throw Error('Shared file is not a readable browser File');
  }
  return {files:selected,descriptors};
}
// SHA-256 is computed before IndexedDB staging, then checked again before review/download.
// Legacy v2 inbox entries without a digest remain readable, but are not integrity-attested.
const digestHex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function fingerprintSharedFiles(files,{cryptoApi=globalThis.crypto}={}){
  const prepared=prepareSharedFiles(files);
  if(!prepared.files.length)return prepared;
  if(typeof cryptoApi?.subtle?.digest!=='function')throw Error('SHA-256 unavailable; share not staged');
  const descriptors=[];
  for(let i=0;i<prepared.files.length;i++){
    const bytes=await prepared.files[i].arrayBuffer();
    if(bytes.byteLength!==prepared.descriptors[i].size)throw Error('Shared file changed during intake');
    descriptors.push({...prepared.descriptors[i],sha256:digestHex(await cryptoApi.subtle.digest('SHA-256',bytes))});
  }
  return {files:prepared.files,descriptors};
}
export async function verifySharedFileIntegrity(blobs,descriptors,{cryptoApi=globalThis.crypto,fileFactory}={}){
  const meta=validateSharedFileDescriptors(descriptors);
  if(!Array.isArray(blobs)||blobs.length!==meta.length)throw Error('Shared file payload is missing or damaged');
  for(let i=0;i<meta.length;i++){
    const item=meta[i],blob=blobs[i];
    if(!blob||blob.size!==item.size||blob.type!==item.type||typeof blob.arrayBuffer!=='function')
      throw Error('Shared file payload differs from its metadata');
    if(item.sha256){
      if(typeof cryptoApi?.subtle?.digest!=='function')throw Error('SHA-256 unavailable; cannot verify staged file');
      const bytes=await blob.arrayBuffer();
      if(bytes.byteLength!==item.size||digestHex(await cryptoApi.subtle.digest('SHA-256',bytes))!==item.sha256)
        throw Error('Staged file checksum mismatch; keep the share for inspection');
    }
  }
  return restoreSharedFiles(blobs,meta,fileFactory?{fileFactory}:{});
}
export function restoreSharedFiles(blobs,descriptors,{fileFactory=(parts,name,opts)=>new File(parts,name,opts)}={}){
  const meta=validateSharedFileDescriptors(descriptors);
  if(!Array.isArray(blobs)||blobs.length!==meta.length)throw Error('Shared file payload is missing or damaged');
  return meta.map((d,i)=>{
    const blob=blobs[i];
    if(!blob||blob.size!==d.size||blob.type!==d.type||typeof blob.arrayBuffer!=='function')
      throw Error('Shared file payload differs from its metadata');
    return fileFactory([blob],d.name,{type:d.type});
  });
}
// Browser-managed downloads are not verified Folder writes and cannot clear staging.
export function requestSharedFileDownload(file,{env=globalThis}={}){
  const {files}=prepareSharedFiles([file]);
  const doc=env.document,api=env.URL;
  if(!doc?.createElement||!doc?.body||typeof api?.createObjectURL!=='function'||
    typeof api?.revokeObjectURL!=='function')throw Error('Browser file download is unavailable');
  const url=api.createObjectURL(files[0]);
  try{
    const anchor=doc.createElement('a');
    anchor.href=url;anchor.download=file.name;anchor.style.display='none';
    doc.body.append(anchor);
    try{anchor.click();}finally{anchor.remove();}
  }catch(error){api.revokeObjectURL(url);throw error;}
  (env.setTimeout||setTimeout)(()=>api.revokeObjectURL(url),60000);
  return {name:file.name,delivery:'browser-download',verified:false};
}
