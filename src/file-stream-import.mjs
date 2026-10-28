// Bounded-memory copy and byte-for-byte readback for large ordinary files.
// FileSystemWritableFileStream does not provide atomic exclusive creation.
// This helper never deletes a failed/partial destination; the caller reports it.
export const STREAM_CHUNK_BYTES=1024*1024;
const abortIfRequested=signal=>{
  if(signal?.aborted)throw Error('Import cancelled; inspect the destination before retrying');
};
const notify=(callback,phase,bytes,size)=>{
  try{callback?.({phase,bytes,size});}catch{/* UI callbacks cannot change filesystem safety. */}
};
export async function copyAndVerifyStreamedFile(handle,file,{signal,onProgress,chunkBytes=STREAM_CHUNK_BYTES}={}){
  if(!handle||typeof handle.createWritable!=='function'||typeof handle.getFile!=='function'||
    !file||!Number.isSafeInteger(file.size)||file.size<0||
    typeof file.slice!=='function'||!Number.isSafeInteger(chunkBytes)||
    chunkBytes<1024||chunkBytes>4*1024*1024)
    throw Error('Streaming copy requires a readable File, writable Folder provider and bounded chunk size');
  const size=file.size,modified=file.lastModified;
  abortIfRequested(signal);
  let writable;
  try{
    writable=await handle.createWritable();
    for(let offset=0;offset<size;offset+=chunkBytes){
      abortIfRequested(signal);
      const end=Math.min(size,offset+chunkBytes);
      const bytes=new Uint8Array(await file.slice(offset,end).arrayBuffer());
      if(bytes.byteLength!==end-offset)throw Error('Source changed or returned a short read');
      abortIfRequested(signal);
      await writable.write(bytes);
      notify(onProgress,'copy',end,size);
    }
    abortIfRequested(signal);
    await writable.close();
    writable=null;
  }catch(error){
    try{await writable?.abort();}catch{/* Provider may retain a partial file. */}
    throw Error('Streaming write stopped; partial file may remain: '+error.message);
  }
  abortIfRequested(signal);
  const written=await handle.getFile();
  if(written.size!==size)throw Error('Readback size differs; inspect destination file');
  for(let offset=0;offset<size;offset+=chunkBytes){
    abortIfRequested(signal);
    const end=Math.min(size,offset+chunkBytes);
    const [source,destination]=await Promise.all([
      file.slice(offset,end).arrayBuffer(),
      written.slice(offset,end).arrayBuffer()
    ]);
    const a=new Uint8Array(source),b=new Uint8Array(destination);
    if(a.length!==end-offset||b.length!==a.length)
      throw Error('Readback chunk size differs; inspect destination file');
    for(let i=0;i<a.length;i++){
      if(a[i]!==b[i])throw Error('Readback bytes differ; inspect destination file');
    }
    notify(onProgress,'verify',end,size);
  }
  if(file.size!==size||(modified!==undefined&&file.lastModified!==modified))
    throw Error('Source file changed during verification; inspect destination file');
  abortIfRequested(signal);
  return {name:file.name,size,verification:'bytewise',sha256:null};
}
