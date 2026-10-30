// M0 acceptance aids. These probes never touch ordinary source Folders.
// Creating a portable fixture requires explicit consent and an EMPTY disposable parent.
// The fixture is intentionally retained for restart/Syncthing testing; no automatic deletion.
import {readJson,writeJson} from './storage.mjs';
import {commitCatalogTransaction} from './catalog-transactions.mjs';
import {planFileCapture,parseInternetShortcut,writeCapturedFile} from './file-capture.mjs';
import {ensureTagPath,tagPath} from './tags.mjs';
import {validateViews} from './views.mjs';
import {catalogQueryResults} from './catalog-search.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const FIXTURE_VERSION=2;
const nameFor=id=>'Sourcebook-M0-'+id+'.sb';
async function fixtureFingerprint(id){
  // Hash only the synthetic UUID, never an ordinary file path or Catalog content.
  // A matching hash is evidence of matching fixture identity, NOT proof of sync.
  if(!globalThis.crypto?.subtle)return '';
  const bytes=new TextEncoder().encode('sourcebook-m0-fixture-v1:'+id);
  const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
const urlFor=id=>'https://example.org/sourcebook-m0/'+id;
const sourceId='m0-source';
const fixtureFilePlan=(id,timestamp)=>planFileCapture({kind:'url',value:urlFor(id),title:'sourcebook-m0'},
  {now:new Date(timestamp),random:id.replaceAll('-','').slice(0,10)});
const blank=()=>({status:'not-run',permission:'unknown',catalogCreated:false,transactionVerified:false,portableVerified:false,journalClear:false,cleanupRequired:false});
const failure=error=>error?.name==='AbortError'?'cancelled':error?.name==='NotAllowedError'?'denied':'error';
const invalid=()=>{throw Error('invalid-m0-fixture');};
async function grant(handle,mode){
  if(typeof handle?.queryPermission!=='function')return 'unavailable';
  try{const result=await handle.queryPermission({mode});return ['granted','prompt','denied'].includes(result)?result:'unknown';}
  catch{return 'unknown';}
}
export function normalizePortableProbe(value){
  const p=value&&typeof value==='object'?value:{};
  return {
    status:['not-run','ok','unsupported','cancelled','denied','error','not-empty','collision','invalid'].includes(p.status)?p.status:'not-run',
    permission:['unknown','unavailable','granted','prompt','denied'].includes(p.permission)?p.permission:'unknown',
    catalogCreated:p.catalogCreated===true,transactionVerified:p.transactionVerified===true,
    portableVerified:p.portableVerified===true,journalClear:p.journalClear===true,
    cleanupRequired:p.cleanupRequired===true,
    fixtureProof:typeof p.fixtureProof==='string'&&/^[a-f0-9]{64}$/.test(p.fixtureProof)?p.fixtureProof:''
  };
}
export function normalizeOfflineProbe(value){
  const p=value&&typeof value==='object'?value:{};
  return {status:['not-run','cached','inactive','missing','unsupported','error'].includes(p.status)?p.status:'not-run',
    controllerActive:p.controllerActive===true,shellCached:p.shellCached===true,appModuleCached:p.appModuleCached===true};
}
async function verifyHandle(dir){
  const catalog=await readJson(dir,'catalog.json');
  const id=catalog?.m0Fixture?.id;
  if(!UUID.test(id||'')||catalog.m0Fixture.version!==FIXTURE_VERSION||
     catalog.id!==id||catalog.code!=='mt'||catalog.nextSequence!==2||
     dir.name!==nameFor(id))invalid();
  if(await readJson(dir,'.sourcebook-pending.json',null)!==null)invalid();
  const sources=await readJson(dir,'sources.json'),tags=await readJson(dir,'tags.json');
  const views=validateViews(await readJson(dir,'views.json'));
  const resources=await dir.getDirectoryHandle('resources');
  const record=await readJson(resources,'mt1.json');
  const plan=fixtureFilePlan(id,catalog.createdAt);
  if(!Array.isArray(sources)||sources.length!==1||sources[0].id!==sourceId||
     !Array.isArray(tags)||tags.length!==2||views.length!==1||record.id!=='mt1'||
     record.kind!=='file'||record.sourceId!==sourceId||record.path!==plan.name||
     record.notes!=='Disposable cross-device verification record'||
     record.tagIds.length!==1||tagPath(tags,record.tagIds[0])!=='M0 / Portable'||
     views[0].name!=='M0 portable shortcuts'||views[0].fileType!=='url'||
     views[0].tagIds.length!==1||views[0].tagIds[0]!==record.tagIds[0])invalid();
  const source=await dir.getDirectoryHandle('source-files');
  const shortcut=await source.getFileHandle(plan.name);
  if(parseInternetShortcut(await (await shortcut.getFile()).text())!==urlFor(id))invalid();
  const found=catalogQueryResults([record],sources,tags,views[0]);
  if(found.length!==1||found[0].record.id!=='mt1')invalid();
  return id;
}
export async function verifyM0PortableCatalogFixture(picker){
  if(typeof picker!=='function')return {...blank(),status:'unsupported'};
  let dir;
  try{dir=await picker({mode:'read'});}
  catch(error){return {...blank(),status:failure(error)};}
  if(!dir||dir.kind!=='directory')return {...blank(),status:'unsupported'};
  const permission=await grant(dir,'read');
  if(permission!=='granted')return {...blank(),status:permission==='denied'?'denied':'unsupported',permission};
  try{
    const id=await verifyHandle(dir);
    return {...blank(),status:'ok',permission,portableVerified:true,journalClear:true,fixtureProof:await fixtureFingerprint(id)};
  }catch(error){return {...blank(),status:error?.message==='invalid-m0-fixture'?'invalid':'error',permission};}
}
export async function createM0PortableCatalogFixture(picker,{confirmed=false,randomUUID=globalThis.crypto?.randomUUID?.bind(globalThis.crypto),now=()=>new Date().toISOString()}={}){
  if(!confirmed)return {...blank(),status:'not-run'};
  if(typeof picker!=='function'||typeof randomUUID!=='function')return {...blank(),status:'unsupported'};
  let parent;
  try{parent=await picker({mode:'readwrite'});}
  catch(error){return {...blank(),status:failure(error)};}
  if(!parent||parent.kind!=='directory'||typeof parent.values!=='function'||
     typeof parent.getDirectoryHandle!=='function')return {...blank(),status:'unsupported'};
  const permission=await grant(parent,'readwrite');
  if(permission!=='granted')return {...blank(),status:permission==='denied'?'denied':'unsupported',permission};
  try{for await(const _entry of parent.values())return {...blank(),status:'not-empty',permission};}
  catch{return {...blank(),status:'error',permission};}
  const id=randomUUID(),timestamp=now();
  if(!UUID.test(id)||!Number.isFinite(Date.parse(timestamp)))return {...blank(),status:'error',permission};
  const fixtureName=nameFor(id);
  try{await parent.getDirectoryHandle(fixtureName);return {...blank(),status:'collision',permission};}
  catch(error){if(error?.name!=='NotFoundError')return {...blank(),status:'error',permission};}
  let created=false,transactionVerified=false;
  try{
    const dir=await parent.getDirectoryHandle(fixtureName,{create:true});
    created=true;
    const catalog={formatVersion:1,id,name:'M0 disposable fixture',code:'mt',nextSequence:1,
      createdAt:timestamp,m0Fixture:{version:FIXTURE_VERSION,id}};
    await writeJson(dir,'catalog.json',catalog);
    const sources=[{id:sourceId,name:'M0 fixture files'}];
    await writeJson(dir,'sources.json',sources);
    const source=await dir.getDirectoryHandle('source-files',{create:true});
    const plan=fixtureFilePlan(id,timestamp);
    await writeCapturedFile(source,plan);
    let n=0;
    const taxonomy=ensureTagPath([],'M0 / Portable',()=>id+'-tag-'+(++n));
    const record={formatVersion:1,id:'mt1',sourceId,path:plan.name,kind:'file',
      tagIds:[taxonomy.id],notes:'Disposable cross-device verification record',updatedAt:timestamp};
    const view={id:id+'-view',name:'M0 portable shortcuts',sourceId:null,folderPath:'',
      tagIds:[taxonomy.id],tagMode:'all',query:'sourcebook-m0',fileType:'url',fileStatus:'all',
      presentation:{mode:'list',size:150,sort:'name',groupBy:'none'}};
    validateViews([view]);
    await commitCatalogTransaction({handle:dir,catalogId:id,changes:[
      {path:'tags.json',before:null,after:taxonomy.tags},
      {path:'views.json',before:null,after:[view]},
      {path:'resources/mt1.json',before:null,after:record},
      {path:'catalog.json',before:catalog,after:{...catalog,nextSequence:2}}
    ]});
    transactionVerified=true;
    await verifyHandle(dir);
    return {...blank(),status:'ok',permission,catalogCreated:true,transactionVerified:true,
      portableVerified:true,journalClear:true,fixtureProof:await fixtureFingerprint(id),fixtureName};
  }catch{
    // Never recursively delete a partially written Catalog. A pending journal
    // or an externally modified fixture must be preserved for manual inspection.
    return {...blank(),status:'error',permission,catalogCreated:created,
      transactionVerified,cleanupRequired:created,...(created?{fixtureName}:{})};
  }
}
// A cache inspection never switches the device offline and cannot prove offline loading.
export async function inspectM0OfflineShell(env=globalThis){
  const base=normalizeOfflineProbe(null);
  if(!env?.caches||typeof env.caches.keys!=='function'||!env.location?.href)
    return {...base,status:'unsupported'};
  const controllerActive=!!env.navigator?.serviceWorker?.controller;
  try{
    const names=(await env.caches.keys()).filter(name=>name.startsWith('sourcebook-shell-'));
    if(!names.length)return {...base,status:'missing',controllerActive};
    const shellURL=new URL('./index.html',env.location.href).href;
    const appURL=new URL('./src/app.mjs',env.location.href).href;
    for(const name of names){
      const cache=await env.caches.open(name);
      const shellCached=!!(await cache.match(shellURL)),appModuleCached=!!(await cache.match(appURL));
      if(shellCached&&appModuleCached)return {status:controllerActive?'cached':'inactive',
        controllerActive,shellCached,appModuleCached};
    }
    return {...base,status:'missing',controllerActive};
  }catch{return {...base,status:'error',controllerActive};}
}
