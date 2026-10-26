import {getLocal,setLocal,readJson,writeJson,nested,authorized} from './storage.mjs';
import {CODE_PATTERN,validName,appendToken,ownedToken,parseFilename} from './identity.mjs';

const $=(query,root=document)=>root.querySelector(query);
const state={
  catalog:null, catalogHandle:null, sources:[], handles:new Map(), records:new Map(),
  sourceId:null,parts:[],items:[],selected:new Set(),lastSelected:null,
  search:'', view:localStorage.getItem('sb-view')||'gallery',
  size:Number(localStorage.getItem('sb-size'))||164,
  inspector:true, sidebar:false, loading:false, request:0,
  imageUrls:new Set(), previewUrl:null, previewId:null, pageCount:150
};
const glyphs={
  book:'M3 3h7v18H3z M10 7h4v14h-4z M16 4l5 17 M16 5l3-1',
  folder:'M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  image:'M3 3h18v18H3z M7 16l5-5 3 3 3-3 3 4 M8 8h.01',
  search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z m6-2 4 4',
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  list:'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  plus:'M12 5v14 M5 12h14',
  more:'M5 12h.01 M12 12h.01 M19 12h.01',
  check:'M20 6 9 17l-5-5',
  info:'M15 3v18 M3 3h18v18H3z',
  refresh:'M20 11a8 8 0 0 0-14-5L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14 5l2-2 M20 20v-4h-4',
  upload:'M12 16V3 M7 8l5-5 5 5 M4 17v4h16v-4',
  tag:'M3 3h9l9 9-9 9-9-9z M8 8h.01',
  close:'M18 6 6 18 M6 6l12 12',
  back:'M15 18l-6-6 6-6',
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
function forgetImages(){for(const url of state.imageUrls)URL.revokeObjectURL(url);state.imageUrls.clear();}
function cleanName(name){return parseFilename(name).displayName;}
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
  const token=ownedToken(item.name,state.catalog?.code);
  const path=[...state.parts,item.name].join('/');
  for(const record of state.records.values()){
    if(token&&record.id===state.catalog.code+token.number)return record;
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
  $('#app').innerHTML='<main class="landing"><div class="landing-content"><div class="landing-logo">'+icon('book',35)+'</div><h1>Sourcebook</h1><p>Your files, beautifully organized.</p><div class="landing-actions"><button class="primary" data-action="create-catalog">'+icon('plus')+' New catalog</button><button class="secondary" data-action="open-catalog">'+icon('folder')+' Open catalog</button></div><div id="recent-area"></div><span class="landing-foot">Local-first. No imports required. Your files stay yours.</span></div></main>';
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
  try{const h=await window.showDirectoryPicker({mode:'readwrite'});await openDirectory(h);}
  catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function openDirectory(h){
  const config=await readJson(h,'catalog.json');
  if(!config?.id||!CODE_PATTERN.test(config.code))throw Error('Choose a .sb directory containing catalog.json.');
  state.catalog=config;state.catalogHandle=h;
  state.sources=await readJson(h,'sources.json',[]);
  state.handles.clear();state.records.clear();
  for(const s of state.sources){const v=await getLocal('source:'+config.id+':'+s.id);if(v)state.handles.set(s.id,v);}
  const records=await h.getDirectoryHandle('resources',{create:true});
  for await(const [name,handle] of records.entries()){
    if(handle.kind!=='file'||!name.endsWith('.json'))continue;
    try{const r=JSON.parse(await (await handle.getFile()).text());if(r?.id)state.records.set(r.id,r);}catch(e){console.warn('Invalid resource record',name,e);}
  }
  await setLocal('recent',{handle:h,name:config.name});
  state.sourceId=state.sources[0]?.id||null;
  state.parts=[];state.items=[];state.selected.clear();state.search='';
  render();
  if(state.sourceId)await navigate(state.sourceId,[]);
}
async function addSource(){
  try{
    const h=await window.showDirectoryPicker({mode:'readwrite'});
    const item={id:crypto.randomUUID(),name:h.name};
    state.sources.push(item);
    await writeJson(state.catalogHandle,'sources.json',state.sources);
    await setLocal('source:'+state.catalog.id+':'+item.id,h);
    state.handles.set(item.id,h);
    toast('Added '+h.name);await navigate(item.id,[]);
  }catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function reconnect(){
  try{
    const h=await window.showDirectoryPicker({mode:'readwrite'});
    await setLocal('source:'+state.catalog.id+':'+state.sourceId,h);
    state.handles.set(state.sourceId,h);
    await navigate(state.sourceId,[]);
  }catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
async function navigate(id,parts){
  state.sourceId=id;state.parts=parts;state.search='';state.selected.clear();state.pageCount=150;
  const request=++state.request;
  state.loading=true;state.items=[];forgetImages();render();
  try{
    const h=sourceHandle();if(!h)throw Error('This source is disconnected on this device.');
    if(!await authorized(h))throw Error('Permission expired; reconnect the source.');
    const folder=await nested(h,parts);const items=[];
    for await(const [name,handle] of folder.entries()){
      if(request!==state.request)return;
      if(handle.kind==='directory'&&name.endsWith('.sb'))continue;
      items.push({id:id+':'+[...parts,name].join('/'),name,handle,kind:handle.kind});
      if(items.length%100===0){state.items=sort(items);renderItems();}
    }
    if(request!==state.request)return;
    state.items=sort(items);state.loading=false;render();
  }catch(e){if(request===state.request){state.loading=false;render();toast(errorText(e),true);}}
}
function sort(items){return [...items].sort((a,b)=>((a.kind==='directory'?-1:1)-(b.kind==='directory'?-1:1))||a.name.localeCompare(b.name,undefined,{numeric:true}));}
function render(){
  if(!state.catalog)return landing();
  document.title=(state.parts.at(-1)||currentSource()?.name||state.catalog.name)+' — Sourcebook';
  const sources=state.sources.map(s=>'<button class="nav-item '+(s.id===state.sourceId?'selected':'')+'" data-source="'+escapeHTML(s.id)+'">'+icon('folder',17)+'<span>'+escapeHTML(s.name)+'</span>'+(!state.handles.has(s.id)?icon('alert',14):'')+'</button>').join('');
  $('#app').innerHTML='<div class="shell"><aside id="sidebar" class="sidebar '+(state.sidebar?'open':'')+'"><div class="brand">'+icon('book',23)+'<strong>Sourcebook</strong></div><button class="catalog-chip" data-action="home">'+icon('database')+'<span>'+escapeHTML(state.catalog.name)+'</span>'+icon('chevron',13)+'</button><div class="section-head"><span>SOURCES</span>'+button('Add source','plus','add-source')+'</div><nav>'+sources+'</nav><div class="section-head"><span>ORGANIZE</span></div><div class="nav-item disabled">'+icon('tag',17)+' Nested tags <small>upcoming</small></div><div class="nav-item disabled">'+icon('bookmark',17)+' Collections <small>upcoming</small></div><div class="sidebar-footer"><span class="status-light"></span> Local catalog · early preview</div></aside><div class="workspace"><header class="topbar">'+button('Navigation','menu','sidebar')+'<div class="breadcrumbs" id="breadcrumbs"></div><label class="search">'+icon('search',16)+'<input id="search-input" type="search" placeholder="Search this folder" value="'+escapeHTML(state.search)+'"/></label>'+button('Refresh','refresh','refresh')+button('Gallery','grid','gallery',state.view==='gallery')+button('List','list','list',state.view==='list')+button('Inspector','info','inspector',state.inspector)+'</header><div class="contentbar"><h2>'+escapeHTML(state.parts.at(-1)||currentSource()?.name||'Sources')+'</h2><span class="count" id="item-count"></span><div class="spacer"></div><label class="zoom">'+icon('grid',15)+'<input id="density" type="range" min="110" max="280" value="'+state.size+'" aria-label="Thumbnail size"/></label><button class="text-button" data-action="create-folder">'+icon('plus')+' <span>New folder</span></button><button class="text-button" data-action="import">'+icon('upload')+' <span>Add files</span></button></div><div id="scroller" class="scroller"><div id="items"></div></div><footer class="footer"><span id="status">Local-first</span><span>V0.0 preview</span></footer></div>'+(state.inspector?'<aside class="inspector"><h3>Details</h3><div id="inspector-data"></div></aside>':'')+'</div>';
  $('#breadcrumbs').innerHTML='<button data-crumb="-1">'+icon('folder',16)+' '+escapeHTML(currentSource()?.name||'Sources')+'</button>'+state.parts.map((part,i)=>'<span class="crumb">'+icon('chevron',13)+'</span><button data-crumb="'+i+'">'+escapeHTML(part)+'</button>').join('');
  renderItems();renderInspector();
}
function renderItems(){
  const host=$('#items');if(!host)return;
  host.className=state.view;
  host.style.setProperty('--size',state.size+'px');
  const items=state.items.filter(x=>cleanName(x.name).toLowerCase().includes(state.search.toLowerCase()));
  $('#item-count').textContent=items.length+(state.loading?'+':'')+' items';
  if(!state.sourceId){host.innerHTML='<div class="empty">'+icon('folder',38)+'<h3>Your files, one click away</h3><p>Add a source folder to begin browsing.</p><button class="primary" data-action="add-source">Add folder</button></div>';return;}
  if(!state.handles.has(state.sourceId)){host.innerHTML='<div class="empty">'+icon('alert',35)+'<h3>Reconnect your folder</h3><p>This catalog source needs a folder permission on this device.</p><button class="primary" data-action="reconnect">Reconnect source</button></div>';return;}
  if(!items.length){host.innerHTML='<div class="empty">'+icon('folder',32)+'<h3>'+(state.loading?'Reading files…':state.search?'No matches':'Nothing here yet')+'</h3></div>';return;}
  host.innerHTML=items.slice(0,state.pageCount).map(item=>{
    const kind=itemKind(item);
    return '<button class="resource '+(state.selected.has(item.id)?'selected':'')+'" data-item="'+escapeHTML(item.id)+'" title="'+escapeHTML(item.name)+'" aria-selected="'+state.selected.has(item.id)+'"><span class="art '+kind+'">'+icon(kind==='pdf'?'file':kind,kind==='folder'?37:31)+(kind==='image'?'<img loading="lazy" alt="" class="thumbnail"/>':'')+'</span><span class="filename">'+escapeHTML(cleanName(item.name))+'</span><span class="filetype">'+(kind==='folder'?'Folder':kind)+'</span></button>';
  }).join('')+(items.length>state.pageCount?'<button class="show-more" data-action="show-more">Show more ('+(items.length-state.pageCount)+')</button>':'');
  const watcher=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){watcher.unobserve(entry.target);thumbnail(entry.target);}
  },{root:$('#scroller'),rootMargin:'240px'});
  host.querySelectorAll('.resource:has(.thumbnail)').forEach(el=>watcher.observe(el));
  $('#status').textContent=state.selected.size?state.selected.size+' selected':'Local-first · '+items.length+' resources';
}
async function thumbnail(node){
  const item=state.items.find(i=>i.id===node.dataset.item);
  if(!item||!node.isConnected)return;
  try{
    const url=URL.createObjectURL(await item.handle.getFile());state.imageUrls.add(url);
    if(!node.isConnected){URL.revokeObjectURL(url);state.imageUrls.delete(url);return;}
    const img=$('.thumbnail',node);
    if(img){img.src=url;img.onload=()=>node.classList.add('loaded');img.onerror=()=>{URL.revokeObjectURL(url);state.imageUrls.delete(url);};}
  }catch{}
}
function renderInspector(){
  const host=$('#inspector-data');if(!host)return;
  if(state.selected.size!==1){host.innerHTML='<div class="inspector-placeholder">'+icon('info',32)+'<span>'+(state.selected.size?state.selected.size+' selected':'Select a resource')+'</span></div>';return;}
  const item=state.items.find(i=>state.selected.has(i.id));if(!item)return;
  const record=itemRecord(item);
  host.innerHTML='<div class="inspector-cover">'+icon(itemKind(item)==='pdf'?'file':itemKind(item),46)+'</div><h4>'+escapeHTML(cleanName(item.name))+'</h4><div class="detail"><div class="label">REAL FILENAME</div><code>'+escapeHTML(item.name)+'</code></div><div class="detail"><div class="label">TAGS <small>(comma separated)</small></div><input id="tags" value="'+escapeHTML((record?.tags||[]).join(', '))+'" placeholder="Architecture, Materials…"/></div><div class="detail"><div class="label">NOTES</div><textarea rows="4" id="notes" placeholder="Write a note…">'+escapeHTML(record?.notes||'')+'</textarea></div><button class="primary full" data-action="save-resource">'+icon('save')+' '+(record?'Save properties':'Objectify & save')+'</button><p class="hint">'+(record?'Catalog identity: '+escapeHTML(record.id):'Stores metadata in your catalog. Adds a filename ID if safe rename is supported.')+'</p><button class="secondary full" data-action="preview">'+icon('view')+' Quick look</button>';
}
function select(item,event){
  if(event.shiftKey&&state.lastSelected){
    const a=state.items.findIndex(i=>i.id===state.lastSelected),b=state.items.findIndex(i=>i.id===item.id);
    if(a>=0&&b>=0){state.selected.clear();for(let x=Math.min(a,b);x<=Math.max(a,b);x++)state.selected.add(state.items[x].id);}
  }else if(event.ctrlKey||event.metaKey){if(state.selected.has(item.id))state.selected.delete(item.id);else state.selected.add(item.id);}
  else{state.selected.clear();state.selected.add(item.id);}
  state.lastSelected=item.id;
  renderItems();renderInspector();
}
async function saveResource(){
  const item=state.items.find(i=>state.selected.has(i.id));if(!item)return;
  const tags=($('#tags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),notes=$('#notes')?.value||'';
  let record=itemRecord(item);
  try{
    if(!record){
      const number=state.catalog.nextSequence;
      const id=state.catalog.code+number;
      const config={...state.catalog,nextSequence:number+1};
      await writeJson(state.catalogHandle,'catalog.json',config);
      state.catalog=config;
      let renamed=false;
      if(item.kind==='file'&&!ownedToken(item.name,config.code)&&typeof item.handle.move==='function'){
        try{
          const name=appendToken(item.name,config.code,number);
          await item.handle.move(name);item.name=name;renamed=true;
        }catch(e){console.info('Safe rename unavailable; saving catalog-only association.',e);}
      }
      record={formatVersion:1,id,kind:item.kind,sourceId:state.sourceId,path:[...state.parts,item.name].join('/'),tags,notes,renamed,updatedAt:new Date().toISOString()};
    }else{record={...record,tags,notes,updatedAt:new Date().toISOString()};}
    const dir=await state.catalogHandle.getDirectoryHandle('resources',{create:true});
    await writeJson(dir,record.id+'.json',record);state.records.set(record.id,record);
    toast(record.renamed?'Saved with filename ID':'Saved catalog metadata');
    await navigate(state.sourceId,[...state.parts]);
  }catch(e){toast('Save failed: '+errorText(e),true);}
}
function closePreview(){
  $('#viewer')?.remove();
  if(state.previewUrl){URL.revokeObjectURL(state.previewUrl);state.previewUrl=null;}
  state.previewId=null;
}
async function showPreview(item){
  if(!item){item=state.items.find(i=>state.selected.has(i.id));}
  if(!item)return;
  if(item.kind==='directory')return navigate(state.sourceId,[...state.parts,item.name]);
  closePreview();
  try{
    const file=await item.handle.getFile();
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
  if(!sourceHandle())return;
  const name=prompt('Name of new folder:','New folder');
  if(!name)return;
  if(!validName(name))return toast('Invalid folder name',true);
  try{const dir=await nested(sourceHandle(),state.parts);await dir.getDirectoryHandle(name,{create:true});await navigate(state.sourceId,state.parts);toast('Folder created');}
  catch(e){toast(errorText(e),true);}
}
async function importFiles(){
  try{
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
    await navigate(state.sourceId,state.parts);toast('Imported '+count+' file(s)');
  }catch(e){if(e.name!=='AbortError')toast(errorText(e),true);}
}
document.addEventListener('submit',event=>{
  if(event.target.id==='catalog-form'){event.preventDefault();submitCatalog(event.target);}
});
document.addEventListener('input',event=>{
  if(event.target.id==='search-input'){state.search=event.target.value;state.pageCount=150;renderItems();}
  if(event.target.id==='density'){state.size=Number(event.target.value);localStorage.setItem('sb-size',state.size);$('#items')?.style.setProperty('--size',state.size+'px');}
});
document.addEventListener('click',async event=>{
  const crumb=event.target.closest('[data-crumb]');if(crumb){return navigate(state.sourceId,state.parts.slice(0,Number(crumb.dataset.crumb)+1));}
  const source=event.target.closest('[data-source]');if(source){state.sidebar=false;return navigate(source.dataset.source,[]);}
  const tile=event.target.closest('[data-item]');if(tile){const item=state.items.find(i=>i.id===tile.dataset.item);if(item)select(item,event);return;}
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  switch(action){
    case 'create-catalog':createCatalog();break;
    case 'open-catalog':chooseCatalog().catch(e=>toast(errorText(e),true));break;
    case 'recent':recentCatalog().catch(e=>toast(errorText(e),true));break;
    case 'home':landing();break;
    case 'add-source':addSource();break;
    case 'reconnect':reconnect();break;
    case 'refresh':navigate(state.sourceId,[...state.parts]);break;
    case 'gallery':case 'list':state.view=action;localStorage.setItem('sb-view',action);render();break;
    case 'inspector':state.inspector=!state.inspector;render();break;
    case 'sidebar':state.sidebar=!state.sidebar;$('#sidebar')?.classList.toggle('open');break;
    case 'show-more':state.pageCount+=150;renderItems();break;
    case 'save-resource':saveResource();break;
    case 'preview':showPreview();break;
    case 'close-viewer':closePreview();break;
    case 'create-folder':newFolder();break;
    case 'import':importFiles();break;
  }
});
document.addEventListener('dblclick',event=>{
  const tile=event.target.closest('[data-item]');if(!tile)return;
  const item=state.items.find(i=>i.id===tile.dataset.item);
  if(item)showPreview(item);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closePreview();$('#dialog')?.remove();return;}
  if(state.previewId){if(event.key==='ArrowRight')previewStep(1);if(event.key==='ArrowLeft')previewStep(-1);return;}
  if(event.target.matches('input,textarea'))return;
  if(event.key===' '){event.preventDefault();showPreview();}
  if(event.key==='Backspace'&&state.parts.length){event.preventDefault();navigate(state.sourceId,state.parts.slice(0,-1));}
  if((event.ctrlKey||event.metaKey)&&event.key==='k'){event.preventDefault();$('#search-input')?.focus();}
});
async function boot(){
  if(!('showDirectoryPicker'in window)){landing();toast('Use Chrome with the File System Access API.',true);return;}
  try{
    const r=await getLocal('recent');
    if(r?.handle&&await authorized(r.handle,'read'))return await openDirectory(r.handle);
  }catch(e){console.warn('Restore needs permission',e);}
  landing();
}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
boot().catch(e=>{console.error(e);landing();toast(errorText(e),true);});
