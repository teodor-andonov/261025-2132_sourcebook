// Optional outbound file handoff for browsers without writable Folder access.
// A successful Web Share promise does NOT verify that another app saved the file.
// No Catalog or ordinary source file is written by this module.
import {parseInternetShortcut} from './file-capture.mjs';
import {prepareSharedFiles} from './shared-files.mjs';

const CAPTURE_NAME=/^[\p{L}\p{N} ()_,.\-]+\.(url|md)$/iu;
export function makeCapturedShareFile(plan,{fileFactory=(parts,name,options)=>new File(parts,name,options)}={}){
  if(!plan||!['url','text'].includes(plan.kind)||typeof plan.name!=='string'||
    plan.name.length>90||!CAPTURE_NAME.test(plan.name)||typeof plan.text!=='string'||
    (plan.kind==='url'?(!plan.name.endsWith('.url')||!parseInternetShortcut(plan.text)):
      (!plan.name.endsWith('.md')||!plan.text.trim()||plan.text.length>1048577)))
    throw Error('Invalid physical capture plan; nothing was shared');
  return fileFactory([plan.text],plan.name,{type:plan.kind==='url'?'text/plain':'text/markdown'});
}
export function inspectFileShareCapability(env=globalThis){
  const nav=env.navigator||{};
  if(typeof nav.share!=='function'||typeof nav.canShare!=='function'||typeof env.File!=='function')
    return {available:false,reason:'File sharing API unavailable'};
  try{
    const file=new env.File(['test'],'sourcebook-capability.txt',{type:'text/plain'});
    return nav.canShare({files:[file]})===true?
      {available:true,reason:'Browser reports file-sharing support; destination unverified'}:
      {available:false,reason:'Browser does not report file-sharing support'};
  }catch{return {available:false,reason:'File-sharing capability check failed'};}
}
async function handoff(files,{env=globalThis}={}){
  const nav=env.navigator||{};
  if(!files.length||typeof nav.share!=='function'||typeof nav.canShare!=='function')
    throw Error('System file sharing is unavailable; use Download instead');
  // Do not fall back to sharing a URL/text-only payload: it would not transfer
  // the physical .url/.md file the user explicitly reviewed.
  let supported=false;
  try{supported=nav.canShare({files})===true;}catch{}
  if(!supported)throw Error('This browser cannot share these files; use Download instead');
  await nav.share({files});
  return {delivery:'system-share',verified:false,count:files.length};
}
export async function shareCapturedPlan(plan,{env=globalThis}={}){
  if(typeof env.File!=='function')throw Error('Browser File API unavailable');
  const file=makeCapturedShareFile(plan,{fileFactory:(parts,name,opts)=>new env.File(parts,name,opts)});
  return handoff([file],{env});
}
export async function shareIncomingFiles(files,{env=globalThis}={}){
  const selected=prepareSharedFiles(files).files;
  if(!selected.length)throw Error('No shared files selected');
  return handoff(selected,{env});
}
