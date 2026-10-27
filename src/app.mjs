import {getLocal,setLocal,readJson,writeJson,nested,authorized} from './storage.mjs';
import {CODE_PATTERN,validName,parseFilename} from './identity.mjs';
import {planResourceIdentity} from './catalog.mjs';
import {planBulkTags,assertSelectedUnchanged,commitBulkTags} from './bulk-tags.mjs';
import {nextSelectionIndex,selectionRangeIds} from './navigation.mjs';
import {catalogFolderTree,catalogFolderParts} from './catalog-folders.mjs';
import {catalogTagResults,sortCatalogResults,sortBrowserItems,catalogFileType} from './catalog-search.mjs';
import {groupViewItems,viewTableMetadata,TABLE_COLUMNS,DEFAULT_TABLE_COLUMNS,normalizeTableColumns} from './view-layout.mjs';
import {scanRegisteredFolders,verifyCatalogRootReconnect,assertLiveSourceEntry} from './source-scan.mjs';
import {validateViews,sortViewsForSidebar} from './views.mjs';
import {createViewsController} from './views-controller.mjs';
import {plainRoot,createFolderTab,loadFolderTabs,visitFolderTab,folderHistoryTarget,closeFolderTab} from './workspace.mjs';
import {mergeTagInput,ensureTagPath,recordTagPaths,flattenedTagTree,includesTagPath,matchesResourceSearch,suggestTagPaths,nextTagSuggestionIndex,toggleTagPin,pinnedTagShortcuts,assertTagSnapshotUnchanged} from './tags.mjs';

