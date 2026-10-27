// Read-only inspection of Syncthing-style conflict copies in a portable .sb.
// A conflict copy is evidence of concurrent edits, NEVER a safe merge candidate.
// Ordinary source folders are not traversed and no file is modified.
const ROOT=new Set(['catalog.json','sources.json','tags.json','views.json','.sourcebook-pending.json']);
const RESOURCE=/^resources\/[a-z0-9_-]{1,100}\.json$/;
const MARKER='.sync-conflict-';
const MAX_CONFLICTS=500;
const MAX_TEXT_BYTES=2*1024*1024;
const encoder=new TextEncoder();
const missing=error=>error?.name==='NotFoundError';

export function conflictCanonicalPath(path){
  if(typeof path!=='string')return null;
  const resource=path.startsWith('resources/');
  const name=resource?path.slice(10):path;
  if(name.includes('/')||name.includes('\\'))return null;
  const index=name.indexOf(MARKER);
  if(index<1||!name.slice(index+MARKER.length))return null;
  const stem=name.slice(0,index);
  const canonical=name.endsWith('.json')?stem+'.json':stem.endsWith('.json')?stem:null;
  if(!canonical)return null;
  const full=resource?'resources/'+canonical:canonical;
  if(resource)return RESOURCE.test(full)?full:null;
  return ROOT.has(full)?full:null;
}

async function scanNames(handle){
  const found=[];
  async function collect(dir,prefix){
    for await(const [name,entry] of dir.entries()){
      const path=prefix+name,canonicalPath=conflictCanonicalPath(path);
      if(!canonicalPath)continue;
      found.push({path,canonicalPath,kind:entry.kind});
      if(found.length>MAX_CONFLICTS)throw Error('More than 500 Catalog conflict copies; inspect the .sb folder manually');
    }
  }
  await collect(handle,'');
  let resources;
  try{resources=await handle.getDirectoryHandle('resources');}
  catch(error){if(!missing(error))throw error;}
  if(resources)await collect(resources,'resources/');
  return found.sort((a,b)=>a.path.localeCompare(b.path));
}

async function readText(handle,path){
  let dir=handle,name=path;
  if(path.startsWith('resources/')){
    dir=await handle.getDirectoryHandle('resources');
    name=path.slice(10);
  }
  const file=await (await dir.getFileHandle(name)).getFile();
  if(file.size>MAX_TEXT_BYTES)throw Error('Metadata file exceeds 2 MiB inspection limit');
  const data=await file.text();
  if(encoder.encode(data).length>MAX_TEXT_BYTES)throw Error('Metadata file exceeds 2 MiB inspection limit');
  return data;
}
async function checksum(data){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(data)));
  return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
}
function json(data){
  try{return {valid:true,value:JSON.parse(data)};}catch{return {valid:false};}
}

// Cheap preflight for EVERY Catalog write and explicit journal resume.
// Even identical conflict copies block edits until the user resolves them.
export async function assertNoCatalogConflictCopies(handle){
  if(!handle)throw Error('Open a Catalog first');
  const copies=await scanNames(handle);
  if(copies.length)throw Error(copies.length+' Syncthing conflict copy/copies in Catalog metadata; inspect and resolve them before editing');
}

// Bounded read-only inspection for an explicit user action.
// SHA-256 values are for comparison/reporting, not proof of common ancestry.
export async function inspectCatalogConflictCopies(handle,{expectedCatalogId}={}){
  if(!handle)throw Error('Open a Catalog first');
  const found=await scanNames(handle),entries=[],observed=new Map();
  for(const item of found){
    const row={...item,status:'unreadable',conflictSha256:null,canonicalSha256:null};
    if(item.kind!=='file'){entries.push(row);continue;}
    let conflict;
    try{conflict=await readText(handle,item.path);observed.set(item.path,conflict);row.conflictSha256=await checksum(conflict);}
    catch(error){row.status=missing(error)?'disappeared':'unreadable';entries.push(row);continue;}
    const parsed=json(conflict);
    if(!parsed.valid){row.status='malformed-conflict';entries.push(row);continue;}
    if(item.canonicalPath==='catalog.json'&&expectedCatalogId&&parsed.value?.id!==expectedCatalogId){
      row.status='foreign-catalog';entries.push(row);continue;
    }
    let canonical;
    try{canonical=await readText(handle,item.canonicalPath);}
    catch(error){row.status=missing(error)?'canonical-missing':'unreadable';entries.push(row);continue;}
    observed.set(item.canonicalPath,canonical);
    row.canonicalSha256=await checksum(canonical);
    const current=json(canonical);
    row.status=!current.valid?'malformed-current':canonical===conflict?'identical':
      JSON.stringify(current.value)===JSON.stringify(parsed.value)?'equivalent':'divergent';
    entries.push(row);
  }
  // Fail closed if a new conflict appeared or a copy disappeared while inspecting.
  if(JSON.stringify(found)!==JSON.stringify(await scanNames(handle)))
    throw Error('Catalog conflict copies changed during inspection; recheck');
  for(const [path,first] of observed){
    let latest;
    try{latest=await readText(handle,path);}
    catch{throw Error('Catalog metadata changed during conflict inspection: '+path);}
    if(latest!==first)throw Error('Catalog metadata changed during conflict inspection: '+path);
  }
  return {count:entries.length,checkedAt:new Date().toISOString(),entries,
    counts:Object.fromEntries(['identical','equivalent','divergent','canonical-missing',
      'malformed-conflict','malformed-current','foreign-catalog','unreadable','disappeared']
      .map(status=>[status,entries.filter(row=>row.status===status).length]))};
}
