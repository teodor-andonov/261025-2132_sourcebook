// Explicit M0 provider exercise: ordinary .url and .md files in a new disposable Folder.
// This is a manual real-device diagnostic, never an automatic acceptance result.
// No source file is touched, no Catalog metadata is written and no fixture is auto-deleted.
import {planFileCapture,writeCapturedFile} from './file-capture.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const FOLDER=/^Sourcebook-M0-Capture-([a-f0-9-]{36})$/i;
const STAMP='2026-10-28T00:00:00.000Z';
const folderName=id=>'Sourcebook-M0-Capture-'+id;
const blank=()=>({status:'not-run',permission:'unknown',created:false,urlVerified:false,textVerified:false,cleanupRequired:false,fixtureProof:''});
const errorStatus=error=>error?.name==='AbortError'?'cancelled':error?.name==='NotAllowedError'?'denied':'error';
const plans=id=>{
  const opts={now:new Date(STAMP),random:id.replaceAll('-','').slice(0,12)};
  return [
    planFileCapture({kind:'url',value:'https://example.org/sourcebook-m0-capture/'+id,title:'M0 link'},opts),
    planFileCapture({kind:'text',value:'# Sourcebook M0 capture\n\nDisposable fixture '+id+'\n',title:'M0 text'},opts)
  ];
};
async function permission(handle,mode){
  if(typeof handle?.queryPermission!=='function')return 'unavailable';
  try{
    const result=await handle.queryPermission({mode});
    return ['granted','prompt','denied'].includes(result)?result:'unknown';
  }catch{return 'unknown';}
}
async function fingerprint(id){
  if(!globalThis.crypto?.subtle)return '';
  const data=new TextEncoder().encode('sourcebook-m0-capture-v1:'+id);
  const digest=await globalThis.crypto.subtle.digest('SHA-256',data);
  return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
export function normalizeCaptureProbe(value){
  const p=value&&typeof value==='object'?value:{};
  return {
    status:['not-run','ok','unsupported','cancelled','denied','error','not-empty','collision','invalid'].includes(p.status)?p.status:'not-run',
    permission:['unknown','unavailable','granted','prompt','denied'].includes(p.permission)?p.permission:'unknown',
    created:p.created===true,urlVerified:p.urlVerified===true,textVerified:p.textVerified===true,
    cleanupRequired:p.cleanupRequired===true,
    fixtureProof:typeof p.fixtureProof==='string'&&/^[a-f0-9]{64}$/.test(p.fixtureProof)?p.fixtureProof:''
  };
}
async function inspectFixture(dir,id){
  if(!dir||dir.kind!=='directory'||typeof dir.entries!=='function'||typeof dir.getFileHandle!=='function')
    throw Error('unsupported');
  const expected=plans(id),found=[];
  for await(const [name,handle] of dir.entries()){
    if(found.length>=3)throw Error('invalid');
    found.push([name,handle?.kind]);
  }
  if(found.length!==2||expected.some(p=>!found.some(([name,kind])=>name===p.name&&kind==='file')))
    throw Error('invalid');
  const verified=[];
  for(const plan of expected){
    const file=await (await dir.getFileHandle(plan.name)).getFile();
    if(typeof file?.text!=='function'||await file.text()!==plan.text)throw Error('invalid');
    verified.push(true);
  }
  return {urlVerified:verified[0],textVerified:verified[1]};
}
// The picker must point at the new fixture Folder itself, not its parent.
// Inspection is read-only and does not regrant permission or modify files.
export async function verifyM0CaptureFixture(picker){
  if(typeof picker!=='function')return {...blank(),status:'unsupported'};
  let dir;
  try{dir=await picker({mode:'read'});}
  catch(error){return {...blank(),status:errorStatus(error)};}
  const id=FOLDER.exec(dir?.name||'')?.[1];
  if(!UUID.test(id||''))return {...blank(),status:'invalid'};
  const grant=await permission(dir,'read');
  if(grant!=='granted')return {...blank(),status:grant==='denied'?'denied':'unsupported',permission:grant};
  try{
    const checked=await inspectFixture(dir,id);
    return {...blank(),status:'ok',permission:grant,...checked,fixtureProof:await fingerprint(id)};
  }catch(error){return {...blank(),status:error?.message==='unsupported'?'unsupported':error?.message==='invalid'?'invalid':'error',permission:grant};}
}
// Requires an explicit user confirmation before the picker. Parent MUST be empty.
// A newly created child is deliberately retained for restart and Syncthing checks.
export async function createM0CaptureFixture(picker,{confirmed=false,randomUUID=globalThis.crypto?.randomUUID?.bind(globalThis.crypto)}={}){
  if(!confirmed)return {...blank()};
  if(typeof picker!=='function'||typeof randomUUID!=='function')return {...blank(),status:'unsupported'};
  let parent;
  try{parent=await picker({mode:'readwrite'});}
  catch(error){return {...blank(),status:errorStatus(error)};}
  if(!parent||parent.kind!=='directory'||typeof parent.values!=='function'||typeof parent.getDirectoryHandle!=='function')
    return {...blank(),status:'unsupported'};
  const grant=await permission(parent,'readwrite');
  if(grant!=='granted')return {...blank(),status:grant==='denied'?'denied':'unsupported',permission:grant};
  try{for await(const _ of parent.values())return {...blank(),status:'not-empty',permission:grant};}
  catch{return {...blank(),status:'error',permission:grant};}
  const id=randomUUID();
  if(!UUID.test(id||''))return {...blank(),status:'error',permission:grant};
  const name=folderName(id);
  try{
    // A preexisting name must never be opened and written into.
    try{await parent.getDirectoryHandle(name);return {...blank(),status:'collision',permission:grant};}
    catch(error){if(error?.name!=='NotFoundError')throw error;}
    const dir=await parent.getDirectoryHandle(name,{create:true});
    const result={...blank(),status:'error',permission:grant,created:true,cleanupRequired:true,fixtureName:name};
    try{
      for(const plan of plans(id))await writeCapturedFile(dir,plan);
      const checked=await inspectFixture(dir,id);
      return {...result,status:'ok',...checked,cleanupRequired:false,fixtureProof:await fingerprint(id)};
    }catch{return result;}
  }catch{return {...blank(),status:'error',permission:grant,cleanupRequired:true,fixtureName:name};}
}
