import {catalogQueryResults} from './catalog-search.mjs';
import {validateViews,createSavedView,updateSavedView,removeSavedView,assertViewsSnapshotUnchanged} from './views.mjs';
import {flattenedTagTree} from './tags.mjs';

// Glue for explicit, catalog-only View writes. Caller owns the UI and navigation.
export function createViewsController({state,readJson,writeJson,authorized,render,toast,forgetImages,navigate,refreshRecords}){
  const active=()=>state.views.find(v=>v.id===state.activeViewId)||null;
  const inResults=()=>!!(state.activeViewId||state.catalogTagView);
  const title=()=>active()?.name||(state.catalogTagView?'#'+state.catalogTagView.replaceAll(' / ','/'):null);
  const results=view=>catalogQueryResults([...state.records.values()],state.sources,state.taxonomy,{...view,query:''}).map(x=>({...x,catalogResult:true,handle:null}));
  function open(id){
    if(!state.catalog||state.bulkSaving||state.viewSaving)return;
    const view=state.views.find(v=>v.id===id);if(!view)return toast('View not found',true);
    state.activeViewId=id;state.catalogTagView=null;state.tagFilter=null;state.search=view.query;
    state.view=view.presentation.mode;state.size=view.presentation.size;state.sort=view.presentation.sort;state.fileType=view.fileType;
    state.selected.clear();state.lastSelected=null;state.tagDraftItem=null;state.selectionMode=false;state.pageCount=150;
    ++state.request;forgetImages();state.loading=false;state.items=results(view);render();
  }
  function requery(){
    const view=active();
    if(!view)return;
    state.items=results({...view,fileType:state.fileType});
    state.selected.clear();state.lastSelected=null;state.pageCount=150;
    render();
  }
  async function refresh(){
    if(!inResults())return;
    await refreshRecords();
    const view=active();
    if(view)state.items=results({...view,fileType:state.fileType});
    state.selected.clear();render();
  }
  function spec(){
    const base=active(),path=state.catalogTagView||state.tagFilter;
    const tagId=base?base.tagId:path?flattenedTagTree(state.taxonomy).find(t=>t.path===path)?.id||null:null;
    if(path&&!tagId)throw Error('Tag no longer exists');
    return {sourceId:base?base.sourceId:state.catalogTagView?null:state.sourceId,
      folderPath:base?base.folderPath:state.catalogTagView?'':state.parts.join('/'),tagId,query:state.search,fileType:state.fileType,
      presentation:{mode:state.view,size:state.size,sort:state.sort}};
  }
  async function mutate(edit){
    if(!state.catalog||state.bulkSaving||state.viewSaving)return false;
    state.viewSaving=true;
    try{
      if(!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission required');
      const cat=await readJson(state.catalogHandle,'catalog.json');
      if(!cat||cat.id!==state.catalog.id||cat.code!==state.catalog.code)throw Error('Catalog identity changed; reopen it');
      const disk=await readJson(state.catalogHandle,'views.json',[]);
      assertViewsSnapshotUnchanged(state.views,disk);
      const next=edit(validateViews(disk));
      await writeJson(state.catalogHandle,'views.json',next);
      if(JSON.stringify(await readJson(state.catalogHandle,'views.json'))!==JSON.stringify(next))throw Error('View write could not be verified');
      state.views=next;toast('Views saved');return true;
    }catch(e){toast('View save failed: '+(e?.message||String(e)),true);return false;}
    finally{state.viewSaving=false;render();}
  }
  async function save(name){return mutate(v=>createSavedView(v,{...spec(),name},crypto.randomUUID()));}
  async function update(){const id=state.activeViewId;if(!id)return false;return mutate(v=>updateSavedView(v,id,spec()));}
  async function rename(name){const id=state.activeViewId;if(!id)return false;return mutate(v=>updateSavedView(v,id,{name}));}
  async function togglePin(id){
    const view=state.views.find(v=>v.id===id);
    if(!view)return false;
    return mutate(v=>updateSavedView(v,id,{pinned:!view.pinned}));
  }
  async function remove(id){
    const view=state.views.find(v=>v.id===id);
    if(!view||!confirm('Delete View "'+view.name+'"? Files and tags remain unchanged.'))return;
    if(await mutate(v=>removeSavedView(v,id))&&state.activeViewId===id)await navigate(state.sourceId,[...state.parts]);
  }
  return {active,inResults,title,open,refresh,requery,save,update,rename,remove,togglePin};
}
