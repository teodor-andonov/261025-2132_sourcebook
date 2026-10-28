// Explicit, one-at-a-time legacy Catalog URL -> ordinary .url migration.
// Source creation and Catalog metadata rebinding are not atomic together.
import {validateCatalogURLRecord} from './catalog-urls.mjs';
import {appendToken,CODE_PATTERN} from './identity.mjs';
import {writeCapturedFile,parseInternetShortcut} from './file-capture.mjs';
import {readJson} from './storage.mjs';
import {inspectPendingCatalogTransaction,commitCatalogTransaction} from './catalog-transactions.mjs';
import {assertNoCatalogConflictCopies} from './catalog-conflicts.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const label=value=>String(value||'').normalize('NFKC')
  .replace(/[^\p{L}\p{N} ()_,.\-]/gu,' ').replace(/\s+/g,' ')
  .replace(/^\.+|\.+$/g,'').trim().slice(0,52).trim()||'Link';
export function planLegacyURLMigration({record,catalog,source,records=[],timestamp=new Date().toISOString()}){
  validateCatalogURLRecord(record);
  if(!catalog||!CODE_PATTERN.test(catalog.code)||!catalog.id||!source?.id||
    typeof source.name!=='string'||!Array.isArray(records)||!Number.isFinite(Date.parse(timestamp)))
    throw Error('Invalid legacy migration context');
  const match=record.id.match(new RegExp('^'+catalog.code+'([1-9][0-9]*)$'));
  if(!match||!Number.isSafeInteger(Number(match[1])))throw Error('Legacy ID is not valid for this Catalog');
  const name=appendToken(label(record.title||new URL(record.url).hostname)+'.url',
    catalog.code,Number(match[1]));
  if(name.length>90)throw Error('Migration filename is too long');
  if(records.some(r=>r?.id!==record.id&&r?.sourceId===source.id&&
    typeof r.path==='string'&&r.path.toLocaleLowerCase()===name.toLocaleLowerCase()))
    throw Error('Another Catalog resource already claims the destination path');
  const plan={kind:'url',name,text:'[InternetShortcut]\r\nURL='+record.url+'\r\n',type:'text/plain'};
  if(parseInternetShortcut(plan.text)!==record.url)throw Error('Invalid Internet Shortcut');
  const previous=Date.parse(record.updatedAt||'');
  const updatedAt=new Date(Math.max(Date.parse(timestamp),Number.isFinite(previous)?previous+1:0)).toISOString();
  const after={...record,kind:'file',sourceId:source.id,path:name,renamed:false,updatedAt,
    migration:{from:'legacy-url',legacyUrl:record.url,legacyTitle:record.title,
      legacyUpdatedAt:record.updatedAt||null}};
  delete after.url;
  return {name,plan,before:record,after};
}
async function checkCollision(directory,name){
  if(typeof directory.entries!=='function')throw Error('Destination cannot be enumerated safely');
  let count=0;
  for await(const [existing] of directory.entries()){
    if(++count>50000)throw Error('Destination is too large for collision preflight');
    if(String(existing).toLocaleLowerCase()===name.toLocaleLowerCase())
      throw Error('Destination filename already exists (including case-only collision)');
  }
}
export async function migrateLegacyURLToFile({catalogHandle,sourceHandle,expectedCatalog,
  expectedSources,records,recordId,sourceId,authorized,
  commit=({handle,catalogId,changes})=>commitCatalogTransaction({handle,catalogId,changes})}){
  if(!catalogHandle||sourceHandle?.kind!=='directory'||!expectedCatalog||
    !Array.isArray(expectedSources)||!Array.isArray(records)||typeof authorized!=='function')
    throw Error('Invalid migration context');
  const source=expectedSources.find(s=>s.id===sourceId);
  const record=records.find(r=>r.id===recordId);
  if(!source||!record||sourceHandle.name!==source.name)
    throw Error('Reconnect the registered destination Folder before migrating');
  const planned=planLegacyURLMigration({record,catalog:expectedCatalog,source,records});
  if(!await authorized(catalogHandle,'readwrite'))throw Error('Catalog write permission required');
  if(!await authorized(sourceHandle,'readwrite'))throw Error('Destination Folder write permission required');
  await assertNoCatalogConflictCopies(catalogHandle);
  if(await inspectPendingCatalogTransaction(catalogHandle,expectedCatalog.id))
    throw Error('Resolve the pending Catalog transaction first');
  if(!same(await readJson(catalogHandle,'catalog.json'),expectedCatalog)||
    !same(await readJson(catalogHandle,'sources.json',[]),expectedSources))
    throw Error('Catalog or source list changed on disk');
  const resources=await catalogHandle.getDirectoryHandle('resources');
  if(!same(await readJson(resources,recordId+'.json'),record))
    throw Error('Legacy metadata changed on disk');
  await checkCollision(sourceHandle,planned.name);
  try{
    const written=await writeCapturedFile(sourceHandle,planned.plan);
    if((await (await written.handle.getFile()).text())!==planned.plan.text)
      throw Error('Shortcut changed before metadata binding');
    if(!same(await readJson(resources,recordId+'.json'),record)||
      !same(await readJson(catalogHandle,'sources.json',[]),expectedSources))
      throw Error('Catalog changed after file creation');
    await commit({handle:catalogHandle,catalogId:expectedCatalog.id,
      changes:[{path:'resources/'+recordId+'.json',before:record,after:planned.after}]});
    if(!same(await readJson(resources,recordId+'.json'),planned.after)||
      (await (await written.handle.getFile()).text())!==planned.plan.text)
      throw Error('Post-migration readback failed');
    return {id:recordId,name:planned.name,record:planned.after};
  }catch(error){
    throw Error('Migration incomplete. Inspect '+planned.name+
      ' before retrying: a new/partial file may remain, and Catalog recovery may be required. '+error.message);
  }
}