const $=(query,root=document)=>root.querySelector(query);
const state={
  catalog:null, catalogHandle:null, sources:[], handles:new Map(), records:new Map(), taxonomy:[], tagFilter:null, catalogTagView:null,activeViewId:null,views:[],viewSaving:false,sort:'name',groupBy:'none',tableColumns:[...DEFAULT_TABLE_COLUMNS],fileType:'all',fileStatus:'all',
  sourceId:null,parts:[],items:[],selected:new Set(),lastSelected:null,
  search:'', view:localStorage.getItem('sb-view')||'gallery',
  size:Number(localStorage.getItem('sb-size'))||164,
  inspector:window.innerWidth>760, sidebar:false, loading:false, request:0,
  imageUrls:new Set(), thumbnailUrls:new Map(), observer:null, previewUrl:null, previewId:null, pageCount:150,
  tagDraftItem:null, tagDraft:[], tagSuggestions:[], tagSuggestionIndex:-1, selectionMode:false, bulkSaving:false,resourceSaving:false,
  scan:null,scanBusy:false,scanGeneration:0,scanProgress:''
};
const viewsUI=createViewsController({state,readJson,writeJson,authorized,render,toast,forgetImages,navigate,refreshRecords});
function invalidateScan(){++state.scanGeneration;state.scan=null;state.scanBusy=false;state.scanProgress='';}
let tabPersistQueue=Promise.resolve();
const glyphs={
  book:'M3 3h7v18H3z M10 7h4v14h-4z M16 4l5 17 M16 5l3-1',
  folder:'M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  image:'M3 3h18v18H3z M7 16l5-5 3 3 3-3 3 4 M8 8h.01',
  search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z m6-2 4 4',
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  list:'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  table:'M3 4h18v16H3z M3 10h18 M3 15h18 M10 4v16',
  plus:'M12 5v14 M5 12h14',
  more:'M5 12h.01 M12 12h.01 M19 12h.01',
  check:'M20 6 9 17l-5-5',
  info:'M15 3v18 M3 3h18v18H3z',
  refresh:'M20 11a8 8 0 0 0-14-5L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14 5l2-2 M20 20v-4h-4',
  upload:'M12 16V3 M7 8l5-5 5 5 M4 17v4h16v-4',
  tag:'M3 3h9l9 9-9 9-9-9z M8 8h.01',
  pin:'M16 3l5 5-3 1-3 3v5l-1 1-5-5-4 4-1-1 4-4-5-5 1-1h5z',
  close:'M18 6 6 18 M6 6l12 12',
  back:'M15 18l-6-6 6-6',
  forward:'M9 18l6-6-6-6',
  chevron:'M9 18l6-6-6-6',
  view:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  database:'M3 5a9 3 0 0 0 18 0 M3 5v14a9 3 0 0 0 18 0V5 M3 12a9 3 0 0 0 18 0',
  alert:'M12 2 2 22h20L12 2z M12 9v5 M12 18h.01',
  bookmark:'M5 3h14v18l-7-5-7 5z',
  menu:'M4 6h16 M4 12h16 M4 18h16',
  save:'M4 3h13l4 4v14H3V3z M7 3v7h10 M7 21v-8h10',
  video:'M3 3h18v18H3z M8 3v18 M16 3v18 M3 8h5 M16 8h5'
};
function icon(type,size=18){
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="'+(glyphs[type]||glyphs.file)+'"/></svg>';
}
function escapeHTML(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function button(title,type,action,active=false){return '<button type="button" class="icon-button '+(active?'active':'')+'" title="'+title+'" aria-label="'+title+'" data-action="'+action+'">'+icon(type)+'</button>';}
function errorText(error){if(error?.name==='AbortError')return 'Cancelled';if(error?.name==='NotAllowedError')return 'Permission denied. Please grant folder access.';return error?.message||'Action failed';}
function toast(text,warning=false){
  $('#toast')?.remove();
  const el=document.createElement('div');el.id='toast';el.className='toast '+(warning?'danger':'');el.textContent=text;document.body.append(el);
  setTimeout(()=>el.remove(),4500);
}
function forgetImages(){state.observer?.disconnect();state.observer=null;for(const url of state.imageUrls)URL.revokeObjectURL(url);state.imageUrls.clear();state.thumbnailUrls.clear();}
function cleanName(name){return parseFilename(name).displayName;}
function tagLeaf(name){return String(name).split(' / ').at(-1);}
function applyAccent(hex){
  const value=/^#[0-9a-fA-F]{6}$/.test(hex)?hex:'#5276bd';
  document.documentElement.style.setProperty('--accent',value);
  localStorage.setItem('sb-accent',value);
}
applyAccent(localStorage.getItem('sb-accent')||'#5276bd');
function currentSource(){return state.sources.find(x=>x.id===state.sourceId);}
function sourceHandle(){return state.handles.get(state.sourceId);}
function itemKind(item){
  if(item.kind==='directory')return 'folder';
  if(/\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(item.name))return 'image';
  if(/\.pdf$/i.test(item.name))return 'pdf';
  if(/\.(mp4|mov|webm)$/i.test(item.name))return 'video';
  return 'file';
}
function itemRecord(item){
  if(item?.catalogResult)return item.record;
  // Never silently bind a copied filename token to another resource's record.
  const path=[...state.parts,item.name].join('/');
  for(const record of state.records.values()){
    if(record.sourceId===state.sourceId&&record.path===path)return record;
  }
  return null;
}
function openDialog(inner){
  $('#dialog')?.remove();
  const outer=document.createElement('div');outer.id='dialog';outer.className='dialog-overlay';
  outer.innerHTML='<section class="dialog" role="dialog" aria-modal="true">'+inner+'</section>';
  outer.addEventListener('click',event=>{if(event.target===outer||event.target.closest('[data-action="dismiss"]'))outer.remove();});
  document.body.append(outer);outer.querySelector('input')?.focus();
}
function landing(){
  forgetImages();
  $('#app').innerHTML='<main class="landing"><div class="landing-content"><div class="landing-logo">'+icon('book',35)+'</div><h1>Sourcebook</h1><p>Your files, beautifully organized.</p><div class="landing-actions"><button class="primary" data-action="open-folder">'+icon('folder')+' Open folder</button><button class="secondary" data-action="open-catalog">'+icon('database')+' Open catalog</button><button class="secondary" data-action="create-catalog">'+icon('plus')+' New catalog</button></div><div id="recent-area"></div><span class="landing-foot">Local-first. No imports required. Your files stay yours.</span></div></main>';
  getLocal('recent').then(value=>{
    if(value&&$('#recent-area'))$('#recent-area').innerHTML='<div class="eyebrow">RECENT CATALOG</div><button class="recent-item" data-action="recent">'+icon('database')+'<span>'+escapeHTML(value.name)+'</span>'+icon('chevron',15)+'</button>';
  }).catch(console.warn);
}
async function recentCatalog(){
  const r=await getLocal('recent');
  if(!r?.handle)return;
  if(await authorized(r.handle,'read'))await openDirectory(r.handle);
  else toast('Open the catalog again to grant access.',true);
}
function activeFolderTab(){return state.catalog?null:state.sources.find(tab=>tab.id===state.sourceId);}
function rememberFolderTabs(){
  if(state.catalog)return tabPersistQueue;
  const session={tabs:state.sources.map(tab=>({...tab})),activeId:state.sourceId};
  tabPersistQueue=tabPersistQueue.catch(()=>{}).then(async()=>{
    await setLocal('folder-tabs-v1',session);
    await setLocal('last-mode','folder');
  }).catch(error=>console.warn('Folder tab workspace could not be saved',error));
  return tabPersistQueue;
}
async function setPlainFolder(handle,remember=true){
  if(state.bulkSaving||state.viewSaving||state.resourceSaving)throw Error('Finish catalog editing before switching folders.');
  plainRoot(handle);
  const stayingPlain=!state.catalog;
  const restored=stayingPlain?null:loadFolderTabs(await getLocal('folder-tabs-v1').catch(()=>null));
  const tabs=stayingPlain?state.sources:restored.tabs;
  if(tabs.length>=32)throw Error('A maximum of 32 folder tabs can be open.');
  const tab=createFolderTab(handle,crypto.randomUUID());
  closePreview();invalidateScan();
  if(!stayingPlain){
    state.sources=[];state.handles.clear();state.records.clear();state.taxonomy=[];state.tagFilter=null;
    for(const existing of tabs)state.handles.set(existing.id,existing.handle);
  }
  state.catalog=null;state.catalogHandle=null;state.catalogTagView=null;state.activeViewId=null;state.views=[];
  state.sources=[...tabs,tab];state.handles.set(tab.id,handle);
  state.sourceId=tab.id;state.parts=[];state.selected.clear();state.search='';state.sidebar=false;
  if(remember)void rememberFolderTabs();
  await navigate(tab.id,[]);
}
async function choosePlainFolder(){
  try{const handle=await window.showDirectoryPicker({mode:'read'});await setPlainFolder(handle);}
  catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function openSelectedFolderTab(){
  if(state.catalog||state.selected.size!==1)return;
  const item=state.items.find(x=>state.selected.has(x.id));
  if(item?.kind==='directory')await setPlainFolder(item.handle);
}
async function switchFolderTab(id){
  const tab=state.sources.find(x=>x.id===id);
  if(!tab||state.catalog)return;
  state.sidebar=false;
  await navigate(id,[...tab.parts]);
}
async function closePlainFolderTab(id){
  if(state.catalog)return;
  const wasActive=state.sourceId===id;
  const result=closeFolderTab(state.sources,id,state.sourceId);
  state.sources=result.tabs;state.sourceId=result.activeId;state.handles.delete(id);
  if(wasActive){
    ++state.request;closePreview();forgetImages();
    state.items=[];state.parts=[];state.selected.clear();
  }
  void rememberFolderTabs();
  if(!result.activeId){landing();return;}
  if(wasActive)await switchFolderTab(result.activeId);
  else render();
}
async function folderHistoryStep(delta){
  if(state.catalog)return;
  const target=folderHistoryTarget(state.sources,state.sourceId,delta);
  if(target)await navigate(state.sourceId,target.parts,target.position);
}
function viewTagOptionsHTML(){
  const filter=viewsUI.selectedTags(),selected=new Set(filter.tagIds);
  const tags=flattenedTagTree(state.taxonomy),known=new Set(tags.map(tag=>tag.id));
  const rows=tags.map(tag=>
    '<label class="view-tag-option" data-view-tag-option="'+escapeHTML(tag.path.toLocaleLowerCase())+'"><input type="checkbox" name="viewTagIds" value="'+escapeHTML(tag.id)+'" '+(selected.has(tag.id)?'checked':'')+'/>'+'<span>#'+escapeHTML(tag.path.replaceAll(' / ','/'))+'</span></label>'
  ).join('');
  const missing=filter.tagIds.filter(id=>!known.has(id)).map(id=>
    '<label class="view-tag-option" data-view-tag-option="missing"><input type="checkbox" name="viewTagIds" value="'+escapeHTML(id)+'" checked/><span>Missing tag ('+escapeHTML(id)+')</span></label>'
  ).join('');
  return '<label class="view-tag-mode">Match<select name="viewTagMode"><option value="all" '+(filter.tagMode==='all'?'selected':'')+'>All selected tags (AND)</option><option value="any" '+(filter.tagMode==='any'?'selected':'')+'>Any selected tag (OR)</option></select></label>'+
    '<input type="search" id="view-tag-search" placeholder="Find tags…" aria-label="Find tags" autocomplete="off"/>'+
    '<div class="view-tag-options" role="group" aria-label="Filter by tags">'+(rows+missing||'<span class="micro-hint">No catalog tags yet</span>')+'</div>';
}
function openTableColumnsDialog(){
  const active=new Set(normalizeTableColumns(state.tableColumns));
  const choices=TABLE_COLUMNS.map(col=>'<label class="table-column-choice"><input type="checkbox" name="tableColumn" value="'+col.key+'" '+(active.has(col.key)?'checked':'')+(col.key==='name'?' disabled':'')+'/><span>'+escapeHTML(col.label)+'</span></label>').join('');
  openDialog('<h2>Table columns</h2><p>Choose visible columns. Name is always included.</p><form id="table-columns-form"><div class="table-column-options">'+choices+'</div><div class="dialog-actions"><button type="button" class="secondary" data-action="dismiss">Cancel</button><button class="primary">Apply</button></div></form>');
}
function viewFilterDialog(mode){
  const editing=mode==='tags',renaming=mode==='rename';
  const name=viewsUI.active()?.name||(state.catalogTagView?'#'+tagLeaf(state.catalogTagView):state.parts.at(-1)||'New View');
  openDialog('<h2>'+(renaming?'Rename View':editing?'View tags':'Save View')+'</h2><form id="view-form" data-rename="'+renaming+'" data-edit-tags="'+editing+'">'+
    (editing?'':'<label>Name<input required name="name" maxlength="80" value="'+escapeHTML(name)+'"/></label>')+
    (renaming?'':viewTagOptionsHTML())+
    '<div class="dialog-actions"><button type="button" class="secondary" data-action="dismiss">Cancel</button><button class="primary">Save</button></div></form>');
}
function selectedViewTags(form){
  const tagIds=[...form.querySelectorAll('input[name="viewTagIds"]:checked')].map(input=>input.value);
  if(tagIds.length>16)throw Error('Use at most 16 tags per View');
  return {tagIds,tagMode:form.elements.viewTagMode?.value||'all'};
}
function createCatalog(){
  openDialog('<h2>Create a catalog</h2><p>A portable <code>.sb</code> folder, stored wherever you choose.</p><form id="catalog-form"><label>Catalog name<input required name="name" value="My References" maxlength="90"/></label><label>Catalog code<small>1–4 lowercase letters used for filename IDs</small><input required name="code" value="ab" maxlength="4" pattern="[a-z]{1,4}"/></label><div class="dialog-actions"><button class="secondary" type="button" data-action="dismiss">Cancel</button><button class="primary">Choose location</button></div></form>');
}
async function submitCatalog(form){
  const name=form.elements.name.value.trim(),code=form.elements.code.value.trim();
  if(!validName(name)||!CODE_PATTERN.test(code))return toast('Invalid catalog name or code.',true);
  try{
    const parent=await window.showDirectoryPicker({mode:'readwrite'});
    const folder=await parent.getDirectoryHandle(name+'.sb',{create:true});
    if(await readJson(folder,'catalog.json'))return toast('That catalog already exists. Open it instead.',true);
    const cat={formatVersion:1,id:crypto.randomUUID(),name,code,nextSequence:1,createdAt:new Date().toISOString()};
    await writeJson(folder,'catalog.json',cat);
    await writeJson(folder,'sources.json',[]);
    $('#dialog')?.remove();
    await openDirectory(folder);toast('Created '+name+'.sb');
  }catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function chooseCatalog(){
  try{const h=await window.showDirectoryPicker({mode:'read'});await openDirectory(h);}
  catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function refreshRecords(){
  const records=new Map();
  let dir;
  try{dir=await state.catalogHandle.getDirectoryHandle('resources');}
  catch(e){if(e.name==='NotFoundError'){state.records=records;return;}throw e;}
  for await(const [name,handle] of dir.entries()){
    if(handle.kind!=='file'||!name.endsWith('.json'))continue;
    let r;
    try{r=JSON.parse(await (await handle.getFile()).text());}
    catch(e){console.warn('Invalid resource record',name,e);continue;}
    if(r?.id){
      if(records.has(r.id))throw Error('Duplicate resource identity: '+r.id);
      records.set(r.id,r);
    }
  }
  state.records=records;
}
async function openDirectory(h){
  if(state.bulkSaving||state.viewSaving||state.resourceSaving)throw Error('Finish catalog editing before switching catalogs.');
  const config=await readJson(h,'catalog.json');
  if(!config?.id||!CODE_PATTERN.test(config.code))throw Error('Choose a .sb directory containing catalog.json.');
  invalidateScan();
  state.catalog=config;state.catalogHandle=h;
  state.sources=await readJson(h,'sources.json',[]);
  const savedTags=await readJson(h,'tags.json',[]);
  if(!Array.isArray(savedTags))throw Error('Invalid tags.json catalog taxonomy');
  state.taxonomy=savedTags;state.views=validateViews(await readJson(h,'views.json',[]));state.activeViewId=null;state.tagFilter=null;state.catalogTagView=null;
  state.handles.clear();state.records.clear();
  for(const s of state.sources){
    try{const v=await getLocal('source:'+config.id+':'+s.id);if(v)state.handles.set(s.id,v);}
    catch(e){console.warn('This device cannot restore source handles',e);}
  }
  await refreshRecords(); // Read-only catalog opening must never create a directory.
  try{await setLocal('recent',{handle:h,name:config.name});await setLocal('last-mode','catalog');}
  catch(e){console.warn('This browser cannot remember the recent catalog',e);}
  state.sourceId=state.sources[0]?.id||null;
  state.parts=[];state.items=[];state.selected.clear();state.search='';
  render();
  if(state.sourceId)await navigate(state.sourceId,[]);
}
async function addSource(){
  if(state.bulkSaving||state.resourceSaving)return toast('Finish metadata editing before registering folders.',true);
  try{
    const h=await window.showDirectoryPicker({mode:'read'});
    const item={id:crypto.randomUUID(),name:h.name};
    const nextSources=[...state.sources,item];
    await writeJson(state.catalogHandle,'sources.json',nextSources);
    state.sources=nextSources;invalidateScan();
    try{await setLocal('source:'+state.catalog.id+':'+item.id,h);}
    catch(e){console.warn('Source handle will need reconnecting after reload',e);toast('Source added, but this device cannot remember its permission.',true);}
    state.handles.set(item.id,h);
    toast('Added '+h.name);await navigate(item.id,[]);
  }catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function reconnect(){
  if(state.resourceSaving||state.bulkSaving||state.viewSaving)return toast('Finish metadata editing before reconnecting.',true);
  if(!state.catalog){
    try{
      const tab=activeFolderTab();
      if(!tab)return choosePlainFolder();
      const handle=await window.showDirectoryPicker({mode:'read'});
      if(typeof tab.handle?.isSameEntry==='function'&&!await tab.handle.isSameEntry(handle))throw Error('Reconnect the same folder, or open a different folder in a new tab.');
      state.sources=state.sources.map(x=>x.id===tab.id?{...x,handle,name:handle.name}:x);
      state.handles.set(tab.id,handle);
      await navigate(tab.id,[...tab.parts]);
    }catch(error){if(error.name!=='AbortError')toast(errorText(error),true);}
    return;
  }
  try{
    const h=await window.showDirectoryPicker({mode:'read'});
    const old=state.handles.get(state.sourceId)||await getLocal('source:'+state.catalog.id+':'+state.sourceId).catch(()=>null);
    await verifyCatalogRootReconnect(old,h,currentSource()?.name,()=>confirm('This device cannot verify the original Catalog Folder. Confirm this is the same folder: '+currentSource()?.name+'?'));
    try{await setLocal('source:'+state.catalog.id+':'+state.sourceId,h);}
    catch(e){console.warn('Source handle cannot be persisted',e);toast('Source connected for this session only.',true);}
    state.handles.set(state.sourceId,h);invalidateScan();
    await navigate(state.sourceId,[]);
  }catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function navigate(id,parts,historyPosition=null){
  if(state.bulkSaving||state.viewSaving||state.resourceSaving)return toast('Finish catalog editing before navigating.',true);
  state.catalogTagView=null;state.activeViewId=null;
  state.sourceId=id;state.parts=parts;state.search='';state.selected.clear();state.pageCount=150;
  state.tagDraftItem=null;state.tagFilter=null;state.selectionMode=false;
  const request=++state.request;
  state.loading=true;state.items=[];forgetImages();render();
  try{
    const h=sourceHandle();if(!h)throw Error('This source is disconnected on this device.');
    if(!await authorized(h)){state.handles.delete(id);throw Error('Permission expired; reconnect the source.');}
    const folder=await nested(h,parts);const items=[];
    for await(const [name,handle] of folder.entries()){
      if(request!==state.request)return;
      if(state.catalog&&handle.kind==='directory'&&name.endsWith('.sb'))continue;
      items.push({id:id+':'+[...parts,name].join('/'),name,handle,kind:handle.kind});
      if(items.length%100===0){state.items=sort(items);renderItems();}
    }
    if(request!==state.request)return;
    state.items=sort(items);state.loading=false;
    if(!state.catalog){state.sources=visitFolderTab(state.sources,id,parts,{historyPosition});void rememberFolderTabs();}
    render();
  }catch(e){if(request===state.request){state.loading=false;render();toast(errorText(e),true);}}
}
function sort(items){return [...items].sort((a,b)=>((a.kind==='directory'?-1:1)-(b.kind==='directory'?-1:1))||a.name.localeCompare(b.name,undefined,{numeric:true}));}
function tagNavigationHTML(){
  const tree=flattenedTagTree(state.taxonomy);
  const pins=pinnedTagShortcuts(state.taxonomy).map(t=>
    '<button class="nav-item tag-nav pinned-shortcut '+(state.catalogTagView===t.path||state.tagFilter===t.path?'selected':'')+'" data-tag-filter="'+escapeHTML(t.path)+'" title="Browse catalog tag: '+escapeHTML(t.path)+'">'+icon('pin',13)+'<span>#'+escapeHTML(t.path.replaceAll(' / ','/'))+'</span></button>'
  ).join('');
  const rows=tree.map(t=>
    '<div class="tag-row"><button class="nav-item tag-nav '+(state.catalogTagView===t.path||state.tagFilter===t.path?'selected':'')+'" data-tag-filter="'+escapeHTML(t.path)+'" style="--depth:'+Math.min(t.depth,6)+'" title="'+escapeHTML(t.path)+'">'+icon('tag',14)+'<span>#'+escapeHTML(t.name)+'</span></button>'+
    '<button type="button" class="tag-pin" data-toggle-tag-pin="'+escapeHTML(t.id)+'" aria-label="'+(t.pinned?'Unpin':'Pin')+' tag '+escapeHTML(t.path)+'" title="'+(t.pinned?'Unpin':'Pin')+' '+escapeHTML(t.path)+'" aria-pressed="'+(t.pinned?'true':'false')+'">'+icon('pin',13)+'</button></div>'
  ).join('');
  return (pins?'<div class="tag-shortcuts">'+pins+'</div>':'')+rows;
}
async function togglePin(id){
  if(state.bulkSaving||state.resourceSaving)return toast('Finish metadata editing before changing tags.',true);
  try{
    if(!state.catalogHandle||!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission is needed to pin a tag.');
    const disk=await readJson(state.catalogHandle,'tags.json',[]);
    assertTagSnapshotUnchanged(state.taxonomy,disk);
    const updated=toggleTagPin(disk,id);
    await writeJson(state.catalogHandle,'tags.json',updated);
    if(JSON.stringify(await readJson(state.catalogHandle,'tags.json'))!==JSON.stringify(updated))throw Error('Tag pin could not be verified on disk.');
    state.taxonomy=updated;
    const nav=$('#tag-nav');if(nav)nav.innerHTML=tagNavigationHTML();
  }catch(error){toast('Pin failed: '+errorText(error),true);}
}
async function catalogResultHandle(item){
  const root=state.handles.get(item.sourceId);
  if(!root||typeof root.queryPermission!=='function'||await root.queryPermission({mode:'read'})!=='granted')throw Error('This catalog source needs reconnecting before preview.');
  const dir=await nested(root,item.parts);
  return item.kind==='directory'?await dir.getDirectoryHandle(item.name):await dir.getFileHandle(item.name);
}
async function revealCatalogResult(item){
  if(!item?.catalogResult)return;
  if(!state.handles.has(item.sourceId))throw Error('Reconnect this source through its Catalog Folder first.');
  const sourceId=item.sourceId,parts=[...item.parts],name=item.name;
  await navigate(sourceId,parts);
  const result=state.items.find(x=>x.name===name&&x.kind===item.kind);
  if(result){select(result,{shiftKey:false,ctrlKey:false,metaKey:false});}
  else toast('Resource is no longer present at its catalog path.',true);
}
function openCatalogTagView(path){
  if(!state.catalog||state.bulkSaving||state.viewSaving||state.resourceSaving)return;
  if(state.catalogTagView===path){void navigate(state.sourceId,[...state.parts]);return;}
  try{
    state.catalogTagView=path;state.activeViewId=null;state.tagFilter=null;state.search='';state.selected.clear();
    state.lastSelected=null;state.tagDraftItem=null;state.tagDraft=[];state.selectionMode=false;state.pageCount=150;
    ++state.request;forgetImages();state.loading=false;
    state.items=catalogTagResults([...state.records.values()],state.sources,state.taxonomy,path).map(item=>({...item,catalogResult:true,handle:null}));
    render();
  }catch(error){toast(errorText(error),true);}
}
async function refreshCatalogTagView(){
  if(!viewsUI.inResults())return;
  try{
    await refreshRecords();
    state.items=(state.activeViewId?[]:catalogTagResults([...state.records.values()],state.sources,state.taxonomy,state.catalogTagView).map(item=>({...item,catalogResult:true,handle:null})));if(state.activeViewId){viewsUI.open(state.activeViewId);return;}
    state.selected.clear();render();
  }catch(error){toast(errorText(error),true);}
}
function scanStatus(){
  if(state.scanBusy)return state.scanProgress||'Scanning folders…';
  if(!state.scan)return 'Cataloged only';
  const total=state.sources.length,complete=state.scan.completeRootIds.length;
  return state.scan.entries.length+' indexed · '+complete+'/'+total+' folders'+(state.scan.problems.length?' · partial':'');
}
async function runCatalogScan(){
  if(!state.catalog||state.scanBusy||state.bulkSaving||state.viewSaving||state.resourceSaving)return;
  const generation=++state.scanGeneration,catalogId=state.catalog.id;
  state.scanBusy=true;state.scanProgress='Scanning folders…';render();
  try{
    const scan=await scanRegisteredFolders(state.sources.map(s=>({id:s.id,name:s.name})),new Map(state.handles),{
      isCancelled:()=>generation!==state.scanGeneration||state.catalog?.id!==catalogId,
      onProgress:p=>{
        if(generation!==state.scanGeneration)return;
        state.scanProgress=p.count+' entries · '+p.completeRoots+'/'+p.totalRoots+' folders';
        const label=$('#scan-status');if(label)label.textContent=state.scanProgress;
      }
    });
    if(generation!==state.scanGeneration||scan.cancelled)return;
    state.scan=scan;
    if(state.activeViewId)viewsUI.requery();else render();
    toast(scan.problems.length?'Scan partial: '+scan.problems.length+' issue(s).':'Scanned '+scan.entries.length+' entries.',!!scan.problems.length);
  }catch(error){if(generation===state.scanGeneration)toast('Scan failed: '+errorText(error),true);}
  finally{if(generation===state.scanGeneration){state.scanBusy=false;state.scanProgress='';render();}}
}
function cancelCatalogScan(){
  if(!state.scanBusy)return;
  ++state.scanGeneration;state.scanBusy=false;state.scanProgress='';
  render();toast('Scan cancelled; previous results retained.');
}
function render(){
  $('#folder-context')?.remove();
  if(!state.catalog&&!state.sourceId)return landing();
  const plain=!state.catalog;
  document.title=(viewsUI.title()||state.parts.at(-1)||currentSource()?.name||state.catalog?.name||'Sourcebook')+' — Sourcebook';
  const sources=state.sources.map(source=>plain
    ?'<div class="tab-entry"><button class="nav-item tab-nav '+(source.id===state.sourceId?'selected':'')+'" data-source="'+escapeHTML(source.id)+'" title="'+escapeHTML([source.name,...source.parts].join('/'))+'">'+icon('folder',16)+'<span>'+escapeHTML(source.name)+'</span></button><button class="tab-close" data-close-tab="'+escapeHTML(source.id)+'" title="Close '+escapeHTML(source.name)+'" aria-label="Close '+escapeHTML(source.name)+'">'+icon('close',12)+'</button></div>'
    :'<button class="nav-item '+(source.id===state.sourceId?'selected':'')+'" data-source="'+escapeHTML(source.id)+'">'+icon('folder',16)+'<span>'+escapeHTML(source.name)+'</span>'+(!state.handles.has(source.id)?icon('alert',13):'')+'</button>'
  ).join('');
  const folderItems=plain?sources:catalogFolderTree(state.sources,state.records.values()).map(folder=>{
    const selected=!viewsUI.inResults()&&folder.sourceId===state.sourceId&&folder.path===state.parts.join('/');
    const offline=!state.handles.has(folder.sourceId);
    return '<button class="nav-item catalog-folder '+(selected?'selected':'')+'" data-catalog-folder="'+escapeHTML(folder.sourceId)+'" data-folder-path="'+escapeHTML(folder.path)+'" title="'+escapeHTML(folder.name)+'" style="--depth:'+Math.min(folder.depth,10)+'">'+icon('folder',15)+'<span>'+escapeHTML(folder.name)+'</span>'+(offline&&folder.root?icon('alert',12):'')+'</button>';
  }).join('');
  const rootSection='<div class="section-head"><span>'+(plain?'TABS':'FOLDERS')+'</span>'+button(plain?'Open folder':'Register folder','plus',plain?'open-folder':'add-source')+'</div><nav>'+folderItems+'</nav>';
  const viewRows=sortViewsForSidebar(state.views).map(v=>'<div class="view-row"><button class="nav-item '+(state.activeViewId===v.id?'selected':'')+'" data-open-view="'+escapeHTML(v.id)+'" title="'+escapeHTML(v.name)+'">'+icon('bookmark',15)+'<span>'+escapeHTML(v.name)+'</span></button><button class="view-pin" data-pin-view="'+escapeHTML(v.id)+'" aria-label="'+(v.pinned?'Unpin':'Pin')+' View '+escapeHTML(v.name)+'" title="'+(v.pinned?'Unpin':'Pin')+' View" aria-pressed="'+v.pinned+'">'+icon('pin',12)+'</button><button class="view-delete" data-delete-view="'+escapeHTML(v.id)+'" aria-label="Delete View '+escapeHTML(v.name)+'" title="Delete View">'+icon('close',12)+'</button></div>').join('');
  const catalogSection=plain
    ?'<div class="section-head"><span>CATALOG</span></div><nav><button class="nav-item" data-action="open-catalog">'+icon('database',16)+'<span>Open catalog</span></button><button class="nav-item" data-action="create-catalog">'+icon('plus',16)+'<span>New catalog</span></button></nav>'
    :'<div class="section-head"><span>TAGS</span><span class="tag-count">'+state.taxonomy.length+'</span></div><nav id="tag-nav">'+(tagNavigationHTML()||'<div class="tag-empty">Add tags to a resource</div>')+'</nav><div class="section-head"><span>VIEWS</span>'+button('Save View','plus','save-view')+'</div><nav>'+viewRows+'</nav>';
  const header='<button class="catalog-chip" data-action="home">'+icon(plain?'folder':'database',16)+'<span>'+escapeHTML(plain?'Browse':state.catalog.name)+'</span>'+icon('chevron',13)+'</button>';
  const selectionActions=plain||viewsUI.inResults()?'':'<button class="text-button '+(state.selectionMode?'active':'')+'" data-action="toggle-selection" aria-pressed="'+state.selectionMode+'" title="Toggle multi-selection">'+icon('check',15)+' <span>Select</span></button>'+'<button class="text-button" data-action="clear-selection" title="Clear selection" '+(state.selected.size?'':'hidden')+'>'+icon('close',15)+' <span>Clear</span></button>';
  const fileActions=plain||viewsUI.inResults()?'':'<button class="text-button" data-action="create-folder">'+icon('plus')+' <span>Folder</span></button><button class="text-button" data-action="import">'+icon('upload')+' <span>Add files</span></button>';
  const viewActions=plain?'':state.activeViewId?'<button class="text-button" data-action="update-view" title="Update View">'+icon('save',15)+' <span>Update</span></button><button class="text-button" data-action="edit-view-tags" title="Edit View tags">'+icon('tag',15)+' <span>Tags</span></button><button class="text-button" data-action="rename-view" title="Rename View">'+icon('more',15)+' <span>Rename</span></button>':'<button class="text-button" data-action="save-view" title="Save View">'+icon('bookmark',15)+' <span>Save View</span></button>';
  const typeControl=plain?'':'<select id="file-type" class="sort-control type-control" aria-label="File type"><option value="all" '+(state.fileType==='all'?'selected':'')+'>All types</option><option value="image" '+(state.fileType==='image'?'selected':'')+'>Images</option><option value="pdf" '+(state.fileType==='pdf'?'selected':'')+'>PDFs</option><option value="video" '+(state.fileType==='video'?'selected':'')+'>Videos</option><option value="folder" '+(state.fileType==='folder'?'selected':'')+'>Folders</option><option value="other" '+(state.fileType==='other'?'selected':'')+'>Other</option></select>';
  const statusControl=state.activeViewId?'<select id="file-status" class="sort-control" aria-label="Catalog status"><option value="all" '+(state.fileStatus==='all'?'selected':'')+'>All statuses</option><option value="cataloged" '+(state.fileStatus==='cataloged'?'selected':'')+'>Cataloged</option><option value="unobjectified" '+(state.fileStatus==='unobjectified'?'selected':'')+'>Not cataloged</option><option value="missing" '+(state.fileStatus==='missing'?'selected':'')+'>Missing (scan)</option><option value="changed" '+(state.fileStatus==='changed'?'selected':'')+'>Type changed (scan)</option></select>':'';
  const columnsButton=state.view==='table'?'<button class="text-button" data-action="table-columns" title="Choose table columns" aria-label="Choose table columns">'+icon('table',15)+' <span>Columns</span></button>':'';
  const scanControls=state.activeViewId?'<button class="text-button" data-action="'+(state.scanBusy?'cancel-scan':'scan-folders')+'" title="Read-only scan of granted Catalog Folders">'+icon(state.scanBusy?'close':'search',15)+' <span>'+(state.scanBusy?'Cancel':'Scan')+'</span></button><span class="scan-status" id="scan-status" title="Scans are temporary snapshots; incomplete roots are not marked missing">'+escapeHTML(scanStatus())+'</span>':'';
  const sortControl=plain?'':'<select id="sort-mode" class="sort-control" aria-label="Sort"><option value="name" '+(state.sort==='name'?'selected':'')+'>Name ↑</option><option value="name-desc" '+(state.sort==='name-desc'?'selected':'')+'>Name ↓</option><option value="type" '+(state.sort==='type'?'selected':'')+'>Type</option><option value="location" '+(state.sort==='location'?'selected':'')+'>Location</option></select>';
  const groupControl=state.activeViewId?'<select id="group-mode" class="sort-control" aria-label="Group by"><option value="none" '+(state.groupBy==='none'?'selected':'')+'>No groups</option><option value="source" '+(state.groupBy==='source'?'selected':'')+'>By source</option><option value="folder" '+(state.groupBy==='folder'?'selected':'')+'>By folder</option><option value="type" '+(state.groupBy==='type'?'selected':'')+'>By type</option></select>':'';
  const activeTab=activeFolderTab();
  const backward=activeTab&&activeTab.position>0;
  const nextward=activeTab&&activeTab.position<activeTab.history.length-1;
  const historyControls=plain
    ?'<button class="icon-button" title="Back" aria-label="Back" data-action="tab-back" '+(backward?'':'disabled')+'>'+icon('back')+'</button><button class="icon-button" title="Forward" aria-label="Forward" data-action="tab-forward" '+(nextward?'':'disabled')+'>'+icon('forward')+'</button>'
    :'';
  $('#app').innerHTML='<div class="shell"><aside id="sidebar" class="sidebar '+(state.sidebar?'open':'')+'"><div class="brand">'+icon('book',22)+'<strong>Sourcebook</strong></div>'+header+rootSection+catalogSection+'<div class="sidebar-footer">'+(plain?'Local folder · read-only':'Local catalog')+'</div></aside><div class="workspace"><header class="topbar">'+button('Navigation','menu','sidebar')+historyControls+'<div class="breadcrumbs" id="breadcrumbs"></div><label class="search">'+icon('search',16)+'<input id="search-input" type="search" placeholder="Search" value="'+escapeHTML(state.search)+'"/></label>'+button('Refresh','refresh','refresh')+button('Gallery','grid','gallery',state.view==='gallery')+button('List','list','list',state.view==='list')+button('Table','table','table',state.view==='table')+button('Inspector','info','inspector',state.inspector)+button('Settings','more','settings')+'</header><div class="contentbar"><h2>'+escapeHTML(viewsUI.title()||state.parts.at(-1)||currentSource()?.name||'Files')+'</h2><span class="count" id="item-count"></span>'+(state.tagFilter?'<button class="filter-pill" data-action="clear-tag-filter" title="Clear tag filter">#'+escapeHTML(tagLeaf(state.tagFilter))+' '+icon('close',12)+'</button>':'')+'<div class="spacer"></div><label class="zoom" '+(state.view==='table'?'hidden':'')+'>'+icon('grid',15)+'<input id="density" type="range" min="110" max="280" value="'+state.size+'" aria-label="Thumbnail size"/></label>'+typeControl+statusControl+sortControl+groupControl+columnsButton+viewActions+scanControls+selectionActions+fileActions+'</div><div id="scroller" class="scroller"><div id="items"></div></div><footer class="footer"><span id="status">Local-first</span><span>'+(plain?'Folder browser':'Sourcebook preview')+'</span></footer></div>'+(state.inspector?'<aside class="inspector"><h3>'+(plain?'File info':'Properties')+'</h3><div id="inspector-data"></div></aside>':'')+'</div>';
  $('#breadcrumbs').innerHTML=viewsUI.inResults()?'<button data-action="exit-catalog-tag">'+icon('database',16)+' Catalog</button><span class="crumb">'+icon('chevron',13)+'</span><button>'+icon('tag',14)+' '+escapeHTML(viewsUI.title())+'</button>':'<button data-crumb="-1">'+icon('folder',16)+' '+escapeHTML(currentSource()?.name||'Files')+'</button>'+state.parts.map((part,i)=>'<span class="crumb">'+icon('chevron',13)+'</span><button data-crumb="'+i+'">'+escapeHTML(part)+'</button>').join('');
  renderItems();renderInspector();
}
function visibleItems(){
  if(viewsUI.inResults())return sortCatalogResults(state.items.filter(item=>(state.fileType==='all'||catalogFileType(item)===state.fileType)&&matchesResourceSearch(item.name,recordTagPaths(item.record,state.taxonomy),state.search)),state.sort);
  const query=state.search.trim();
  const plainQuery=query&&!query.startsWith('#')?query.toLocaleLowerCase():null;
  // Resolve catalog records once per render, rather than scanning all records per item.
  const recordsByPath=new Map();
  if(query||state.tagFilter){
    for(const record of state.records.values()){
      if(record.sourceId===state.sourceId&&!recordsByPath.has(record.path))recordsByPath.set(record.path,record);
    }
  }
  return sortBrowserItems(state.items.filter(item=>{
    if(state.fileType!=='all'&&catalogFileType(item)!==state.fileType)return false;
    const name=cleanName(item.name);
    if(!state.tagFilter&&(!query||(plainQuery&&name.toLocaleLowerCase().includes(plainQuery))))return true;
    const path=[...state.parts,item.name].join('/');
    const paths=recordTagPaths(recordsByPath.get(path),state.taxonomy);
    return matchesResourceSearch(name,paths,query)&&(!state.tagFilter||includesTagPath(paths,state.tagFilter));
  }),state.sort);
}
function resourceCard(item){
  const kind=itemKind(item);
  return '<button class="resource '+(state.selected.has(item.id)?'selected':'')+'" data-item="'+escapeHTML(item.id)+'" title="'+escapeHTML(item.name)+'" aria-selected="'+state.selected.has(item.id)+'"><span class="art '+kind+'">'+icon(kind==='pdf'?'file':kind,kind==='folder'?37:31)+(kind==='image'?'<img loading="lazy" alt="" class="thumbnail"/>':'')+'</span><span class="filename">'+escapeHTML(cleanName(item.name))+'</span><span class="filetype">'+(item.catalogResult?escapeHTML(item.location+(item.missing?' · Missing at scan':'')+(item.changedKind?' · Type changed':'')+(item.unobjectified?' · Not cataloged':'')):kind==='folder'?'Folder':kind)+'</span></button>';
}
function resourceTableRow(item){
  const meta=viewTableMetadata(item,recordTagPaths(itemRecord(item),state.taxonomy));
  const kind=itemKind(item);
  const columns=normalizeTableColumns(state.tableColumns);
  return '<tr class="resource '+(state.selected.has(item.id)?'selected':'')+'" data-item="'+escapeHTML(item.id)+'" tabindex="0" aria-selected="'+state.selected.has(item.id)+'" title="'+escapeHTML(item.name)+'">'+columns.map(key=>{
    if(key==='name')return '<td class="table-name">'+icon(kind==='pdf'?'file':kind,16)+'<span>'+escapeHTML(cleanName(item.name))+'</span></td>';
    const value=key==='tags'?meta.tags.map(tag=>'#'+tag).join(' '):meta[key]??'';
    return '<td class="table-'+key+'" title="'+escapeHTML(String(value))+'">'+escapeHTML(String(value))+'</td>';
  }).join('')+'</tr>';
}
function renderItems(){
  const host=$('#items');if(!host)return;
  state.observer?.disconnect();state.observer=null;
  host.className=state.view+(viewsUI.inResults()?' catalog-results':'');
  host.style.setProperty('--size',state.size+'px');
  const items=visibleItems();
  $('#item-count').textContent=items.length+(state.loading?'+':'')+' items';
  if(!viewsUI.inResults()&&!state.sourceId){host.innerHTML='<div class="empty">'+icon('folder',38)+'<h3>Your files, one click away</h3><p>Choose a folder to browse.</p><button class="primary" data-action="'+(state.catalog?'add-source':'open-folder')+'">Open folder</button></div>';return;}
  if(!viewsUI.inResults()&&!state.handles.has(state.sourceId)){host.innerHTML='<div class="empty">'+icon('alert',35)+'<h3>Reconnect your folder</h3><p>Renew this folder permission to continue.</p><button class="primary" data-action="reconnect">Reconnect source</button></div>';return;}
  if(!items.length){host.innerHTML='<div class="empty">'+icon('folder',32)+'<h3>'+(state.loading?'Reading files…':state.search||state.tagFilter||viewsUI.inResults()?'No matches':'Nothing here yet')+'</h3></div>';return;}
  const shown=items.slice(0,state.pageCount);
  const grouped=!!state.activeViewId&&state.groupBy!=='none';
  const groups=groupViewItems(shown,grouped?state.groupBy:'none');
  const more=items.length>state.pageCount?'<button class="show-more" data-action="show-more">Show more ('+(items.length-state.pageCount)+')</button>':'';
  if(state.view==='table'){
    const columns=normalizeTableColumns(state.tableColumns);
    const groupRows=groups.map(group=>
      (grouped?'<tr class="table-group"><th colspan="'+columns.length+'">'+escapeHTML(group.label)+' <span>'+group.items.length+'</span></th></tr>':'')+
      group.items.map(resourceTableRow).join('')
    ).join('');
    const headers=columns.map(key=>{
      const col=TABLE_COLUMNS.find(entry=>entry.key===key);
      const sortable=['name','type','location'].includes(key);
      return '<th scope="col">'+(sortable?'<button data-table-sort="'+key+'" title="Sort by '+escapeHTML(col.label)+'">'+escapeHTML(col.label)+'</button>':escapeHTML(col.label))+'</th>';
    }).join('');
    host.innerHTML='<table class="view-table"><thead><tr>'+headers+'</tr></thead><tbody>'+groupRows+'</tbody></table>'+more;
  }else if(grouped){
    host.classList.add('grouped');
    host.innerHTML=groups.map(group=>'<section class="resource-group"><h3 class="resource-group-title">'+escapeHTML(group.label)+' <span>'+group.items.length+'</span></h3><div class="group-contents '+state.view+'">'+group.items.map(resourceCard).join('')+'</div></section>').join('')+more;
  }else host.innerHTML=shown.map(resourceCard).join('')+more;
  const watcher=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){watcher.unobserve(entry.target);thumbnail(entry.target);}
  },{root:$('#scroller'),rootMargin:'240px'});
  state.observer=watcher;
  host.querySelectorAll('.resource:has(.thumbnail)').forEach(el=>watcher.observe(el));
  $('#status').textContent=state.selected.size?state.selected.size+' selected':'Local-first · '+items.length+' resources';
}
async function thumbnail(node){
  const item=state.items.find(i=>i.id===node.dataset.item);
  if(!item||!node.isConnected)return;
  const img=$('.thumbnail',node);
  if(!img)return;
  const cached=state.thumbnailUrls.get(item.id);
  if(cached){
    img.onload=()=>node.classList.add('loaded');
    img.src=cached;
    if(img.complete&&img.naturalWidth)node.classList.add('loaded');
    return;
  }
  const request=state.request;
  try{
    const handle=item.catalogResult?await catalogResultHandle(item):item.handle;
    const file=await handle.getFile();
    if(!node.isConnected||request!==state.request)return;
    const url=URL.createObjectURL(file);
    state.imageUrls.add(url);state.thumbnailUrls.set(item.id,url);
    img.onload=()=>node.classList.add('loaded');
    img.onerror=()=>{
      if(state.thumbnailUrls.get(item.id)===url)state.thumbnailUrls.delete(item.id);
      URL.revokeObjectURL(url);state.imageUrls.delete(url);
    };
    img.src=url;
  }catch{}
}
function renderTagPills(){
  const host=$('#tag-pills');if(!host)return;
  host.innerHTML=state.tagDraft.map((tag,index)=>'<span class="tag-pill"><span class="tag-pill-label" title="'+escapeHTML(tag)+'">#'+escapeHTML(tagLeaf(tag))+'</span><button type="button" data-remove-tag="'+index+'" aria-label="Remove tag '+escapeHTML(tag)+'" title="Remove tag">'+icon('close',12)+'</button></span>').join('');
}
function showTagSuggestions(){
  const list=$('#tag-suggestions'),input=$('#tag-input');
  if(!list||!input)return;
  const matches=suggestTagPaths(state.taxonomy,state.tagDraft,input.value);
  state.tagSuggestions=matches;
  state.tagSuggestionIndex=-1;
  list.innerHTML=matches.map((t,i)=>'<button type="button" role="option" aria-selected="false" id="tag-option-'+i+'" class="tag-suggestion" data-tag-suggestion="'+i+'"><strong>#'+escapeHTML(t.name)+'</strong><small>'+escapeHTML(t.path)+'</small></button>').join('');
  list.hidden=!matches.length;
  input.setAttribute('aria-expanded',String(matches.length>0));
  input.removeAttribute('aria-activedescendant');
}
function moveTagSuggestion(direction){
  const list=$('#tag-suggestions'),input=$('#tag-input');
  if(!list||list.hidden||!state.tagSuggestions.length)return false;
  const index=nextTagSuggestionIndex(state.tagSuggestionIndex,direction,state.tagSuggestions.length);
  state.tagSuggestionIndex=index;
  list.querySelectorAll('[data-tag-suggestion]').forEach((option,i)=>{
    option.classList.toggle('active',i===index);
    option.setAttribute('aria-selected',String(i===index));
  });
  input?.setAttribute('aria-activedescendant','tag-option-'+index);
  list.querySelector('#tag-option-'+index)?.scrollIntoView({block:'nearest'});
  return true;
}
function chooseTagSuggestion(index){
  const tag=state.tagSuggestions[index];
  if(!tag)return false;
  const input=$('#tag-input');
  if(!input)return false;
  input.value=tag.path;
  return commitTagInput();
}
function commitTagInput(){
  const input=$('#tag-input');if(!input||!input.value.trim())return true;
  try{state.tagDraft=mergeTagInput(state.tagDraft,input.value);input.value='';renderTagPills();showTagSuggestions();return true;}
  catch(e){toast(errorText(e),true);input.focus();return false;}
}
function renderInspector(){
  const host=$('#inspector-data');if(!host)return;
  if(viewsUI.inResults()){
    const selected=state.selected.size===1?state.items.find(item=>state.selected.has(item.id)):null;
    if(!selected){host.innerHTML='<div class="inspector-placeholder">'+icon('info',32)+'<span>'+(state.selected.size?state.selected.size+' results selected':'Select a resource')+'</span></div>';return;}
    const tags=recordTagPaths(selected.record,state.taxonomy);
    host.innerHTML='<div class="inspector-cover">'+icon(itemKind(selected)==='pdf'?'file':itemKind(selected),40)+'</div><h4>'+escapeHTML(cleanName(selected.name))+'</h4><div class="detail"><div class="label">LOCATION</div><div class="micro-hint">'+escapeHTML(selected.location)+'</div></div>'+(selected.missing?'<div class="micro-hint">Not found during the last completed folder scan. Check the path before editing metadata.</div>':'')+(selected.changedKind?'<div class="micro-hint">Source type differs from catalog metadata. Resolve before editing.</div>':'')+(selected.unobjectified?'<div class="micro-hint">Not cataloged. Reveal in folder to add tags.</div>':'')+'<div class="detail"><div class="label">TAGS</div>'+tags.map(t=>'<span class="tag-pill" title="'+escapeHTML(t)+'">#'+escapeHTML(tagLeaf(t))+'</span>').join(' ')+'</div><button class="secondary full" data-action="reveal-catalog-result">'+icon('folder',16)+' Show in folder</button>';
    return;
  }
  if(state.selected.size!==1){
    if(state.catalog&&state.selected.size>1){
      const key='bulk:'+([...state.selected].sort().join('|'));
      if(state.tagDraftItem!==key){state.tagDraftItem=key;state.tagDraft=[];}
      host.innerHTML='<h4>'+state.selected.size+' selected</h4><div class="detail"><div class="label">BULK TAGS</div><div class="tag-editor"><div class="tag-pills" id="tag-pills"></div><input id="tag-input" aria-label="Bulk tags" placeholder="# Add tag…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="tag-suggestions" aria-expanded="false"/></div><div class="tag-suggestions" id="tag-suggestions" role="listbox" aria-label="Existing tags" hidden></div><div class="micro-hint">Add preserves other tags. Remove matches exact tag paths, not descendants. Maximum 250 per operation.</div></div><button class="primary full" data-action="bulk-add" '+(state.bulkSaving?'disabled':'')+'>'+icon('plus',16)+' Add tags</button><button class="secondary full" data-action="bulk-remove" '+(state.bulkSaving?'disabled':'')+'>'+icon('close',16)+' Remove tags</button><div class="hint">Only catalog JSON changes. Interrupted batches may partially save.</div>';
      renderTagPills();return;
    }
    state.tagDraftItem=null;state.tagDraft=[];
    host.innerHTML='<div class="inspector-placeholder">'+icon('info',32)+'<span>'+(state.selected.size?state.selected.size+' selected':'Select a resource')+'</span></div>';return;
  }
  const item=state.items.find(i=>state.selected.has(i.id));if(!item)return;
  const record=itemRecord(item);
  if(!state.catalog){
    host.innerHTML='<div class="inspector-cover">'+icon(itemKind(item)==='pdf'?'file':itemKind(item),40)+'</div><h4>'+escapeHTML(cleanName(item.name))+'</h4>'+(item.kind==='directory'?'<button class="secondary full" data-action="open-selected-tab">'+icon('plus',15)+' Open in new tab</button>':'')+'<details class="file-details" open><summary>File information</summary><code>'+escapeHTML(item.name)+'</code></details>';
    return;
  }
  if(state.tagDraftItem!==item.id){
    state.tagDraftItem=item.id;state.tagDraft=recordTagPaths(record,state.taxonomy);
  }
  host.innerHTML='<div class="inspector-cover">'+icon(itemKind(item)==='pdf'?'file':itemKind(item),40)+'</div><h4>'+escapeHTML(cleanName(item.name))+'</h4><div class="detail"><div class="label">TAGS</div><div class="tag-editor" id="tag-editor"><div class="tag-pills" id="tag-pills"></div><input id="tag-input" aria-label="Add tag" placeholder="# Add tag…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="tag-suggestions" aria-expanded="false"/></div><div class="tag-suggestions" id="tag-suggestions" role="listbox" aria-label="Existing tags" hidden></div><div class="micro-hint">Nest tags with /, e.g. Architecture / Facades</div></div><div class="detail"><div class="label">NOTES</div><textarea rows="3" id="notes" placeholder="Optional note">'+escapeHTML(record?.notes||'')+'</textarea></div><button class="primary full" data-action="save-resource">'+icon('save',16)+' Save</button><details class="file-details"><summary>File information</summary><code>'+escapeHTML(item.name)+'</code>'+(record?'<div class="micro-hint">ID: '+escapeHTML(record.id)+'</div>':'')+'</details>';
  renderTagPills();
}
function refreshSelectionUI(){
  for(const node of document.querySelectorAll('#items [data-item]')){
    const selected=state.selected.has(node.dataset.item);
    node.classList.toggle('selected',selected);
    node.setAttribute('aria-selected',String(selected));
  }
  const clear=$('[data-action="clear-selection"]');if(clear)clear.hidden=!state.selected.size;
  const status=$('#status');
  if(status)status.textContent=state.selected.size?state.selected.size+' selected':'Local-first · '+state.items.length+' resources';
}
function select(item,event){
  if(state.bulkSaving)return;
  if(event.shiftKey&&state.lastSelected){
    state.selected=new Set(selectionRangeIds(visibleItems(),state.lastSelected,item.id));
  }else if(event.ctrlKey||event.metaKey||state.selectionMode){if(state.selected.has(item.id))state.selected.delete(item.id);else state.selected.add(item.id);}
  else{state.selected.clear();state.selected.add(item.id);}
  state.lastSelected=item.id;
  refreshSelectionUI();renderInspector();
}
async function bulkTags(mode){
  if(!state.catalog||state.bulkSaving||state.resourceSaving||state.selected.size<2)return;
  if(!commitTagInput())return;
  const items=state.items.filter(item=>state.selected.has(item.id));
  if(items.length!==state.selected.size)return toast('Selection changed. Select again.',true);
  const sourceId=state.sourceId,parts=[...state.parts],catalogHandle=state.catalogHandle,tags=[...state.tagDraft];
  state.bulkSaving=true;
  try{
    if(!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission is needed.');
    const root=state.handles.get(sourceId);
    if(!root||!await authorized(root,'read'))throw Error('Reconnect the source.');
    const folder=await nested(root,parts);
    for(const item of items){
      const live=item.kind==='directory'?await folder.getDirectoryHandle(item.name):await folder.getFileHandle(item.name);
      if(typeof live.isSameEntry==='function'&&typeof item.handle?.isSameEntry==='function'&&!await live.isSameEntry(item.handle))throw Error('Source entry changed: '+item.name);
    }
    const previous=[...state.records.values()];
    await refreshRecords();
    const records=[...state.records.values()];
    assertSelectedUnchanged(previous,records,items,sourceId,parts);
    const latest=await readJson(catalogHandle,'catalog.json');
    if(!latest||latest.id!==state.catalog.id||latest.code!==state.catalog.code)throw Error('Catalog identity changed.');
    if(state.catalogHandle!==catalogHandle||state.sourceId!==sourceId||JSON.stringify(state.parts)!==JSON.stringify(parts)||items.some(item=>!state.selected.has(item.id)))throw Error('Selection or location changed during bulk edit.');
    const plan=planBulkTags({catalog:latest,taxonomy:state.taxonomy,records,items,sourceId,parts,paths:tags,mode,siblingNames:state.items.map(item=>item.name)});
    if(!plan.changes.length){toast('No changes needed.');return;}
    const count=await commitBulkTags({handle:catalogHandle,plan,expectedCatalog:latest,expectedTaxonomy:state.taxonomy});
    toast('Updated '+count+' catalog records · source files unchanged');
    state.tagDraftItem=null;state.tagDraft=[];
  }catch(error){toast('Bulk tags failed: '+errorText(error),true);}
  finally{
    try{
      state.taxonomy=await readJson(state.catalogHandle,'tags.json',[]);
      state.catalog=await readJson(state.catalogHandle,'catalog.json');
      await refreshRecords();
    }catch(error){toast('Catalog refresh failed: '+errorText(error),true);}
    state.bulkSaving=false;render();
  }
}
async function saveResource(){
  if(!state.catalog)return;
  if(state.bulkSaving||state.resourceSaving)return toast('Finish the current metadata save first.',true);
  const item=state.items.find(i=>state.selected.has(i.id));if(!item)return;
  if(!commitTagInput())return;
  const tags=[...state.tagDraft],notes=$('#notes')?.value||'';
  const previous=itemRecord(item),root=sourceHandle(),sourceId=state.sourceId,parts=[...state.parts];
  state.resourceSaving=true;
  try{
    await assertLiveSourceEntry(root,parts,item);
    if(!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission is needed to save metadata.');
    const latest=await readJson(state.catalogHandle,'catalog.json');
    if(!latest||latest.id!==state.catalog.id||latest.code!==state.catalog.code)throw Error('Catalog identity changed. Reopen the catalog.');
    await refreshRecords();
    const current=itemRecord(item);
    if(!previous&&current)throw Error('This resource was cataloged on disk since selection. Reopen the catalog before saving.');
    if(current&&current.kind!==item.kind)throw Error('Resource type changed on disk. Reopen the catalog.');
    if(previous && (!current||JSON.stringify(previous)!==JSON.stringify(current))){
      throw Error('This resource changed on disk. Reopen the catalog before saving.');
    }
    const diskTags=await readJson(state.catalogHandle,'tags.json',[]);
    assertTagSnapshotUnchanged(state.taxonomy,diskTags);
    let taxonomy=diskTags,tagIds=[];
    for(const path of tags){
      const result=ensureTagPath(taxonomy,path);
      taxonomy=result.tags;tagIds.push(result.id);
    }
    if(taxonomy.length!==diskTags.length){
      await writeJson(state.catalogHandle,'tags.json',taxonomy);
      if(JSON.stringify(await readJson(state.catalogHandle,'tags.json'))!==JSON.stringify(taxonomy))throw Error('Tag write could not be verified');
    }
    await assertLiveSourceEntry(root,parts,item);
    state.taxonomy=taxonomy;
    const dir=await state.catalogHandle.getDirectoryHandle('resources',{create:true});
    if(current){
      const updated={...current,tagIds,notes,updatedAt:new Date().toISOString()};
      delete updated.tags;
      await writeJson(dir,updated.id+'.json',updated);
      if(JSON.stringify(await readJson(dir,updated.id+'.json'))!==JSON.stringify(updated))throw Error('Resource write could not be verified');
      state.records.set(updated.id,updated);
      toast('Properties saved in catalog');
    }else{
      // Source files are NEVER renamed as a side effect of saving metadata.
      const plan=planResourceIdentity(latest,[...state.records.values()],item.name,state.items.map(i=>i.name));
      if(await readJson(dir,plan.id+'.json'))throw Error('Identity already exists. Reopen the catalog and retry.');
      const record={formatVersion:1,id:plan.id,kind:item.kind,sourceId:state.sourceId,path:[...state.parts,item.name].join('/'),tagIds,notes,renamed:false,updatedAt:new Date().toISOString()};
      await writeJson(dir,record.id+'.json',record);
      if(JSON.stringify(await readJson(dir,record.id+'.json'))!==JSON.stringify(record))throw Error('Resource write could not be verified');
      state.records.set(record.id,record);
      if(plan.nextSequence>latest.nextSequence){
        const next={...latest,nextSequence:plan.nextSequence};
        await writeJson(state.catalogHandle,'catalog.json',next);
        if(JSON.stringify(await readJson(state.catalogHandle,'catalog.json'))!==JSON.stringify(next))throw Error('Catalog sequence write could not be verified');
        state.catalog=next;
      }
      toast('Saved to catalog · original file unchanged');
    }
    state.tagDraftItem=null;
    render();
  }catch(e){
    toast('Save failed: '+errorText(e),true);
    try{
      state.taxonomy=await readJson(state.catalogHandle,'tags.json',[]);
      state.catalog=await readJson(state.catalogHandle,'catalog.json');
      await refreshRecords();render();
    }catch(error){toast('Catalog refresh failed: '+errorText(error),true);}
  }finally{state.resourceSaving=false;}
}
function closePreview(){
  $('#viewer')?.remove();
  if(state.previewUrl){URL.revokeObjectURL(state.previewUrl);state.previewUrl=null;}
  state.previewId=null;
}
async function showPreview(item){
  if(!item){item=state.items.find(i=>state.selected.has(i.id));}
  if(!item)return;
  if(item.catalogResult&&item.kind==='directory')return revealCatalogResult(item);
  if(item.kind==='directory')return navigate(state.sourceId,[...state.parts,item.name]);
  closePreview();
  try{
    const handle=item.catalogResult?await catalogResultHandle(item):item.handle;
    const file=await handle.getFile();
    const kind=itemKind(item);
    const url=URL.createObjectURL(file);state.previewUrl=url;state.previewId=item.id;
    let body='<div class="unsupported">'+icon('file',65)+'<p>Preview unavailable for this format</p><a download="'+escapeHTML(item.name)+'" href="'+url+'">Download file</a></div>';
    if(kind==='image')body='<img class="viewer-image" src="'+url+'" alt="'+escapeHTML(item.name)+'"/>';
    if(kind==='pdf')body='<iframe class="viewer-pdf" src="'+url+'#toolbar=0" title="PDF preview"></iframe>';
    if(kind==='video')body='<video class="viewer-video" src="'+url+'" controls autoplay></video>';
    if(/\.(txt|md|json|css|js|ts|csv|html)$/i.test(item.name))body='<pre class="viewer-text">'+escapeHTML((await file.text()).slice(0,200000))+'</pre>';
    const panel=document.createElement('div');panel.id='viewer';panel.className='viewer';
    panel.innerHTML='<header><span>'+escapeHTML(cleanName(item.name))+'</span>'+button('Close','close','close-viewer')+'</header><main>'+body+'</main><footer>← → next file <span>Esc to close</span></footer>';
    document.body.append(panel);
  }catch(e){toast(errorText(e),true);}
}
function previewStep(offset){
  const files=state.items.filter(i=>i.kind==='file');
  const i=files.findIndex(f=>f.id===state.previewId);
  if(i>=0&&files.length)showPreview(files[(i+offset+files.length)%files.length]);
}
async function newFolder(){
  if(!state.catalog||!sourceHandle())return;
  if(state.scanBusy||state.resourceSaving)return toast('Finish the current operation first.',true);
  const name=prompt('Name of new folder:','New folder');
  if(!name)return;
  if(!validName(name))return toast('Invalid folder name',true);
  try{if(!await authorized(sourceHandle(),'readwrite'))throw Error('Write access is required to create a folder.');const dir=await nested(sourceHandle(),state.parts);await dir.getDirectoryHandle(name,{create:true});invalidateScan();await navigate(state.sourceId,state.parts);toast('Folder created');}
  catch(e){toast(errorText(e),true);}
}
async function importFiles(){
  if(!state.catalog)return;
  if(state.scanBusy||state.resourceSaving)return toast('Finish the current operation first.',true);
  try{
    if(!await authorized(sourceHandle(),'readwrite'))throw Error('Write access is required to import files.');
    if(typeof window.showOpenFilePicker!=='function')throw Error('File import picker is unavailable in this browser.');
    const chosen=await window.showOpenFilePicker({multiple:true});
    const dest=await nested(sourceHandle(),state.parts);
    let count=0;
    for(const handle of chosen){
      const file=await handle.getFile();
      let name=file.name,n=2;
      while(true){
        try{await dest.getFileHandle(name);const dot=file.name.lastIndexOf('.');name=dot>0?file.name.slice(0,dot)+' ('+(n++)+')'+file.name.slice(dot):file.name+' ('+(n++)+')';}
        catch(e){if(e.name==='NotFoundError')break;throw e;}
      }
      const output=await dest.getFileHandle(name,{create:true});
      const writer=await output.createWritable();
      try{await writer.write(file);await writer.close();count++;}
      catch(e){try{await writer.abort();}catch{}throw e;}
    }
    invalidateScan();await navigate(state.sourceId,state.parts);toast('Imported '+count+' file(s)');
  }catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
document.addEventListener('submit',event=>{
  if(event.target.id==='catalog-form'){event.preventDefault();submitCatalog(event.target);}
  if(event.target.id==='table-columns-form'){
    event.preventDefault();
    try{
      const columns=[...event.target.querySelectorAll('input[name="tableColumn"]:checked')].map(input=>input.value);
      state.tableColumns=normalizeTableColumns(columns);
      $('#dialog')?.remove();render();
    }catch(error){toast(errorText(error),true);}
  }
  if(event.target.id==='view-form'){
    event.preventDefault();
    const form=event.target;
    let task;
    try{
      if(form.dataset.rename==='true')task=viewsUI.rename(form.elements.name.value.trim());
      else {
        const tags=selectedViewTags(form);
        task=form.dataset.editTags==='true'?viewsUI.update(tags):viewsUI.save(form.elements.name.value.trim(),tags);
      }
    }catch(e){toast(e.message||String(e),true);return;}
    void task.then(ok=>{if(ok)$('#dialog')?.remove();});
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='tag-input')showTagSuggestions();
  if(event.target.id==='view-tag-search'){
    const q=event.target.value.trim().toLocaleLowerCase();
    for(const label of document.querySelectorAll('[data-view-tag-option]'))label.hidden=!!q&&!label.dataset.viewTagOption.includes(q);
  }
  if(event.target.id==='accent-color')applyAccent(event.target.value);
  if(event.target.id==='search-input'){state.search=event.target.value;state.pageCount=150;state.selected.clear();state.lastSelected=null;state.tagDraftItem=null;renderItems();renderInspector();}
  if(event.target.id==='sort-mode'){state.sort=event.target.value;renderItems();}
  if(event.target.id==='group-mode'){state.groupBy=event.target.value;state.pageCount=150;renderItems();}
  if(event.target.id==='file-status'){
    state.fileStatus=event.target.value;
    state.selected.clear();state.lastSelected=null;state.pageCount=150;
    if(state.activeViewId)viewsUI.requery();
  }
  if(event.target.id==='file-type'){
    state.fileType=event.target.value;state.selected.clear();state.lastSelected=null;state.tagDraftItem=null;state.pageCount=150;
    if(state.activeViewId)viewsUI.requery();else {renderItems();renderInspector();}
  }
  if(event.target.id==='density'){state.size=Number(event.target.value);localStorage.setItem('sb-size',state.size);$('#items')?.style.setProperty('--size',state.size+'px');}
});
document.addEventListener('click',async event=>{
  $('#folder-context')?.remove();
  const suggestion=event.target.closest('[data-tag-suggestion]');
  if(suggestion){chooseTagSuggestion(Number(suggestion.dataset.tagSuggestion));$('#tag-input')?.focus();return;}
  const viewButton=event.target.closest('[data-open-view]');if(viewButton){viewsUI.open(viewButton.dataset.openView);return;}
  const pinButton=event.target.closest('[data-pin-view]');if(pinButton){void viewsUI.togglePin(pinButton.dataset.pinView);return;}
  const deleteButton=event.target.closest('[data-delete-view]');if(deleteButton){void viewsUI.remove(deleteButton.dataset.deleteView);return;}
  const pin=event.target.closest('[data-toggle-tag-pin]');
  if(pin){await togglePin(pin.dataset.toggleTagPin);return;}
  const tagNav=event.target.closest('[data-tag-filter]');
  if(tagNav){openCatalogTagView(tagNav.dataset.tagFilter);return;}
  const removeTag=event.target.closest('[data-remove-tag]');
  if(removeTag){state.tagDraft.splice(Number(removeTag.dataset.removeTag),1);renderTagPills();$('#tag-input')?.focus();return;}
  const crumb=event.target.closest('[data-crumb]');if(crumb){return navigate(state.sourceId,state.parts.slice(0,Number(crumb.dataset.crumb)+1));}
  const closeTab=event.target.closest('[data-close-tab]');if(closeTab){return closePlainFolderTab(closeTab.dataset.closeTab);}
  const catalogFolder=event.target.closest('[data-catalog-folder]');
  if(catalogFolder){state.sidebar=false;return navigate(catalogFolder.dataset.catalogFolder,catalogFolderParts(catalogFolder.dataset.folderPath));}
  const source=event.target.closest('[data-source]');if(source){return state.catalog?navigate(source.dataset.source,[]):switchFolderTab(source.dataset.source);}
  const tile=event.target.closest('[data-item]');if(tile){const item=state.items.find(i=>i.id===tile.dataset.item);if(item)select(item,event);return;}
  const sortColumn=event.target.closest('[data-table-sort]');
  if(sortColumn){
    const mode=sortColumn.dataset.tableSort;
    state.sort=mode==='name'&&state.sort==='name'?'name-desc':mode;
    render();return;
  }
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  switch(action){
    case 'open-folder':choosePlainFolder();break;
    case 'open-selected-tab':openSelectedFolderTab().catch(e=>toast(errorText(e),true));break;
    case 'tab-back':folderHistoryStep(-1);break;
    case 'tab-forward':folderHistoryStep(1);break;
    case 'create-catalog':createCatalog();break;
    case 'open-catalog':chooseCatalog().catch(e=>toast(errorText(e),true));break;
    case 'recent':recentCatalog().catch(e=>toast(errorText(e),true));break;
    case 'home':if(state.resourceSaving||state.bulkSaving||state.viewSaving)return toast('Finish catalog editing first.',true);landing();break;
    case 'add-source':addSource();break;
    case 'reconnect':reconnect();break;
    case 'refresh':viewsUI.inResults()?void refreshCatalogTagView():navigate(state.sourceId,[...state.parts]);break;
    case 'scan-folders':void runCatalogScan();break;
    case 'cancel-scan':cancelCatalogScan();break;
    case 'exit-catalog-tag':navigate(state.sourceId,[...state.parts]);break;
    case 'reveal-catalog-result':revealCatalogResult(state.items.find(x=>state.selected.has(x.id))).catch(e=>toast(errorText(e),true));break;
    case 'save-view':viewFilterDialog('save');break;
    case 'rename-view':viewFilterDialog('rename');break;
    case 'edit-view-tags':viewFilterDialog('tags');break;
    case 'update-view':void viewsUI.update();break;
    case 'table-columns':openTableColumnsDialog();break;
    case 'gallery':case 'list':case 'table':state.view=action;localStorage.setItem('sb-view',action);render();break;
    case 'inspector':state.inspector=!state.inspector;render();break;
    case 'sidebar':state.sidebar=!state.sidebar;$('#sidebar')?.classList.toggle('open');break;
    case 'show-more':state.pageCount+=150;renderItems();break;
    case 'clear-tag-filter':state.tagFilter=null;state.selected.clear();state.lastSelected=null;render();break;
    case 'toggle-selection':state.selectionMode=!state.selectionMode;render();break;
    case 'clear-selection':state.selected.clear();state.lastSelected=null;state.selectionMode=false;render();break;
    case 'bulk-add':void bulkTags('add');break;
    case 'bulk-remove':void bulkTags('remove');break;
    case 'settings':openDialog('<h2>Settings</h2><p>Minimal interface. One highlight color.</p><label class="setting-row">Highlight color<input id="accent-color" aria-label="Highlight color" type="color" value="'+(localStorage.getItem('sb-accent')||'#5276bd')+'"/></label><div class="dialog-actions"><button type="button" class="secondary" data-action="reset-accent">Default blue</button><button type="button" class="primary" data-action="dismiss">Done</button></div>');break;
    case 'reset-accent':applyAccent('#5276bd');if($('#accent-color'))$('#accent-color').value='#5276bd';break;
    case 'save-resource':saveResource();break;
    case 'preview':showPreview();break;
    case 'close-viewer':closePreview();break;
    case 'create-folder':newFolder();break;
    case 'import':importFiles();break;
  }
});
// Contextual folder action is read-only. Long-press on supported touch browsers
// maps to contextmenu; no source directory is moved or renamed here.
document.addEventListener('contextmenu',event=>{
  if(state.catalog)return;
  const tile=event.target.closest('[data-item]');
  const item=tile&&state.items.find(x=>x.id===tile.dataset.item);
  if(item?.kind!=='directory')return;
  event.preventDefault();$('#folder-context')?.remove();
  select(item,{shiftKey:false,ctrlKey:false,metaKey:false});
  const menu=document.createElement('div');
  menu.id='folder-context';menu.className='folder-context';
  menu.setAttribute('role','menu');
  menu.innerHTML='<button role="menuitem" data-action="open-selected-tab">'+icon('plus',15)+' Open in new tab</button>';
  document.body.append(menu);
  const rect=menu.getBoundingClientRect();
  menu.style.left=Math.max(8,Math.min(event.clientX,window.innerWidth-rect.width-8))+'px';
  menu.style.top=Math.max(8,Math.min(event.clientY,window.innerHeight-rect.height-8))+'px';
});
document.addEventListener('dblclick',event=>{
  const tile=event.target.closest('[data-item]');if(!tile)return;
  const item=state.items.find(i=>i.id===tile.dataset.item);
  if(item)showPreview(item);
});
document.addEventListener('keydown',event=>{
  if(event.target.id==='tag-input'){
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      if(moveTagSuggestion(event.key==='ArrowDown'?1:-1))event.preventDefault();
      return;
    }
    if(event.key==='Enter'||event.key===','){
      event.preventDefault();
      if(event.key==='Enter'&&state.tagSuggestionIndex>=0)chooseTagSuggestion(state.tagSuggestionIndex);
      else commitTagInput();
      return;
    }
    if(event.key==='Backspace'&&!event.target.value&&state.tagDraft.length){state.tagDraft.pop();renderTagPills();return;}
    if(event.key==='Escape'){event.preventDefault();event.target.value='';showTagSuggestions();event.stopPropagation();return;}
  }
  if(!state.catalog&&event.altKey&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();folderHistoryStep(event.key==='ArrowLeft'?-1:1);return;}
  if(event.key==='Escape'){closePreview();$('#dialog')?.remove();$('#folder-context')?.remove();return;}
  if(state.previewId){if(event.key==='ArrowRight')previewStep(1);if(event.key==='ArrowLeft')previewStep(-1);return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#search-input')?.focus();return;}
  if(state.catalog&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'&&!event.target.matches('input,textarea')){event.preventDefault();const items=visibleItems();state.selected=new Set(items.map(item=>item.id));state.lastSelected=items.at(-1)?.id||null;state.selectionMode=true;render();return;}
  if(!state.catalog&&event.ctrlKey&&event.key==='Enter'){const selected=state.items.find(item=>item.id===state.lastSelected);if(selected?.kind==='directory'){event.preventDefault();openSelectedFolderTab().catch(e=>toast(errorText(e),true));}return;}
  // Preserve native keyboard handling for toolbar controls and table-sort buttons.
  if(event.target.matches('input,textarea,select')||event.target.closest('button:not(.resource)')||event.ctrlKey||event.metaKey||event.altKey)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
    const nodes=[...document.querySelectorAll('#items .resource[data-item]')];
    if(!nodes.length)return;
    event.preventDefault();
    const columns=state.view==='list'||state.view==='table'?1:nodes.filter(node=>node.offsetTop===nodes[0].offsetTop).length;
    const current=nodes.findIndex(node=>node.dataset.item===state.lastSelected);
    const target=nextSelectionIndex(current,event.key,nodes.length,columns);
    const next=nodes[target];
    const item=state.items.find(x=>x.id===next.dataset.item);
    if(item){select(item,event);next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest'});}
    return;
  }
  if(event.key==='Enter'){
    const row=event.target.closest('#items tr.resource[data-item]');
    const selected=state.items.find(item=>item.id===(row?.dataset.item||state.lastSelected));
    if(selected){event.preventDefault();if(row)select(selected,{shiftKey:false,ctrlKey:false,metaKey:false});showPreview(selected);}
    return;
  }
  if(event.key===' '){
    const row=event.target.closest('#items tr.resource[data-item]');
    if(row){
      event.preventDefault();
      const item=state.items.find(item=>item.id===row.dataset.item);
      if(item)select(item,{shiftKey:false,ctrlKey:true,metaKey:false});
      return;
    }
    event.preventDefault();showPreview();
  }
  if(event.key==='Backspace'&&state.parts.length){event.preventDefault();navigate(state.sourceId,state.parts.slice(0,-1));}
});
async function boot(){
  if(typeof window.showDirectoryPicker!=='function'){landing();toast('This browser does not provide directory access. Folder browsing is unavailable on this device.',true);return;}
  try{
    if(await getLocal('last-mode')==='folder'){
      const session=loadFolderTabs(await getLocal('folder-tabs-v1'));
      if(!session.tabs.length){
        // Upgrade the previous single-root local preference when present.
        const old=await getLocal('last-folder');
        if(old?.handle&&typeof old.handle.queryPermission==='function'&&await old.handle.queryPermission({mode:'read'})==='granted')return await setPlainFolder(old.handle);
      }
      if(session.tabs.length){
        state.catalog=null;state.catalogHandle=null;state.records.clear();state.taxonomy=[];state.tagFilter=null;
        state.sources=session.tabs;state.handles=new Map(session.tabs.map(tab=>[tab.id,tab.handle]));
        state.sourceId=session.activeId;
        const active=activeFolderTab();
        state.parts=[...active.parts];
        if(await active.handle.queryPermission({mode:'read'})==='granted')return await navigate(active.id,[...active.parts]);
        state.handles.delete(active.id);render();return;
      }
      landing();return;
    }
    const r=await getLocal('recent');
    if(r?.handle&&typeof r.handle.queryPermission==='function'&&await r.handle.queryPermission({mode:'read'})==='granted')return await openDirectory(r.handle);
  }catch(e){console.warn('Restore needs permission',e);}
  landing();
}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
boot().catch(e=>{console.error(e);landing();toast(errorText(e),true);});
