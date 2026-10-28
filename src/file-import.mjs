// Explicit import of ordinary files into a user-granted physical Folder.
// Never rename, replace, or objectify source files; Catalog metadata is untouched.
import {copyAndVerifyStreamedFile} from './file-stream-import.mjs';
export const MAX_IMPORT_FILES=10;
export const MAX_IMPORT_FILE_BYTES=512*1024*1024;
export const MAX_IMPORT_TOTAL_BYTES=1024*1024*1024;
export const STREAM_IMPORT_THRESHOLD=25*1024*1024;
const MAX_SCAN_ENTRIES=50000;
const fold=name=>name.normalize('NFKC').toLocaleLowerCase();
const WINDOWS_RESERVED=/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
export function planOrdinaryFileImport(files){
  const selected=Array.from(files||[]);
  if(!selected.length||selected.length>MAX_IMPORT_FILES)
    throw Error('Select 1–'+MAX_IMPORT_FILES+' files');
  let totalBytes=0;
  const names=new Set();
  const items=selected.map(file=>{
    const name=file?.name;
    if(typeof name!=='string'||!name||name!==name.normalize('NFC')||
      name.length>180||new TextEncoder().encode(name).length>240||
      /^[.]/u.test(name)||/[. ]$/u.test(name)||WINDOWS_RESERVED.test(name)||
      /[\/\\<>:"|?*\u0000-\u001f\u007f]/u.test(name)||
      !Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_IMPORT_FILE_BYTES||
      typeof file.arrayBuffer!=='function'||
      (file.size>STREAM_IMPORT_THRESHOLD&&typeof file.slice!=='function'))
      throw Error('Unsupported file name or size: '+String(name||'(unnamed)').slice(0,60));
    const key=fold(name);
    if(names.has(key))throw Error('Selected files have colliding names (including case-only variants)');
    names.add(key);totalBytes+=file.size;
    return {name,size:file.size,file};
  });
  if(totalBytes>MAX_IMPORT_TOTAL_BYTES)throw Error('Selected files exceed the 1 GiB batch limit');
  return {items,totalBytes};
}
export async function assertImportDestinationAvailable(directory,items){
  if(directory?.kind!=='directory'||typeof directory.entries!=='function'||
    typeof directory.getFileHandle!=='function')
    throw Error('Destination Folder cannot be safely enumerated or written');
  const expected=new Set(items.map(item=>fold(item.name)));
  let count=0;
  for await(const [name] of directory.entries()){
    if(++count>MAX_SCAN_ENTRIES)throw Error('Destination has too many entries for a safe collision check');
    if(expected.has(fold(String(name))))throw Error('Destination already contains '+name+'; no file was overwritten');
  }
}
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function importOrdinaryFiles(directory,files,{cryptoApi=globalThis.crypto,signal,onProgress}={}){
  const plan=planOrdinaryFileImport(files);
  if(plan.items.some(item=>item.size<=STREAM_IMPORT_THRESHOLD)&&typeof cryptoApi?.subtle?.digest!=='function')
    throw Error('SHA-256 verification is unavailable; no files were written');
  await assertImportDestinationAvailable(directory,plan.items);
  const saved=[];
  const abortIfRequested=()=>{if(signal?.aborted)throw Error('Import cancelled; inspect destination before retrying');};
  const report=(event)=>{try{onProgress?.({...event,fileIndex:Math.min(saved.length+(event.phase==='done'?0:1),plan.items.length),fileCount:plan.items.length});}catch{}};
  for(const item of plan.items){
    try{
      // Recheck before each write: another tab/provider may have added a file.
      abortIfRequested();
      await assertImportDestinationAvailable(directory,[item]);
      // A second existence check narrows (but cannot eliminate) the empty-file race.
      try{await directory.getFileHandle(item.name);throw Error('Destination filename already exists; no overwrite attempted');}
      catch(error){if(error.name!=='NotFoundError')throw error;}
      if(item.size>STREAM_IMPORT_THRESHOLD){
        const handle=await directory.getFileHandle(item.name,{create:true});
        if((await handle.getFile()).size!==0)throw Error('Destination unexpectedly contains data; no overwrite attempted');
        const result=await copyAndVerifyStreamedFile(handle,item.file,{signal,onProgress:event=>report({...event,name:item.name})});
        saved.push(result);
        report({phase:'done',name:item.name,bytes:item.size,size:item.size});
        continue;
      }
      const original=await item.file.arrayBuffer();
      if(original.byteLength!==item.size)throw Error('Selected file changed before import');
      const expected=hex(await cryptoApi.subtle.digest('SHA-256',original));
      abortIfRequested();
      const handle=await directory.getFileHandle(item.name,{create:true});
      if((await handle.getFile()).size!==0)
        throw Error('Destination unexpectedly contains data; no overwrite attempted');
      let writable;
      try{
        writable=await handle.createWritable();
        abortIfRequested();
        await writable.write(new Uint8Array(original));
        await writable.close();
      }catch(error){
        try{await writable?.abort();}catch{}
        throw Error('Write failed; partial file may remain: '+error.message);
      }
      const verified=await (await handle.getFile()).arrayBuffer();
      if(verified.byteLength!==original.byteLength||
        hex(await cryptoApi.subtle.digest('SHA-256',verified))!==expected)
        throw Error('Readback checksum differs; inspect file');
      abortIfRequested();
      saved.push({name:item.name,size:item.size,sha256:expected,verification:'sha256'});
      report({phase:'done',name:item.name,bytes:item.size,size:item.size});
    }catch(error){
      throw Error('Import stopped after '+saved.length+'/'+plan.items.length+
        ' verified files. Inspect '+item.name+' and destination before retrying; a partial file may remain. '+error.message);
    }
  }
  return {saved,totalBytes:plan.totalBytes,verified:true};
}
