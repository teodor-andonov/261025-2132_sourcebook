// Optional Catalog URL manager. All writes are explicit, journaled Catalog
// metadata transactions. Device-staged links are NEVER removed on import.
import {LINK_CAPTURE_KEY,normalizeCaptureStore,normalizeCaptureURL} from './link-capture.mjs';
import {catalogURLName,planCatalogURLImport,planCatalogURLEdit,validateCatalogURLRecord} from './catalog-urls.mjs';
import {ensureTagPath,recordTagPaths,assertTagSnapshotUnchanged} from './tags.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const snapshot=records=>JSON.stringify([...records].sort((a,b)=>String(a.id).localeCompare(String(b.id))));
const splitTags=value=>{
  const paths=String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(paths.length>16)throw Error('Choose at most 16 tag paths');
  if(new Set(paths.map(x=>x.toLocaleLowerCase())).size!==paths.length)throw Error('Duplicate tag paths');
  return paths;
};
function withTags(taxonomy,paths){
  let next=taxonomy;const ids=[];
  for(const path of paths){
    const result=ensureTagPath(next,path);
    next=result.tags;ids.push(result.id);
  }
  return {taxonomy:next,tagIds:ids};
}
export function createCatalogLinksUI({state,openDialog,escapeHTML,toast,getLocal,readJson,authorized,
  refreshRecords,commitCatalogEdits,refreshPendingCatalog,refreshResults,render,showLinks,env=globalThis}){
  let busy=false;
  const $=selector=>env.document.querySelector(selector);
  const records=()=>[...state.records.values()].filter(record=>record?.kind==='url');
  async function write(planner){
    if(busy||state.resourceSaving||state.bulkSaving||state.viewSaving||state.backupBusy)
      throw Error('Finish the current Catalog operation first');
    if(!state.catalog||!state.catalogHandle)throw Error('Open a Catalog first');
    busy=true;state.resourceSaving=true;
    let changed=false,outcome=null;
    try{
      const expectedCatalog=state.catalog,expectedTaxonomy=state.taxonomy;
      const expectedRecords=snapshot(state.records.values());
      if(!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission is required');
      const catalog=await readJson(state.catalogHandle,'catalog.json');
      if(!same(catalog,expectedCatalog))throw Error('Catalog changed on disk. Reopen before importing links');
      const rawTags=await readJson(state.catalogHandle,'tags.json',null),taxonomy=rawTags??[];
      assertTagSnapshotUnchanged(expectedTaxonomy,taxonomy);
      await refreshRecords();
      if(snapshot(state.records.values())!==expectedRecords)
        throw Error('Resource metadata changed on disk. Reopen Catalog links');
      const plan=planner({catalog,taxonomy,rawTags,records:[...state.records.values()]});
      if(plan.changes.length){
        await commitCatalogEdits(plan.changes);
        changed=true;
        state.catalog=await readJson(state.catalogHandle,'catalog.json');
        state.taxonomy=await readJson(state.catalogHandle,'tags.json',[]);
        await refreshRecords();
      }
      outcome=plan.message;
    }catch(error){
      await refreshPendingCatalog();
      toast('Catalog links: '+error.message,true);
      return false;
    }finally{
      state.resourceSaving=false;busy=false;
      if(changed)await refreshResults();
      else render();
    }
    toast(outcome||'Catalog links unchanged');
    return true;
  }
  async function importLinks(links,tagPaths){
    return write(({catalog,taxonomy,rawTags,records})=>{
      const tagged=withTags(taxonomy,tagPaths);
      const plan=planCatalogURLImport(catalog,records,links,{tagIds:tagged.tagIds});
      const changes=[];
      if(plan.newRecords.length){
        if(!same(tagged.taxonomy,taxonomy))
          changes.push({path:'tags.json',before:rawTags,after:tagged.taxonomy});
        if(plan.nextSequence!==catalog.nextSequence)
          changes.push({path:'catalog.json',before:catalog,after:{...catalog,nextSequence:plan.nextSequence}});
        for(const record of plan.newRecords)
          changes.push({path:'resources/'+record.id+'.json',before:null,after:record});
      }
      return {changes,message:plan.newRecords.length+' link(s) added to portable Catalog; '+plan.skipped+' duplicate(s) skipped. Staged links retained.'};
    });
  }
  async function editLink(id,{title,notes,paths}){
    return write(({taxonomy,rawTags,records})=>{
      const current=records.find(record=>record.id===id&&record.kind==='url');
      if(!current)throw Error('Link was removed or changed');
      validateCatalogURLRecord(current);
      const tagged=withTags(taxonomy,paths);
      const updated=planCatalogURLEdit(current,{title,notes,tagIds:tagged.tagIds});
      const changes=[];
      if(!same(tagged.taxonomy,taxonomy))changes.push({path:'tags.json',before:rawTags,after:tagged.taxonomy});
      if(!same(current,updated))changes.push({path:'resources/'+id+'.json',before:current,after:updated});
      return {changes,message:'Catalog link metadata saved. URL and stable ID unchanged.'};
    });
  }
  async function open(){
    if(!state.catalog)return toast('Open a Catalog to store portable links.',true);
    openDialog('<h2>Catalog links</h2><p>Portable URL resources in this .sb Catalog. No page fetches or source-file changes. Import keeps device-staged links intact.</p>'+
      '<div class="dialog-actions"><button type="button" class="secondary" data-catalog-links="show">Show links in results</button></div>'+
      '<form id="catalog-links-form"><label>Add URLs (one per line, up to 20)<textarea name="urls" rows="3" maxlength="45000" placeholder="https://example.org/reference"></textarea></label>'+
      '<label>Tags (optional, comma-separated paths)<input name="tags" maxlength="1000" placeholder="Architecture / References, Research"/></label>'+
      '<div class="dialog-actions"><button type="submit" class="primary">Add URLs to Catalog</button><button type="button" class="secondary" data-catalog-links="staged">Import selected staged links</button></div></form>'+
      '<div class="capture-list" id="catalog-staged-list"></div><h3>Catalog URLs</h3><div class="capture-list" id="catalog-url-list"></div>'+
      '<div class="dialog-actions"><button type="button" class="secondary" data-action="dismiss">Done</button></div>');
    const dialog=$('#dialog');
    async function populate(){
      if(!dialog.isConnected)return;
      const saved=records(),urls=new Set(saved.map(x=>x.url));
      const list=dialog.querySelector('#catalog-url-list');
      list.innerHTML=saved.length?saved.map(record=>{
        try{
          validateCatalogURLRecord(record);
          return '<div class="capture-row"><div class="capture-link"><strong>'+escapeHTML(catalogURLName(record))+
            '</strong><small title="'+escapeHTML(record.url)+'">'+escapeHTML(record.url)+'</small></div>'+
            '<a class="secondary" href="'+escapeHTML(record.url)+'" target="_blank" rel="noopener noreferrer">Open</a>'+
            '<button type="button" class="secondary" data-catalog-links="edit" data-url-id="'+escapeHTML(record.id)+'">Edit</button></div>';
        }catch{return '<p class="micro-hint">Invalid Catalog URL metadata. Repair from a backup before editing.</p>';}
      }).join(''):'<p>No Catalog links yet.</p>';
      const staged=dialog.querySelector('#catalog-staged-list');
      try{
        const store=normalizeCaptureStore(await getLocal(LINK_CAPTURE_KEY));
        if(!dialog.isConnected)return;
        staged.innerHTML='<strong>Staged on this device</strong><p class="micro-hint">Select up to 20 links. Already cataloged links are skipped; device copies remain.</p>'+
          (store.links.length?store.links.map(item=>'<label class="capture-row"><input type="checkbox" data-staged-url="'+escapeHTML(item.id)+'" '+(urls.has(item.url)?'disabled':'')+' />'+
            '<span class="capture-link"><strong>'+escapeHTML(item.title||new URL(item.url).hostname)+'</strong><small>'+escapeHTML(item.url)+'</small></span></label>').join(''):'<p>No staged links.</p>');
      }catch(error){staged.textContent='Cannot read staged links: '+error.message;}
    }
    await populate();
    dialog.querySelector('#catalog-links-form').addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;
      const form=event.target,lines=form.elements.urls.value.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean);
      try{
        if(!lines.length||lines.length>20)throw Error('Enter 1–20 URLs');
        const tags=splitTags(form.elements.tags.value);
        const ok=await importLinks(lines.map(url=>({url:normalizeCaptureURL(url)})),tags);
        if(ok){form.elements.urls.value='';await populate();}
      }catch(error){toast('Catalog links: '+error.message,true);}
    });
    dialog.addEventListener('click',async event=>{
      const button=event.target.closest('[data-catalog-links]');
      if(!button||busy)return;
      const action=button.dataset.catalogLinks;
      try{
        if(action==='show'){env.document.querySelector('#dialog')?.remove();showLinks();return;}
        if(action==='edit'){openEdit(button.dataset.urlId);return;}
        if(action==='staged'){
          const ids=[...dialog.querySelectorAll('input[data-staged-url]:checked')].map(x=>x.dataset.stagedUrl);
          if(!ids.length||ids.length>20)throw Error('Select 1–20 staged links');
          const store=normalizeCaptureStore(await getLocal(LINK_CAPTURE_KEY));
          const selected=ids.map(id=>store.links.find(link=>link.id===id));
          if(selected.some(x=>!x))throw Error('Staged links changed; reopen Catalog links');
          const tags=splitTags(dialog.querySelector('input[name="tags"]').value);
          if(await importLinks(selected,tags))await populate();
        }
      }catch(error){toast('Catalog links: '+error.message,true);}
    });
  }
  function openEdit(id){
    const record=state.records.get(id);
    try{validateCatalogURLRecord(record);}catch(error){return toast(error.message,true);}
    const tags=recordTagPaths(record,state.taxonomy);
    openDialog('<h2>Edit Catalog link</h2><p class="micro-hint">'+escapeHTML(record.url)+' · '+escapeHTML(record.id)+'</p>'+
      '<form id="catalog-url-edit-form"><label>Title<input name="title" maxlength="120" value="'+escapeHTML(record.title)+'"/></label>'+
      '<label>Tags (comma-separated paths)<input name="tags" maxlength="1000" value="'+escapeHTML(tags.join(', '))+'"/></label>'+
      '<label>Notes<textarea name="notes" rows="4" maxlength="4000">'+escapeHTML(record.notes)+'</textarea></label>'+
      '<div class="dialog-actions"><button type="button" class="secondary" data-action="dismiss">Cancel</button><button type="submit" class="primary">Save metadata</button></div></form>');
    $('#catalog-url-edit-form').addEventListener('submit',async event=>{
      event.preventDefault();
      try{
        const form=event.target;
        const ok=await editLink(id,{title:form.elements.title.value,notes:form.elements.notes.value,paths:splitTags(form.elements.tags.value)});
        if(ok)await open();
      }catch(error){toast('Catalog links: '+error.message,true);}
    });
  }
  return {open,openEdit};
}
