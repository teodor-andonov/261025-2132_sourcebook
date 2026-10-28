import {catalogQueryWithScan} from './catalog-search.mjs';
import {normalizeView,validateViews,createSavedView,updateSavedView,removeSavedView,assertViewsSnapshotUnchanged} from './views.mjs';
import {flattenedTagTree} from './tags.mjs';

// Glue for explicit, catalog-only View writes. Caller owns the UI and navigation.
export function createViewsController({state,readJson,authorized,render,toast,forgetImages,navigate,refreshRecords,commitCatalogEdits,refreshPendingCatalog}){
  const active=()=>state.views.find(v=>v.id===state.activeViewId)||null;
  const inResults=()=>!!(state.activeViewId||state.catalogTagView||state.catalogLinksView);
  const title=()=>active()?.name||(state.catalogLinksView?'Links':state.catalogTagView?'#'+state.catalogTagView.replaceAll(' / ','/'):null);
  const results=view=>catalogQueryWithScan([...state.records.values()],state.sources,state.taxonomy,{...view,query:''},state.scan).map(x=>({...x,catalogResult:true,handle:null}));
  function open(id){
    if(!state.catalog||state.bulkSaving||state.viewSaving||state.resourceSaving)return;
    const raw=state.views.find(v=>v.id===id);if(!raw)return toast('View not found',true);
    const view=normalizeView(raw);
    state.activeViewId=id;state.catalogTagView=null;state.catalogLinksView=false;state.tagFilter=null;state.search=view.query;
    state.view=view.presentation.mode;state.size=view.presentation.size;state.sort=view.presentation.sort;state.groupBy=view.presentation.groupBy??'none';state.tableColumns=[...view.presentation.columns];state.fileType=view.fileType;state.fileStatus=view.fileStatus;
    state.selected.clear();state.lastSelected=null;state.tagDraftItem=null;state.selectionMode=false;state.pageCount=150;
    ++state.request;forgetImages();state.loading=false;state.items=results(view);render();
  }
  function requery(){
    const view=active();
    if(!view)return;
    state.items=results({...view,fileType:state.fileType,fileStatus:state.fileStatus});
    state.selected.clear();state.lastSelected=null;state.pageCount=150;
    render();
  }
  async function refresh(){
    if(!inResults())return;
    await refreshRecords();
    const view=active();
    if(view)state.items=results({...view,fileType:state.fileType,fileStatus:state.fileStatus});
    state.selected.clear();render();
  }
  function selectedTags(){
    const base=active(),path=state.catalogTagView||state.tagFilter;
    if(base)return {tagIds:[...(base.tagIds??(base.tagId?[base.tagId]:[]))],tagMode:base.tagMode??'all'};
    const id=path?flattenedTagTree(state.taxonomy).find(t=>t.path===path)?.id:null;
    if(path&&!id)throw Error('Tag no longer exists');
    return {tagIds:id?[id]:[],tagMode:'all'};
  }
  function spec(tagSelection=null){
    const base=active();
    const tags=tagSelection??selectedTags();
    return {sourceId:base?base.sourceId:state.catalogTagView?null:state.sourceId,
      folderPath:base?base.folderPath:state.catalogTagView?'':state.parts.join('/'),
      tagId:tags.tagIds[0]??null,tagIds:[...tags.tagIds],tagMode:tags.tagMode,
      query:state.search,fileType:state.fileType,fileStatus:state.fileStatus??'all',
      presentation:{mode:state.view,size:state.size,sort:state.sort,groupBy:state.groupBy??'none',columns:state.tableColumns}};
  }
  async function mutate(edit){
    if(!state.catalog||state.bulkSaving||state.viewSaving||state.resourceSaving)return false;
    state.viewSaving=true;
    try{
      if(!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission required');
      const cat=await readJson(state.catalogHandle,'catalog.json');
      if(!cat||cat.id!==state.catalog.id||cat.code!==state.catalog.code)throw Error('Catalog identity changed; reopen it');
      const before=await readJson(state.catalogHandle,'views.json',null),disk=before??[];
      assertViewsSnapshotUnchanged(state.views,disk);
      const normalized=validateViews(disk),next=edit(normalized);
      if(JSON.stringify(next)===JSON.stringify(normalized)){toast('View unchanged');return true;}
      await commitCatalogEdits([{path:'views.json',before,after:next}]);
      state.views=next;toast('Views saved');return true;
    }catch(e){await refreshPendingCatalog();toast('View save failed: '+(e?.message||String(e)),true);return false;}
    finally{state.viewSaving=false;render();}
  }
  async function save(name,tagSelection=null){return mutate(v=>createSavedView(v,{...spec(tagSelection),name},crypto.randomUUID()));}
  async function update(tagSelection=null){
    const id=state.activeViewId;if(!id)return false;
    const ok=await mutate(v=>updateSavedView(v,id,spec(tagSelection)));
    if(ok&&state.activeViewId===id)open(id); // Refresh matching results after explicit save.
    return ok;
  }
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
  return {active,inResults,title,open,refresh,requery,save,update,rename,remove,togglePin,selectedTags};
}
