// A Sourcebook resource always has a filesystem representation.
// URL and text captures are ordinary files, not Catalog-only resource rows.
import {normalizeCaptureURL} from './link-capture.mjs';
import {withPhysicalWriteLock} from './physical-write-lock.mjs';

const MAX_TEXT=1024*1024;
const safeLabel=value=>String(value||'').normalize('NFKC')
  .replace(/[^\p{L}\p{N} ()_,.\-]/gu,' ')
  .replace(/\s+/g,' ').replace(/^\.+|\.+$/g,'').trim().slice(0,65);
export function classifyPastedText(raw){
  if(typeof raw!=='string'||!raw.trim())throw Error('Nothing to capture');
  if(raw.length>MAX_TEXT)throw Error('Text capture exceeds 1 MiB; import it as a file instead');
  const value=raw.trim();
  if(!/\s/.test(value)&&/^https?:\/\//i.test(value)){
    // Invalid HTTP(S) URLs fail instead of being transformed into a fake shortcut.
    return {kind:'url',value:normalizeCaptureURL(value)};
  }
  return {kind:'text',value:raw};
}
export function planFileCapture(input,{now=new Date(),random=''}={}){
  if(!input||!['url','text'].includes(input.kind))throw Error('Unsupported file capture type');
  const stamp=new Date(now);
  if(!Number.isFinite(stamp.valueOf()))throw Error('Invalid capture timestamp');
  const suffix=String(random||'').replace(/[^a-z0-9]/gi,'').slice(0,12);
  if(suffix.length<6)throw Error('A unique capture suffix is required');
  const time=stamp.toISOString().replace(/[-:]/g,'').replace('T','-').slice(0,15);
  if(input.kind==='url'){
    const url=normalizeCaptureURL(input.value);
    const label=safeLabel(input.title||new URL(url).hostname)||'Link';
    return {kind:'url',name:label+'-'+time+'-'+suffix+'.url',
      text:'[InternetShortcut]\r\nURL='+url+'\r\n',type:'text/plain'};
  }
  if(typeof input.value!=='string'||!input.value.trim()||input.value.length>MAX_TEXT)
    throw Error('Text capture must contain 1–1048576 characters');
  const label=safeLabel(input.title||input.value.split(/\r?\n/)[0])||'Note';
  return {kind:'text',name:label+'-'+time+'-'+suffix+'.md',
    text:input.value.endsWith('\n')?input.value:input.value+'\n',type:'text/markdown'};
}
export function parseInternetShortcut(text){
  if(typeof text!=='string'||text.length>8192)return null;
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  if(!/^\[InternetShortcut\]$/i.test(lines[0]?.trim()||''))return null;
  let url=null,section='shortcut';
  for(const line of lines.slice(1)){
    if(/^\s*\[[^\]]+\]\s*$/u.test(line)){section='other';continue;}
    const match=/^\s*URL\s*=(.*)$/i.exec(line);
    if(!match)continue;
    if(section!=='shortcut'||url!==null)return null;
    try{url=normalizeCaptureURL(match[1]);}catch{return null;}
  }
  return url;
}
export async function writeCapturedFile(directory,plan){
  if(!directory||directory.kind!=='directory'||typeof directory.getFileHandle!=='function')
    throw Error('Choose a writable destination folder');
  if(!plan||!/^[\p{L}\p{N} ()_,.\-]+(?:\[[a-z]{1,4}[1-9][0-9]*\])?\.(url|md)$/iu.test(plan.name)||
    !['url','text'].includes(plan.kind)||typeof plan.text!=='string'||plan.name.length>90||
    (plan.kind==='url'?(!plan.name.endsWith('.url')||!parseInternetShortcut(plan.text)):
      (!plan.name.endsWith('.md')||plan.text.length>MAX_TEXT+1)))
    throw Error('Invalid file capture plan');
  return withPhysicalWriteLock(async()=>{
    // Refuse case-only collisions as well as exact matches. The provider must
    // support enumeration; no atomic create-exclusive operation is available.
    if(typeof directory.entries!=='function')throw Error('Cannot enumerate destination safely');
    let count=0;
    for await(const [name] of directory.entries()){
      if(++count>50000)throw Error('Destination too large for safe collision check');
      if(String(name).normalize('NFKC').toLocaleLowerCase()===plan.name.normalize('NFKC').toLocaleLowerCase())
        throw Error('Capture filename already exists (including case-only collision)');
    }
    // Browser File System Access has no atomic O_EXCL. A last-moment race remains.
    try{await directory.getFileHandle(plan.name);throw Error('Capture filename already exists; retry');}
    catch(error){if(error.name!=='NotFoundError')throw error;}
    const handle=await directory.getFileHandle(plan.name,{create:true});
    const existing=await handle.getFile();
    if(existing.size!==0)throw Error('Capture destination unexpectedly exists; it was not overwritten');
    let writable;
    try{
      writable=await handle.createWritable();
      await writable.write(plan.text);
      await writable.close();
    }catch(error){
      try{await writable?.abort();}catch{}
      throw Error('File capture failed; a partial new file may remain: '+error.message);
    }
    const saved=await (await handle.getFile()).text();
    if(saved!==plan.text)throw Error('Saved file differs from input; inspect destination before retrying');
    return {name:plan.name,kind:plan.kind,handle};
  });
}

/**
 * Explicit fallback for browsers without a writable Folder picker.
 * This requests a browser download, NOT a verified write to a selected
 * directory. The browser chooses the destination and collision naming.
 */
export function requestCapturedFileDownload(plan,{env=globalThis}={}){
  if(!plan||!['url','text'].includes(plan.kind)||
    typeof plan.name!=='string'||!(/^[\p{L}\p{N} ()_,.\-]+\.(url|md)$/iu.test(plan.name))||
    (plan.kind==='url'?(!plan.name.endsWith('.url')||!parseInternetShortcut(plan.text)):
      (!plan.name.endsWith('.md')||typeof plan.text!=='string'||plan.text.length>MAX_TEXT+1)))
    throw Error('Invalid download capture plan');
  const doc=env.document,api=env.URL;
  if(!doc?.createElement||!doc?.body||typeof api?.createObjectURL!=='function'||
    typeof api?.revokeObjectURL!=='function')throw Error('Browser download is unavailable');
  const blob=new Blob([plan.text],{type:plan.type||'text/plain'});
  const url=api.createObjectURL(blob);
  try{
    const anchor=doc.createElement('a');
    anchor.href=url;anchor.download=plan.name;anchor.style.display='none';
    doc.body.append(anchor);
    try{anchor.click();}finally{anchor.remove();}
  }catch(error){api.revokeObjectURL(url);throw error;}
  (env.setTimeout||setTimeout)(()=>api.revokeObjectURL(url),60000);
  return {name:plan.name,kind:plan.kind,delivery:'browser-download',verified:false};
}
