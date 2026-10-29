// Read-only previews of ordinary filesystem Resources. No page fetch or Catalog writes.
import {parseInternetShortcut} from './file-capture.mjs';
export const MAX_SHORTCUT_BYTES=8192;
export const MAX_TEXT_PREVIEW_BYTES=200000;
export async function readPhysicalShortcut(file){
  if(!file||!Number.isSafeInteger(file.size)||file.size<0||typeof file.text!=='function')
    throw Error('A readable shortcut file is required');
  if(file.size>MAX_SHORTCUT_BYTES)return {status:'invalid',reason:'Shortcut exceeds the 8 KiB preview limit'};
  const url=parseInternetShortcut(await file.text());
  return url?{status:'ok',url}:{status:'invalid',reason:'Not a valid HTTP(S) Internet Shortcut'};
}
export async function readPhysicalTextPreview(file,{limit=MAX_TEXT_PREVIEW_BYTES}={}){
  if(!file||!Number.isSafeInteger(file.size)||file.size<0||typeof file.slice!=='function'||
    !Number.isSafeInteger(limit)||limit<1||limit>MAX_TEXT_PREVIEW_BYTES)
    throw Error('Invalid bounded text preview request');
  const text=await file.slice(0,limit).text();
  return {text,truncated:file.size>limit};
}
