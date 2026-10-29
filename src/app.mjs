import {getLocal,setLocal,removeLocal,readJson,writeJson,nested,authorized} from './storage.mjs';
import {createDeviceReadinessUI} from './device-readiness.mjs';
import {createLinkCaptureUI} from './link-capture.mjs';
import {createShareInboxUI,removeIncomingShare,listIncomingShares} from './share-inbox.mjs';
import {createCatalogLinksUI} from './catalog-links-ui.mjs';
import {classifyPastedText,planFileCapture,writeCapturedFile,requestCapturedFileDownload} from './file-capture.mjs';
import {readPhysicalShortcut,readPhysicalTextPreview} from './file-preview.mjs';
import {prepareCaptureIntake} from './capture-intake.mjs';
import {shareCapturedPlan} from './file-share-out.mjs';
import {collectPastedImageBlobs,prepareClipboardImages,readClipboardImages} from './clipboard-images.mjs';
import {planOrdinaryFileImport,importOrdinaryFiles} from './file-import.mjs';
import {planCatalogURLImport,validateCatalogURLRecord} from './catalog-urls.mjs';
import {CODE_PATTERN,validName,parseFilename} from './identity.mjs';
import {planResourceIdentity} from './catalog.mjs';
import {planBulkTags,assertSelectedUnchanged,commitBulkTags} from './bulk-tags.mjs';
import {commitCatalogTransaction,inspectPendingCatalogTransaction,resumeCatalogTransaction} from './catalog-transactions.mjs';
import {createCatalogBackup,inspectCatalogBackup} from './catalog-backup.mjs';
import {planMissingResourceRestore,restoreMissingResourceRecords} from './catalog-restore.mjs';
import {inspectCatalogConflictCopies,conflictCanonicalPath} from './catalog-conflicts.mjs';
import {resourceFocusId,nextResourceFocusId} from './navigation.mjs';
import {changeVisibleSelection,pruneVisibleSelection,selectDisplayedItems,SELECTION_LIMIT} from './selection.mjs';
import {catalogFolderTree,catalogFolderParts} from './catalog-folders.mjs';
import {catalogTagResults,catalogQueryResults,sortCatalogResults,sortBrowserItems,catalogFileType} from './catalog-search.mjs';
import {groupViewItems,viewTableMetadata,TABLE_COLUMNS,DEFAULT_TABLE_COLUMNS,normalizeTableColumns} from './view-layout.mjs';
import {describeFileSymbol,sidePreviewKind} from './file-symbols.mjs';
import {scanRegisteredFolders,scanRegisteredSubfolder,verifyCatalogRootReconnect,assertLiveSourceEntry} from './source-scan.mjs';
import {sourceIndexKey,emptySourceIndex,restoreSourceIndex,refreshSourceIndex,refreshSourceSubtreeIndex,assertIndexedRootIdentity,sourceIndexOverlay} from './source-index.mjs';
import {inspectIndexedRootOverlaps} from './source-overlap.mjs';
import {createOverlapReviewUI} from './overlap-review-ui.mjs';
import {validateViews,sortViewsForSidebar} from './views.mjs';
import {createViewsController} from './views-controller.mjs';
import {plainRoot,createFolderTab,loadFolderTabs,visitFolderTab,folderHistoryTarget,closeFolderTab,folderTabPreferences,updateFolderTabPreferences,adjacentFolderTabId} from './workspace.mjs';
import {enumerateFolderEntries,FOLDER_ENUMERATION_LIMIT} from './folder-enumeration.mjs';
import {RESOURCE_PAGE_SIZE,pageWindow,pageForIndex} from './resource-paging.mjs';
import {FOLDER_FILE_TYPES,filterFolderEntries} from './folder-filters.mjs';
import {mergeTagInput,ensureTagPath,recordTagPaths,flattenedTagTree,includesTagPath,matchesResourceSearch,suggestTagPaths,nextTagSuggestionIndex,toggleTagPin,pinnedTagShortcuts,assertTagSnapshotUnchanged} from './tags.mjs';

const $=(query,root=document)=>root.querySelector(query);
const state={
  sidePreviewSerial:0,sidePreviewUrl:null,viewerSerial:0,
  captureWriting:false,
  catalog:null, catalogHandle:null, sources:[], handles:new Map(), records:new Map(), taxonomy:[], tagFilter:null, catalogTagView:null,catalogLinksView:false,activeViewId:null,views:[],viewSaving:false,sort:'name',showHidden:true,groupBy:'none',tableColumns:[...DEFAULT_TABLE_COLUMNS],fileType:'all',fileStatus:'all',
  sourceId:null,parts:[],items:[],selected:new Set(),lastSelected:null,selectionAnchor:null,keyboardFocusId:null,
  search:'', view:localStorage.getItem('sb-view')||'gallery',
  size:Number(localStorage.getItem('sb-size'))||164,
  inspector:window.innerWidth>760, sidebar:false, loading:false, folderReadState:'complete', request:0,
  imageUrls:new Set(), thumbnailUrls:new Map(), observer:null, previewUrl:null, previewId:null, pageCount:RESOURCE_PAGE_SIZE,pageOffset:0,
  tagDraftItem:null, tagDraft:[], tagSuggestions:[], tagSuggestionIndex:-1, selectionMode:false, bulkSaving:false,resourceSaving:false,
  scan:null,scanBusy:false,scanCommitting:false,scanGeneration:0,scanProgress:'',sourceIndex:null,indexFreshIds:new Set(),indexFreshSubtrees:[],scanRootId:'',scanFolderPath:'',indexProblem:'',pendingTransaction:null,catalogConflicts:null,conflictReport:null,backupBusy:false,backupRestorePlan:null,backupRestoreSource:null,overlapReport:null
};
const viewsUI=createViewsController({state,readJson,authorized,render,toast,forgetImages,navigate,refreshRecords,commitCatalogEdits,refreshPendingCatalog});
const overlapUI=createOverlapReviewUI({state,openDialog,escapeHTML,icon,toast,errorText,revealCatalogResult});
const deviceReadiness=createDeviceReadinessUI({openDialog,escapeHTML,toast});
const linkCapture=createLinkCaptureUI({openDialog,escapeHTML,toast,getLocal,setLocal,
  onSaveFile:input=>writeCapture(input,{choose:true}),onDownloadFile:downloadCapture});
const shareInbox=createShareInboxUI({openDialog,escapeHTML,toast,linkCapture,
  onSaveFile:input=>writeCapture(input,{choose:true}),onDownloadFile:downloadCapture,
  onImportFiles:async(files,id)=>showFileImport(files,{origin:'share',onVerified:async()=>{
    const item=(await listIncomingShares()).find(entry=>entry.id===id);
    if(item?.text||item?.url){toast('Files verified. Shared text/URL remains staged for review or Discard.');return;}
    await removeIncomingShare(id);
    toast('Verified shared files; temporary inbox cleared');
  }})});
const catalogLinksUI=createCatalogLinksUI({state,openDialog,escapeHTML,toast,getLocal,readJson,authorized,refreshRecords,commitCatalogEdits,refreshPendingCatalog,refreshResults:async()=>{if(viewsUI.inResults())await refreshCatalogTagView();else render();},render,showLinks:showCatalogLinks});
async function refreshPendingCatalog(){
  if(!state.catalogHandle||!state.catalog){state.pendingTransaction=null;state.catalogConflicts=null;return;}
  try{state.pendingTransaction=await inspectPendingCatalogTransaction(state.catalogHandle,state.catalog.id);}
  catch(error){state.pendingTransaction={error:errorText(error),conflicts:['unreadable']};}
  try{state.catalogConflicts=await inspectCatalogConflictCopies(state.catalogHandle,{expectedCatalogId:state.catalog.id});}
  catch(error){state.catalogConflicts={error:errorText(error),count:0,entries:[]};}
}
async function commitCatalogEdits(changes){
  if(state.backupBusy)throw Error('Wait for the catalog backup inspection to finish.');
  if(state.pendingTransaction)throw Error('Resolve the interrupted catalog save before editing.');
  if(state.catalogConflicts?.error||state.catalogConflicts?.count)throw Error('Catalog sync conflicts require manual resolution before editing. Inspect conflicts in Settings.');
  try{return await commitCatalogTransaction({handle:state.catalogHandle,catalogId:state.catalog.id,changes});}
  finally{await refreshPendingCatalog();}
}
async function recoverCatalogSave(){
  if(!state.catalog||state.resourceSaving||state.bulkSaving||state.viewSaving||state.backupBusy)return;
  state.resourceSaving=true;
  let recovered=false;
  try{
    await refreshPendingCatalog();
    const pending=state.pendingTransaction;
    if(!pending)return toast('No interrupted save found.');
    if(pending.error||pending.conflicts?.length)
      throw Error('Recovery is blocked by divergent or unreadable catalog data. Repair the catalog manually from a backup; nothing was overwritten.');
    if(state.catalogConflicts?.count||state.catalogConflicts?.error)
      throw Error('Resolve Catalog sync conflicts before resuming an interrupted save.');
    if(!confirm('Resume interrupted catalog save ('+pending.applied+'/'+pending.total+' changes already present)? Only catalog JSON will be written.'))return;
    if(!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission is required for recovery.');
    await resumeCatalogTransaction(state.catalogHandle,state.catalog.id);
    await refreshPendingCatalog();
    state.catalog=await readJson(state.catalogHandle,'catalog.json');
    state.taxonomy=await readJson(state.catalogHandle,'tags.json',[]);
    state.views=validateViews(await readJson(state.catalogHandle,'views.json',[]));
    state.sources=await readJson(state.catalogHandle,'sources.json',[]);
    state.handles=new Map([...state.handles].filter(([id])=>state.sources.some(source=>source.id===id)));
    if(!state.sources.some(source=>source.id===state.sourceId))state.sourceId=state.sources[0]?.id||null;
    state.parts=[];state.items=[];state.selected.clear();state.activeViewId=null;state.catalogTagView=null;state.catalogLinksView=false;state.tagFilter=null;
    await refreshRecords();invalidateScan();
    recovered=true;
    toast('Interrupted catalog save completed. Source files unchanged.');
  }catch(error){await refreshPendingCatalog();toast('Recovery failed: '+errorText(error),true);}
  finally{
    state.resourceSaving=false;
    if(recovered&&state.sourceId){
      try{await navigate(state.sourceId,[]);}catch(error){render();toast('Folder needs reconnection: '+errorText(error),true);}
    }else render();
  }
}
async function exportCatalogBackup(){
  if(!state.catalog||state.backupBusy||state.resourceSaving||state.bulkSaving||state.viewSaving)
    return toast('Finish catalog editing before exporting a backup.',true);
  const handle=state.catalogHandle,catalog=state.catalog;
  state.backupBusy=true;
  try{
    const backup=await createCatalogBackup(handle);
    if(state.catalogHandle!==handle)throw Error('Catalog changed during backup');
    const blob=new Blob([JSON.stringify(backup,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    const safeName=String(catalog.name||'catalog').replace(/[^a-z0-9_-]+/gi,'-').slice(0,60)||'catalog';
    link.href=url;
    link.download=safeName+'-'+new Date().toISOString().slice(0,10)+'.sourcebook-backup.json';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    toast('Metadata backup prepared: '+backup.files.length+' files. Originals unchanged.');
  }catch(error){toast('Backup failed: '+errorText(error),true);}
  finally{state.backupBusy=false;}
}
function openCatalogConflictsDialog(){
  if(!state.catalog)return toast('Open a Catalog first.',true);
  state.conflictReport=null;
  openDialog('<h2>Catalog sync conflicts</h2><p>Read-only inspection of Syncthing-style conflict copies inside this .sb Catalog. Even identical copies block metadata writes until you resolve them outside Sourcebook. No automatic merge, deletion or overwrite.</p><div id="catalog-conflict-results" class="backup-results" aria-live="polite">Inspecting metadata…</div><div class="dialog-actions"><button class="secondary" type="button" data-action="refresh-catalog-conflicts">Recheck</button><button class="secondary" type="button" data-action="export-catalog-conflict-report">Export report</button><button class="primary" type="button" data-action="dismiss">Done</button></div>');
  void refreshCatalogConflictDialog();
}
async function refreshCatalogConflictDialog(){
  const target=$('#catalog-conflict-results');
  if(!state.catalog||!target||state.backupBusy)return;
  const handle=state.catalogHandle,catalogId=state.catalog.id;
  state.backupBusy=true;state.conflictReport=null;target.textContent='Inspecting Catalog metadata only…';
  try{
    const report=await inspectCatalogConflictCopies(handle,{expectedCatalogId:catalogId});
    if(handle!==state.catalogHandle)throw Error('Catalog changed during inspection');
    state.catalogConflicts=report;state.conflictReport={...report,catalogId,scope:'catalog-metadata-conflicts-only'};
    // Rechecking can clear a warning without closing the inspection dialog.
    const notice=$('#catalog-conflict-notice');
    if(notice&&!report.count)notice.remove();
    else if(notice&&report.count){const label=notice.querySelector('span');if(label)label.textContent=report.count+' Catalog sync conflict copy/copies';}
    else if(report.count){const chip=$('#sidebar .catalog-chip');if(chip)chip.insertAdjacentHTML('afterend','<div id="catalog-conflict-notice" class="catalog-recovery" role="status">'+icon('alert',15)+'<span>'+report.count+' Catalog sync conflict copy/copies</span><button class="secondary" data-action="inspect-catalog-conflicts">Inspect</button></div>');}
    const counts=Object.entries(report.counts).filter(([,count])=>count).map(([name,count])=>count+' '+name).join(' · ');
    target.innerHTML=report.count?
      '<p>'+report.count+' conflict copy/copies found · '+escapeHTML(counts)+'. All writes remain blocked until the copies are resolved manually. Preserve both versions before changing anything.</p><div class="catalog-conflict-list">'+report.entries.map(row=>'<div><strong>'+escapeHTML(row.status)+'</strong><code>'+escapeHTML(row.path)+'</code><code>Canonical: '+escapeHTML(row.canonicalPath)+'</code>'+(row.conflictSha256?'<code>Conflict SHA-256: '+escapeHTML(row.conflictSha256.slice(0,16))+'…</code>':'')+'</div>').join('')+'</div>':
      '<p>No recognized Syncthing conflict copies were found. This is not a cross-device lock or a guarantee that the Catalog is synchronized.</p>';
  }catch(error){
    state.catalogConflicts={error:errorText(error),count:0,entries:[]};
    target.textContent='Conflict inspection failed: '+errorText(error)+'. Catalog editing remains blocked until inspection succeeds.';
  }finally{state.backupBusy=false;}
}
function exportCatalogConflictReport(){
  if(!state.conflictReport||!state.catalog)return toast('Recheck Catalog conflicts before exporting a report.',true);
  const blob=new Blob([JSON.stringify(state.conflictReport,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='sourcebook-'+new Date().toISOString().slice(0,10)+'-conflict-report.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  toast('Read-only conflict report exported; no metadata changed.');
}
function chooseBackupForInspection(){
  if(!state.catalog)return toast('Open a catalog first.',true);
  state.backupRestorePlan=null;state.backupRestoreSource=null;
  openDialog('<h2>Inspect metadata backup</h2><p>Verify and compare a metadata-only backup. You may explicitly restore missing resource records; existing resource records and ordinary files are preserved; the Catalog ID counter may advance.</p><label>Backup JSON<input id="backup-inspect-file" type="file" accept=".json,application/json"/></label><div id="backup-inspection-result" class="backup-results" aria-live="polite"></div><div class="dialog-actions"><button type="button" class="primary" data-action="dismiss">Done</button></div>');
}
async function inspectBackupFile(file){
  const target=$('#backup-inspection-result');
  if(!target||!file)return;
  if(state.backupBusy)return;
  state.backupRestorePlan=null;state.backupRestoreSource=null;
  if(file.size>32*1024*1024){target.textContent='Backup exceeds the 32 MiB file input limit.';return;}
  const handle=state.catalogHandle;
  state.backupBusy=true;target.textContent='Verifying checksums and comparing metadata…';
  try{
    const parsed=JSON.parse(await file.text());
    const report=await inspectCatalogBackup(handle,parsed);
    if(state.catalogHandle!==handle)throw Error('Catalog changed during inspection');
    let plan=null,restoreError='';
    try{plan=await planMissingResourceRestore(handle,parsed);}
    catch(error){restoreError=errorText(error);}
    if(plan){state.backupRestorePlan=plan;state.backupRestoreSource=parsed;}
    const changed=report.entries.filter(x=>x.status!=='unchanged'),summary=report.counts;
    const rows=plan?.selectedPaths||[];
    target.innerHTML='<p>'+summary.unchanged+' unchanged · '+summary.changed+' changed · '+summary['missing-now']+' missing now · '+summary['added-since-backup']+' added since backup.</p>'+
      (report.hasPendingJournal||report.currentPendingJournal?'<p>Recovery journal present. Resolve it before restoring.</p>':'')+
      (report.conflictCopies?.count?'<p>'+report.conflictCopies.count+' Catalog sync conflict copy/copies detected. Restore is blocked; use Settings → Inspect conflicts.</p>':'')+
      (changed.length?'<div class="backup-diff">'+changed.slice(0,100).map(x=>'<div><strong>'+escapeHTML(x.status)+'</strong> · '+escapeHTML(x.path)+'</div>').join('')+
      (changed.length>100?'<p>Showing first 100 of '+changed.length+' differences.</p>':'')+'</div>':'<p>Metadata matches this backup.</p>')+
      (restoreError?'<p>Restoration unavailable: '+escapeHTML(restoreError)+'</p>':'')+
      (plan?.nonResourceMissing.length?'<p>Missing non-resource metadata is NOT restored: '+escapeHTML(plan.nonResourceMissing.join(', '))+'</p>':'')+
      (rows.length?'<div class="backup-recovery"><strong>Recover missing resource metadata</strong><p>Select records to recreate (up to 250 per batch). Existing/changed records are preserved. This does not restore missing original files.</p><div class="backup-restore-list">'+rows.map(path=>'<label><input type="checkbox" data-backup-restore-path="'+escapeHTML(path)+'" checked/><span>'+escapeHTML(path)+'</span></label>').join('')+'</div>'+
        (plan.remaining?'<p>'+plan.remaining+' additional missing records require another inspected batch.</p>':'')+
        '<button type="button" class="secondary" data-action="restore-missing-backup-records">Restore selected metadata…</button></div>':'')+
      '<p>Inspection is read-only. Restoration requires explicit confirmation and catalog write permission.</p>';
  }catch(error){state.backupRestorePlan=null;state.backupRestoreSource=null;target.textContent='Cannot inspect backup: '+errorText(error);}
  finally{state.backupBusy=false;}
}
async function restoreMissingBackupRecords(){
  if(!state.catalog||state.backupBusy||state.resourceSaving||state.bulkSaving||state.viewSaving)
    return toast('Finish the current Catalog operation first.',true);
  const preview=state.backupRestorePlan,backup=state.backupRestoreSource,handle=state.catalogHandle;
  const selected=[...document.querySelectorAll('[data-backup-restore-path]:checked')].map(input=>input.dataset.backupRestorePath);
  if(!preview||!backup||!selected.length)return toast('Select missing metadata records to restore.',true);
  state.backupBusy=true;
  let restored=0;
  try{
    const approved=await planMissingResourceRestore(handle,backup,{selectedPaths:selected});
    if(approved.signature!==preview.signature)throw Error('Catalog changed since inspection. Inspect the backup again.');
    if(!confirm('Restore '+selected.length+' missing Catalog resource record(s)? This writes only Catalog JSON, never overwrites existing resource records or ordinary files, and may advance the Catalog ID counter.'))return;
    if(!await authorized(handle,'readwrite'))throw Error('Catalog write permission is required for restoration.');
    const result=await restoreMissingResourceRecords(handle,backup,approved);
    if(state.catalogHandle!==handle)throw Error('Catalog switched during restoration');
    restored=result.restored;
    state.catalog=await readJson(handle,'catalog.json');
    await refreshRecords();invalidateScan();
    await refreshPendingCatalog();
    state.backupRestorePlan=null;state.backupRestoreSource=null;
    $('#dialog')?.remove();
    toast('Recovered '+restored+' resource record(s). Ordinary files unchanged.');
  }catch(error){
    await refreshPendingCatalog();
    state.backupRestorePlan=null;state.backupRestoreSource=null;
    const target=$('#backup-inspection-result');
    if(target)target.textContent='Restore stopped: '+errorText(error)+'. Reinspect the backup before retrying. If a recovery journal is pending, use Resume.';
    toast('Restore stopped: '+errorText(error),true);
  }finally{
    state.backupBusy=false;
    if(restored){
      state.selected.clear();
      if(viewsUI.inResults())await refreshCatalogTagView();
      else if(state.sourceId)await navigate(state.sourceId,[...state.parts]).catch(()=>render());
      else render();
    }else if(state.pendingTransaction)render();
  }
}
function invalidateScan(){
  ++state.scanGeneration;state.scan=null;state.scanBusy=false;state.scanCommitting=false;state.scanProgress='';
  state.sourceIndex=null;state.overlapReport=null;state.indexFreshIds=new Set();state.indexFreshSubtrees=[];state.scanRootId='';state.scanFolderPath='';state.indexProblem='';
}
// Overlap proof is device-local and read-only. It must never turn matching
// names or stale index paths into presumed physical identity. A failed check
// leaves duplicate entries visible rather than hiding possibly distinct files.
async function attachVerifiedSourceOverlaps(index,generation,catalogId){
  if(!state.scan||index.roots.length<2)return;
  let result;
  try{result=await inspectIndexedRootOverlaps(index,new Map(state.handles));}
  catch(error){result={overlaps:[],problems:['Overlap check unavailable: '+errorText(error)]};}
  if(generation!==state.scanGeneration||state.catalog?.id!==catalogId||state.sourceIndex!==index)return;
  state.scan={...state.scan,overlaps:result.overlaps,overlapProblems:result.problems};
}
// Cache is device-local and never copied into .sb. A restored snapshot is
// stale until a fresh complete scan; only isSameEntry-verified roots are shown.
async function loadDeviceSourceIndex(catalogId){
  const generation=state.scanGeneration,handle=state.catalogHandle;
  try{
    const saved=await getLocal(sourceIndexKey(catalogId));
    if(generation!==state.scanGeneration||state.catalog?.id!==catalogId||state.catalogHandle!==handle)return;
    const restored=await restoreSourceIndex(saved,catalogId,state.sources,state.handles);
    if(generation!==state.scanGeneration||state.catalog?.id!==catalogId||state.catalogHandle!==handle)return;
    state.sourceIndex=restored.index;state.indexFreshIds=new Set();state.indexFreshSubtrees=[];
    state.scan=restored.index.roots.length?sourceIndexOverlay(restored.index):null;
    await attachVerifiedSourceOverlaps(restored.index,generation,catalogId);
    if(generation!==state.scanGeneration||state.catalog?.id!==catalogId)return;
    if(restored.skippedRootIds.length)
      state.indexProblem=restored.skippedRootIds.length+' cached Folder(s) require verified reconnection or refresh';
  }catch(error){
    if(generation!==state.scanGeneration||state.catalog?.id!==catalogId)return;
    state.sourceIndex=emptySourceIndex(catalogId);state.scan=null;
    state.indexProblem='Device index unavailable: '+errorText(error);
  }
}
async function clearDeviceSourceIndex(){
  if(!state.catalog||state.scanBusy)return;
  if(!confirm('Clear this device\'s cached source index? Ordinary files and Catalog metadata will not change.'))return;
  const catalogId=state.catalog.id,generation=++state.scanGeneration;
  state.scanBusy=true;state.scanCommitting=true;render();
  try{
    await removeLocal(sourceIndexKey(catalogId));
    if(state.catalog?.id!==catalogId||state.scanGeneration!==generation)return;
    invalidateScan();
    if(state.activeViewId)viewsUI.requery();else render();
    toast('Device index cleared. Catalog metadata and source files unchanged.');
  }catch(error){
    if(state.catalog?.id===catalogId&&state.scanGeneration===generation)
      toast('Could not clear device index: '+errorText(error),true);
  }finally{
    if(state.catalog?.id===catalogId&&state.scanGeneration===generation){
      state.scanBusy=false;state.scanCommitting=false;render();
    }
  }
}
let tabPersistQueue=Promise.resolve();
let tabPreferencesTimer=null;
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
  link:'M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7 M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7',
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
  if(item.kind==='url')return 'link';
  if(item.kind==='directory')return 'folder';
  if(/\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(item.name))return 'image';
  if(/\.pdf$/i.test(item.name))return 'pdf';
  if(/\.(mp4|mov|webm)$/i.test(item.name))return 'video';
  return 'file';
}
function fileSymbol(item){
  if(item.kind==='url')return '<span class="sb-type-folder" aria-hidden="true">'+icon('link',23)+'</span>';
  const info=describeFileSymbol(item);
  if(info.folder)return '<span class="sb-type-folder" aria-hidden="true">'+icon('folder',23)+'</span>';
  return '<span class="sb-type-icon" style="--type-h:'+info.hue+'" title="'+escapeHTML(info.label)+'" aria-hidden="true"><span class="sb-type-glyph">'+icon(info.glyph,19)+'</span><span class="sb-type-ext">'+escapeHTML(info.label)+'</span></span>';
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
  outer.addEventListener('click',event=>{if(event.target===outer||event.target.closest('[data-action="dismiss"]')){
    // Do not hide a running, explicitly confirmed file copy. Use Abort copy instead.
    if(state.captureWriting&&outer.querySelector('#import-files-form'))return;
    outer.remove();
  }});
  document.body.append(outer);outer.querySelector('input')?.focus();
}
// Capture always produces a real file inside an explicitly granted Folder.
async function writeCapture(input,{choose=false,allowPicker=true}={}){
  if(state.captureWriting)throw Error('Finish the current file capture first');
  if(state.bulkSaving||state.resourceSaving||state.viewSaving||state.backupBusy)throw Error('Finish the current operation first');
  state.captureWriting=true;
  try{
    let folder,here=false;
    if(!choose&&!viewsUI.inResults()&&state.sourceId){
      const root=sourceHandle();
      if(root){
        folder=await nested(root,state.parts);
        here=true;
      }
    }
    if(!folder){
      if(!allowPicker)throw Error('Open a physical Folder before pasting or dropping text');
      if(typeof window.showDirectoryPicker!=='function')throw Error('Folder writing is not supported by this browser');
      folder=await window.showDirectoryPicker({mode:'readwrite'});
    }
    if(!await authorized(folder,'readwrite'))throw Error('Write permission for destination Folder was not granted');
    const plan=planFileCapture(input,{now:new Date(),random:crypto.randomUUID().replaceAll('-','').slice(0,10)});
    const result=await writeCapturedFile(folder,plan);
    toast('Saved '+result.name+' as a real file');
    if(here&&!viewsUI.inResults())await navigate(state.sourceId,[...state.parts]);
    return result;
  }finally{state.captureWriting=false;}
}
function downloadCapture(input){
  const plan=planFileCapture(input,{now:new Date(),random:crypto.randomUUID().replaceAll('-','').slice(0,10)});
  const result=requestCapturedFileDownload(plan);
  toast('Browser download requested: '+result.name+'. Check Downloads; Sourcebook cannot verify the destination.');
  return result;
}
async function shareCapture(input){
  const plan=planFileCapture(input,{now:new Date(),random:crypto.randomUUID().replaceAll('-','').slice(0,10)});
  const result=await shareCapturedPlan(plan);
  toast('File handed to system share sheet: '+plan.name+'. Verify the destination yourself; Sourcebook cannot confirm it was saved.');
  return result;
}
function openFileCapture({intake=null}={}){
  if(state.captureWriting)return toast('Finish the current file operation first',true);
  const current=!viewsUI.inResults()&&state.sourceId;
  const folderAvailable=!!current||typeof window.showDirectoryPicker==='function';
  const sourceLabel={paste:'Pasted content',drop:'Dropped content',clipboard:'Clipboard text'}[intake?.source]||'URL or text';
  openDialog('<h2>Review file capture</h2><p>'+sourceLabel+' is not saved yet. Review the contents and destination before creating a real .url or .md file. No Catalog-only Resource is created.</p>'+
    '<form id="capture-file-form">'+
    '<label>Content<textarea name="content" rows="6" maxlength="1048576" required placeholder="Paste a URL or text…"></textarea></label>'+
    '<div id="capture-intake-status" role="status" aria-live="polite">Enter a URL or text to preview its file type.</div>'+
    '<button type="button" class="secondary" data-action="capture-read-clipboard">Read clipboard into draft</button>'+
    '<label>Filename title (optional)<input name="title" maxlength="65" placeholder="Uses domain or first line"/></label>'+
    (folderAvailable?'<label>Destination<select name="destination">'+(current?'<option value="current">Current Folder</option>':'')+
    '<option value="choose">Choose another Folder…</option></select></label>':'<p class="micro-hint" role="status">Folder creation is unavailable here. Download or Send requests external delivery only; verify the file in the receiving app.</p>')+
    '<div class="dialog-actions"><button type="button" class="secondary" data-action="dismiss">Cancel</button>'+
    '<button class="secondary" type="submit" data-delivery="download">Download instead</button><button class="secondary" type="submit" data-delivery="share">Send file to app…</button>'+(folderAvailable?'<button class="primary" type="submit" data-delivery="folder">Create in Folder</button>':'')+'</div></form>');
  const form=$('#capture-file-form');
  const content=form.elements.content,status=$('#capture-intake-status');
  if(intake)content.value=intake.value;
  const preview=()=>{
    try{
      const parsed=classifyPastedText(content.value);
      status.textContent='Will create '+(parsed.kind==='url'?'an Internet Shortcut (.url)':'a Markdown file (.md)')+
        ' · '+parsed.value.length+' characters. Nothing written yet.';
    }catch(error){status.textContent=errorText(error)+'. Nothing written.';}
  };
  content.addEventListener('input',preview);
  preview();
}
async function readCaptureClipboard(){
  const form=$('#capture-file-form');
  if(!form)return;
  if(typeof navigator.clipboard?.readText!=='function')
    throw Error('Clipboard read is unavailable. Paste directly into the Content field instead.');
  const text=await navigator.clipboard.readText();
  const intake=prepareCaptureIntake({text,source:'clipboard'});
  if(!form.isConnected)return;
  form.elements.content.value=intake.value;
  form.elements.content.dispatchEvent(new Event('input',{bubbles:true}));
  toast('Clipboard loaded for review. No file written.');
}
async function saveFileCaptureForm(form,delivery='folder'){
  try{
    const input=classifyPastedText(form.elements.content.value);
    const data={...input,title:form.elements.title.value};
    const result=delivery==='download'?downloadCapture(data):
      delivery==='share'?await shareCapture(data):
      await writeCapture(data,{choose:form.elements.destination.value==='choose'});
    if(result)$('#dialog')?.remove();
  }catch(error){if(error?.name!=='AbortError')toast('File capture: '+errorText(error),true);}
}
function landing(){
  clearSidePreview();
  forgetImages();
  const canPick=typeof window.showDirectoryPicker==='function';
  const folderActions=canPick?'<button class="primary" data-action="open-folder">'+icon('folder')+' Open folder</button><button class="secondary" data-action="open-catalog">'+icon('database')+' Open catalog</button><button class="secondary" data-action="create-catalog">'+icon('plus')+' New catalog</button>':'<p class="micro-hint" role="status">Folder access is unavailable in this browser. You can still review incoming shares, capture URLs/text, Download or send ordinary files to another app. None of these alternatives verifies a Folder write.</p>';
  const importActions=canPick?'<button class="secondary" data-action="import">'+icon('upload')+' Add ordinary files</button><button class="secondary" data-action="capture-clipboard-image">'+icon('image')+' Clipboard image</button>':'';
  $('#app').innerHTML='<main class="landing"><div class="landing-content"><div class="landing-logo">'+icon('book',35)+'</div><h1>Sourcebook</h1><p>Your files, beautifully organized.</p><div class="landing-actions">'+folderActions+'<button class="secondary" data-action="capture-file">'+icon('file')+' Save file from URL/text</button>'+importActions+'<button class="secondary" data-action="capture-links">'+icon('link')+' Review staged links</button><button class="secondary" data-action="incoming-shares">'+icon('link')+' Incoming shares</button></div><div id="recent-area"></div><button class="secondary" data-action="device-checks" title="Check browser capabilities and record device acceptance">Device checks</button><span class="landing-foot">Local-first. No imports required. Your files stay yours.</span></div></main>';
  getLocal('recent').then(value=>{
    if(canPick&&value&&$('#recent-area'))$('#recent-area').innerHTML='<div class="eyebrow">RECENT CATALOG</div><button class="recent-item" data-action="recent">'+icon('database')+'<span>'+escapeHTML(value.name)+'</span>'+icon('chevron',15)+'</button>';
  }).catch(console.warn);
}
async function recentCatalog(){
  const r=await getLocal('recent');
  if(!r?.handle)return;
  if(await authorized(r.handle,'read'))await openDirectory(r.handle);
  else toast('Open the catalog again to grant access.',true);
}
function activeFolderTab(){return state.catalog?null:state.sources.find(tab=>tab.id===state.sourceId);}
function applyFolderTabPreferences(tab){
  const prefs=folderTabPreferences(tab?.preferences);
  state.search=prefs.search;state.sort=prefs.sort;state.view=prefs.view;state.size=prefs.size;
  state.fileType=prefs.fileType;state.showHidden=prefs.showHidden;
  state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;
}
function updateActiveFolderTabPreferences(){
  if(state.catalog||!activeFolderTab())return;
  state.sources=updateFolderTabPreferences(state.sources,state.sourceId,{
    search:state.search,sort:state.sort,view:state.view,size:state.size,
    fileType:state.fileType,showHidden:state.showHidden
  });
}
function scheduleFolderTabPreferences(){
  if(state.catalog)return;
  updateActiveFolderTabPreferences();
  clearTimeout(tabPreferencesTimer);
  // Snapshot before a possible switch to Catalog; never rewrite last-mode later.
  const session={tabs:state.sources.map(tab=>({...tab})),activeId:state.sourceId};
  tabPreferencesTimer=setTimeout(()=>{
    tabPreferencesTimer=null;
    tabPersistQueue=tabPersistQueue.catch(()=>{}).then(()=>setLocal('folder-tabs-v1',session))
      .catch(error=>console.warn('Folder Tab preferences could not be saved',error));
  },220);
}
async function switchAdjacentFolderTab(delta){
  if(state.catalog||$('#dialog')||state.previewId)return;
  const next=adjacentFolderTabId(state.sources,state.sourceId,delta);
  if(next)await switchFolderTab(next);
}
function rememberFolderTabs(){
  if(state.catalog)return tabPersistQueue;
  clearTimeout(tabPreferencesTimer);tabPreferencesTimer=null;
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
  const tab=createFolderTab(handle,crypto.randomUUID(),{view:state.view,sort:'name',size:state.size});
  closePreview();invalidateScan();
  if(!stayingPlain){
    state.sources=[];state.handles.clear();state.records.clear();state.taxonomy=[];state.tagFilter=null;
    for(const existing of tabs)state.handles.set(existing.id,existing.handle);
  }
  state.catalog=null;state.catalogHandle=null;state.catalogTagView=null;state.catalogLinksView=false;state.fileType='all';state.activeViewId=null;state.views=[];state.pendingTransaction=null;
  state.sources=[...tabs,tab];state.handles.set(tab.id,handle);
  state.sourceId=tab.id;state.parts=[];state.selected.clear();state.sidebar=false;
  applyFolderTabPreferences(tab);
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
  applyFolderTabPreferences(tab);
  await navigate(id,[...tab.parts],null,{preserveSearch:true});
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
    if(handle.kind!=='file'||!name.endsWith('.json')||conflictCanonicalPath('resources/'+name))continue;
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
  if(state.bulkSaving||state.viewSaving||state.resourceSaving||state.backupBusy)throw Error('Finish catalog editing or backup inspection before switching catalogs.');
  const config=await readJson(h,'catalog.json');
  if(!config?.id||!CODE_PATTERN.test(config.code))throw Error('Choose a .sb directory containing catalog.json.');
  invalidateScan();
  state.catalog=config;state.catalogHandle=h;
  await refreshPendingCatalog(); // Read-only: never replay a journal on open.
  state.sources=await readJson(h,'sources.json',[]);
  const savedTags=await readJson(h,'tags.json',[]);
  if(!Array.isArray(savedTags))throw Error('Invalid tags.json catalog taxonomy');
  state.taxonomy=savedTags;state.views=validateViews(await readJson(h,'views.json',[]));state.activeViewId=null;state.tagFilter=null;state.catalogTagView=null;state.catalogLinksView=false;state.fileType='all';
  state.handles.clear();state.records.clear();
  for(const s of state.sources){
    try{const v=await getLocal('source:'+config.id+':'+s.id);if(v)state.handles.set(s.id,v);}
    catch(e){console.warn('This device cannot restore source handles',e);}
  }
  await refreshRecords(); // Read-only catalog opening must never create a directory.
  await loadDeviceSourceIndex(config.id);
  try{await setLocal('recent',{handle:h,name:config.name});await setLocal('last-mode','catalog');}
  catch(e){console.warn('This browser cannot remember the recent catalog',e);}
  state.sourceId=state.sources[0]?.id||null;
  state.parts=[];state.items=[];state.selected.clear();state.search='';
  render();
  if(state.pendingTransaction)toast('Interrupted catalog save detected. Catalog editing is blocked until recovery.',true);
  if(state.catalogConflicts?.count||state.catalogConflicts?.error)toast('Catalog sync conflict copies detected. Editing is blocked; inspect conflicts in Settings.',true);
  if(state.sourceId)await navigate(state.sourceId,[]);
}
async function addSource(){
  if(state.bulkSaving||state.resourceSaving||state.backupBusy)return toast('Finish metadata editing or backup inspection before registering folders.',true);
  try{
    const h=await window.showDirectoryPicker({mode:'read'});
    if(!await authorized(state.catalogHandle,'readwrite'))throw Error('Catalog write permission is needed to register a folder.');
    const item={id:crypto.randomUUID(),name:h.name};
    const before=await readJson(state.catalogHandle,'sources.json',null),disk=before??[];
    if(JSON.stringify(disk)!==JSON.stringify(state.sources))throw Error('Catalog Folders changed on disk. Reopen the catalog.');
    const nextSources=[...disk,item];
    await commitCatalogEdits([{path:'sources.json',before,after:nextSources}]);
    state.sources=nextSources;invalidateScan();
    try{await setLocal('source:'+state.catalog.id+':'+item.id,h);}
    catch(e){console.warn('Source handle will need reconnecting after reload',e);toast('Source added, but this device cannot remember its permission.',true);}
    state.handles.set(item.id,h);
    toast('Added '+h.name);await navigate(item.id,[]);
  }catch(e){await refreshPendingCatalog();render();if(e.name!=='AbortError')toast(errorText(e),true);}
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
async function navigate(id,parts,historyPosition=null,{preserveSearch=false}={}){
  if(state.bulkSaving||state.viewSaving||state.resourceSaving||state.backupBusy)return toast('Finish catalog editing or backup recovery before navigating.',true);
  if(state.catalogLinksView)state.fileType='all';
  state.catalogTagView=null;state.catalogLinksView=false;state.activeViewId=null;
  state.sourceId=id;state.parts=parts;if(!preserveSearch||state.catalog)state.search='';state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;state.keyboardFocusId=null;state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;
  state.tagDraftItem=null;state.tagFilter=null;state.selectionMode=false;
  const request=++state.request;
  state.loading=true;state.folderReadState='reading';state.items=[];forgetImages();render();
  try{
    const h=sourceHandle();if(!h)throw Error('This source is disconnected on this device.');
    if(!await authorized(h)){state.handles.delete(id);throw Error('Permission expired; reconnect the source.');}
    const folder=await nested(h,parts);
    const result=await enumerateFolderEntries(folder,{
      sourceId:id,parts,isCurrent:()=>request===state.request,
      include:(name,handle)=>!(state.catalog&&handle.kind==='directory'&&name.endsWith('.sb')),
      onProgress:items=>{if(request===state.request){state.items=items;renderItems();}}
    });
    if(request!==state.request||result.cancelled)return;
    state.items=result.items;state.loading=false;
    state.folderReadState=result.truncated?'limited':'complete';
    if(!state.catalog){state.sources=visitFolderTab(state.sources,id,parts,{historyPosition});updateActiveFolderTabPreferences();void rememberFolderTabs();}
    render();
    if(result.truncated)toast('Folder listing reached the '+FOLDER_ENUMERATION_LIMIT.toLocaleString()+'-entry safety limit. Results and search are partial; open a narrower Folder.',true);
  }catch(e){if(request===state.request){
    state.loading=false;state.folderReadState='failed';render();
    toast('Folder listing incomplete: '+errorText(e),true);
  }}
}
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
    const before=await readJson(state.catalogHandle,'tags.json',null),disk=before??[];
    assertTagSnapshotUnchanged(state.taxonomy,disk);
    const updated=toggleTagPin(disk,id);
    await commitCatalogEdits([{path:'tags.json',before,after:updated}]);
    state.taxonomy=updated;
    const nav=$('#tag-nav');if(nav)nav.innerHTML=tagNavigationHTML();
  }catch(error){await refreshPendingCatalog();toast('Pin failed: '+errorText(error),true);render();}
}
async function catalogResultHandle(item){
  if(item?.kind==='url')throw Error('URL resources have no physical Folder handle');
  const root=state.handles.get(item.sourceId);
  if(!root||typeof root.queryPermission!=='function'||await root.queryPermission({mode:'read'})!=='granted')throw Error('This catalog source needs reconnecting before preview.');
  const dir=await nested(root,item.parts);
  return item.kind==='directory'?await dir.getDirectoryHandle(item.name):await dir.getFileHandle(item.name);
}
async function revealCatalogResult(item){
  if(!item?.catalogResult)return;
  if(item.kind==='url')throw Error('URL resources have no physical Folder. Open the link instead.');
  if(!state.handles.has(item.sourceId))throw Error('Reconnect this source through its Catalog Folder first.');
  const sourceId=item.sourceId,parts=[...item.parts],name=item.name;
  await navigate(sourceId,parts);
  const result=state.items.find(x=>x.name===name&&x.kind===item.kind);
  if(result){select(result,{shiftKey:false,ctrlKey:false,metaKey:false});}
  else toast('Resource is no longer present at its catalog path.',true);
}
function openCatalogTagView(path){
  if(!state.catalog||state.bulkSaving||state.viewSaving||state.resourceSaving||state.backupBusy)return;
  if(state.catalogTagView===path){void navigate(state.sourceId,[...state.parts]);return;}
  try{
    state.catalogTagView=path;state.catalogLinksView=false;state.activeViewId=null;state.tagFilter=null;state.fileType='all';state.search='';state.selected.clear();
    state.lastSelected=null;state.tagDraftItem=null;state.tagDraft=[];state.selectionMode=false;state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;
    ++state.request;forgetImages();state.loading=false;
    state.items=catalogTagResults([...state.records.values()],state.sources,state.taxonomy,path).map(item=>({...item,catalogResult:true,handle:null}));
    render();
  }catch(error){toast(errorText(error),true);}
}
function showCatalogLinks(){
  if(!state.catalog||state.resourceSaving||state.bulkSaving||state.viewSaving||state.backupBusy)return;
  state.catalogLinksView=true;state.catalogTagView=null;state.activeViewId=null;state.tagFilter=null;
  state.search='';state.fileType='url';state.fileStatus='all';state.selected.clear();
  state.lastSelected=null;state.tagDraftItem=null;state.selectionMode=false;state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;
  ++state.request;forgetImages();state.loading=false;
  state.items=catalogQueryResults([...state.records.values()],state.sources,state.taxonomy,{fileType:'url'})
    .map(item=>({...item,catalogResult:true,handle:null}));
  render();
}
async function refreshCatalogTagView(){
  if(!viewsUI.inResults())return;
  try{
    await refreshRecords();
    state.items=(state.activeViewId?[]:(state.catalogLinksView?catalogQueryResults([...state.records.values()],state.sources,state.taxonomy,{fileType:'url'}):catalogTagResults([...state.records.values()],state.sources,state.taxonomy,state.catalogTagView)).map(item=>({...item,catalogResult:true,handle:null})));if(state.activeViewId){viewsUI.open(state.activeViewId);return;}
    state.selected.clear();render();
  }catch(error){toast(errorText(error),true);}
}
function scanStatus(){
  if(state.scanBusy)return state.scanCommitting?'Saving device index…':state.scanProgress||'Scanning folders…';
  if(state.indexProblem)return state.indexProblem;
  if(!state.scan)return 'Cataloged only · index not built';
  const fresh=state.scan.completeRootIds.length,stale=state.scan.staleRootIds?.length||0;
  return state.scan.entries.length+' indexed · '+fresh+' scanned'+(state.scan.completeSubtreePaths?.length?' · '+state.scan.completeSubtreePaths.length+' subfolder(s) refreshed':'')+(stale?' · '+stale+' cached/partial':'')+
    (state.scan.problems.length?' · '+state.scan.problems.length+' issue(s)':'')+
    (state.scan.overlaps?.length?' · '+state.scan.overlaps.length+' verified overlaps':'')+
    (state.scan.overlapProblems?.length?' · '+state.scan.overlapProblems.length+' overlap checks unresolved':'');
}
async function runCatalogScan(rootId='',folderPath=''){
  if(!state.catalog||state.scanBusy||state.bulkSaving||state.viewSaving||state.resourceSaving||state.backupBusy)return;
  const selected=rootId?state.sources.filter(s=>s.id===rootId):state.sources;
  if(!selected.length)return toast('No Catalog Folder selected.',true);
  const scoped=!!folderPath;
  if(scoped&&!rootId)return toast('Choose a Catalog Folder before selecting a subfolder.',true);
  const generation=++state.scanGeneration,catalogId=state.catalog.id;
  state.scanBusy=true;state.scanCommitting=false;
  state.scanProgress=scoped?'Scanning subfolder…':'Scanning folders…';state.indexProblem='';render();
  try{
    const previous=state.sourceIndex||emptySourceIndex(catalogId);
    const handles=new Map(state.handles);
    // A cached root must still be the same physical directory before any
    // replacement, even when a new handle has the same visible name.
    for(const source of selected)
      if(previous.roots.some(r=>r.sourceId===source.id))
        await assertIndexedRootIdentity(previous,source.id,handles);
    if(generation!==state.scanGeneration)return;
    const onProgress=p=>{
      if(generation!==state.scanGeneration)return;
      state.scanProgress=p.count+' entries · '+(scoped?'subfolder':p.completeRoots+'/'+p.totalRoots+' folders');
      const label=$('#scan-status');if(label)label.textContent=state.scanProgress;
    };
    const options={
      isCancelled:()=>generation!==state.scanGeneration||state.catalog?.id!==catalogId,
      onProgress
    };
    const scan=scoped
      ?await scanRegisteredSubfolder({id:selected[0].id,name:selected[0].name},handles.get(rootId),folderPath,options)
      :await scanRegisteredFolders(selected.map(s=>({id:s.id,name:s.name})),handles,options);
    if(generation!==state.scanGeneration||scan.cancelled)return;
    state.scanCommitting=true;render(); // Persistence is no longer cancellable.
    const result=scoped
      ?await refreshSourceSubtreeIndex(previous,scan,rootId,folderPath,handles)
      :refreshSourceIndex(previous,scan,selected.map(s=>s.id),handles);
    if(generation!==state.scanGeneration)return;
    const fresh=new Set(state.indexFreshIds);
    let freshSubtrees=state.indexFreshSubtrees.filter(scope=>
      !selected.some(source=>source.id===scope.sourceId&&
        (!scoped||scope.path===folderPath||scope.path.startsWith(folderPath+'/')||folderPath.startsWith(scope.path+'/'))));
    if(!scoped){
      for(const source of selected)fresh.delete(source.id);
      for(const id of result.completeRootIds)fresh.add(id);
    }else if(result.partialRootIds.length){
      fresh.delete(rootId);
      freshSubtrees=freshSubtrees.filter(scope=>scope.sourceId!==rootId);
    }else freshSubtrees.push(...result.completeSubtreePaths);
    state.sourceIndex=result.index;state.indexFreshIds=fresh;state.indexFreshSubtrees=freshSubtrees;
    state.scan=sourceIndexOverlay(result.index,{
      freshRootIds:[...fresh],freshSubtreePaths:freshSubtrees,partialRootIds:result.partialRootIds,
      partialEntries:result.partialEntries,problems:result.problems
    });
    await attachVerifiedSourceOverlaps(result.index,generation,catalogId);
    if(generation!==state.scanGeneration)return;
    if(state.activeViewId)viewsUI.requery();else render();
    const completeCount=(result.completeRootIds?.length||0)+(result.completeSubtreePaths?.length||0);
    let saved=true;
    if(completeCount){
      try{await setLocal(sourceIndexKey(catalogId),result.index);}
      catch(error){saved=false;state.indexProblem='Index updated in memory only · device storage failed';console.warn('Index persistence failed',error);}
    }
    if(generation!==state.scanGeneration)return;
    const changes=result.changes.filter(x=>!x.initial);
    const summary=changes.length?' · '+changes.reduce((n,x)=>n+x.added,0)+' added, '+
      changes.reduce((n,x)=>n+x.removed,0)+' removed, '+
      changes.reduce((n,x)=>n+x.typeChanged,0)+' type changed':'';
    toast((!completeCount?'Partial scan · cache unchanged':saved?(scoped?'Subfolder refreshed':'Index refreshed'):'Index not saved')+summary+
      (scan.problems.length?' · '+scan.problems.length+' issue(s)':''),!saved||!!scan.problems.length);
  }catch(error){if(generation===state.scanGeneration)toast('Index refresh failed: '+errorText(error),true);}
  finally{if(generation===state.scanGeneration){state.scanBusy=false;state.scanCommitting=false;state.scanProgress='';render();}}
}
function cancelCatalogScan(){
  if(!state.scanBusy)return;
  if(state.scanCommitting)return toast('Device index update is finishing; it cannot be cancelled now.');
  ++state.scanGeneration;state.scanBusy=false;state.scanCommitting=false;state.scanProgress='';
  render();toast('Scan cancelled; previous index retained.');
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
    :'<div class="section-head"><span>LEGACY LINKS</span>'+button('Review legacy Catalog links','link','catalog-links')+'</div><nav><button class="nav-item '+(state.catalogLinksView?'selected':'')+'" data-action="show-catalog-links">'+icon('link',15)+'<span>Links</span></button></nav><div class="section-head"><span>TAGS</span><span class="tag-count">'+state.taxonomy.length+'</span></div><nav id="tag-nav">'+(tagNavigationHTML()||'<div class="tag-empty">Add tags to a resource</div>')+'</nav><div class="section-head"><span>VIEWS</span>'+button('Save View','plus','save-view')+'</div><nav>'+viewRows+'</nav>';
  const header='<button class="catalog-chip" data-action="home">'+icon(plain?'folder':'database',16)+'<span>'+escapeHTML(plain?'Browse':state.catalog.name)+'</span>'+icon('chevron',13)+'</button>';
  const recoveryNotice=!plain&&state.pendingTransaction?'<div class="catalog-recovery" role="status">'+icon('alert',15)+'<span>'+(state.pendingTransaction.error||state.pendingTransaction.conflicts?.length?'Catalog recovery needs manual repair':'Interrupted catalog save · '+state.pendingTransaction.applied+'/'+state.pendingTransaction.total+' changes')+'</span>'+(state.pendingTransaction.error||state.pendingTransaction.conflicts?.length?'':'<button class="secondary" data-action="recover-catalog" title="Resume catalog-only save">'+icon('refresh',14)+' Resume</button>')+'</div>':'';
  const conflictNotice=!plain&&(state.catalogConflicts?.count||state.catalogConflicts?.error)?'<div id="catalog-conflict-notice" class="catalog-recovery" role="status">'+icon('alert',15)+'<span>'+(state.catalogConflicts.error?'Conflict scan needs attention':state.catalogConflicts.count+' Catalog sync conflict copy/copies')+'</span><button class="secondary" data-action="inspect-catalog-conflicts" title="Inspect sync conflict copies">Inspect</button></div>':'';
  const selectionActions=viewsUI.inResults()?'':'<button class="text-button '+(state.selectionMode?'active':'')+'" data-action="toggle-selection" aria-pressed="'+state.selectionMode+'" title="Toggle multi-selection (touch friendly)">'+icon('check',15)+' <span>Select</span></button>'+'<button class="text-button" data-action="select-shown" title="Select displayed items (maximum 250)" '+(state.selectionMode?'':'hidden')+'>'+icon('list',15)+' <span>All shown</span></button>'+'<button class="text-button" data-action="clear-selection" title="Clear selection" '+(state.selected.size?'':'hidden')+'>'+icon('close',15)+' <span>Clear</span></button>';
  const fileActions=viewsUI.inResults()?'':(plain?'':'<button class="text-button" data-action="create-folder">'+icon('plus')+' <span>Folder</span></button>')+'<button class="text-button" data-action="import">'+icon('upload')+' <span>Add files</span></button>';
  const viewActions=plain?'':state.activeViewId?'<button class="text-button" data-action="update-view" title="Update View">'+icon('save',15)+' <span>Update</span></button><button class="text-button" data-action="edit-view-tags" title="Edit View tags">'+icon('tag',15)+' <span>Tags</span></button><button class="text-button" data-action="rename-view" title="Rename View">'+icon('more',15)+' <span>Rename</span></button>':'<button class="text-button" data-action="save-view" title="Save View">'+icon('bookmark',15)+' <span>Save View</span></button>';
  const typeControl=plain?'<select id="file-type" class="sort-control type-control" aria-label="File type">'+FOLDER_FILE_TYPES.map(([value,label])=>'<option value="'+value+'" '+(state.fileType===value?'selected':'')+'>'+label+'</option>').join('')+'</select>':'<select id="file-type" class="sort-control type-control" aria-label="File type"><option value="all" '+(state.fileType==='all'?'selected':'')+'>All types</option><option value="image" '+(state.fileType==='image'?'selected':'')+'>Images</option><option value="pdf" '+(state.fileType==='pdf'?'selected':'')+'>PDFs</option><option value="video" '+(state.fileType==='video'?'selected':'')+'>Videos</option><option value="folder" '+(state.fileType==='folder'?'selected':'')+'>Folders</option><option value="url" '+(state.fileType==='url'?'selected':'')+'>Links</option><option value="other" '+(state.fileType==='other'?'selected':'')+'>Other</option></select>';
  const hiddenControl=plain?'<button type="button" class="text-button '+(state.showHidden?'active':'')+'" data-action="toggle-dotfiles" aria-pressed="'+state.showHidden+'" title="Show or hide dot-prefixed files and folders">'+icon('view',14)+' <span>Dotfiles</span></button>':'';
  const statusControl=state.activeViewId?'<select id="file-status" class="sort-control" aria-label="Catalog status"><option value="all" '+(state.fileStatus==='all'?'selected':'')+'>All statuses</option><option value="cataloged" '+(state.fileStatus==='cataloged'?'selected':'')+'>Cataloged</option><option value="unobjectified" '+(state.fileStatus==='unobjectified'?'selected':'')+'>Not cataloged</option><option value="missing" '+(state.fileStatus==='missing'?'selected':'')+'>Missing (scan)</option><option value="changed" '+(state.fileStatus==='changed'?'selected':'')+'>Type changed (scan)</option></select>':'';
  const columnsButton=state.view==='table'?'<button class="text-button" data-action="table-columns" title="Choose table columns" aria-label="Choose table columns">'+icon('table',15)+' <span>Columns</span></button>':'';
  const selectedIndexRoot=state.sourceIndex?.roots.find(root=>root.sourceId===state.scanRootId);
  const scanPaths=selectedIndexRoot?.entries.filter(entry=>entry.kind==='directory').slice(0,150)||[];
  const scanControls=state.activeViewId?'<select class="sort-control" id="scan-root" aria-label="Choose Folder to index" '+(state.scanBusy?'disabled':'')+'><option value="">All Folders</option>'+
    state.sources.map(s=>'<option value="'+escapeHTML(s.id)+'" '+(s.id===state.scanRootId?'selected':'')+'>'+escapeHTML(s.name||'Folder')+'</option>').join('')+'</select>'+
    '<input id="scan-subfolder" class="scan-subfolder" type="text" list="scan-subfolder-paths" aria-label="Subfolder path to refresh" title="Optional relative subfolder path. Leave empty to refresh the whole Folder. Only complete indexed Folders support subfolder refresh." placeholder="Subfolder (optional)" value="'+escapeHTML(state.scanFolderPath)+'" '+(state.scanBusy||!selectedIndexRoot?'disabled':'')+' />'+
    '<datalist id="scan-subfolder-paths">'+scanPaths.map(entry=>'<option value="'+escapeHTML(entry.path)+'"></option>').join('')+'</datalist>'+
    '<button class="text-button" data-action="'+(state.scanBusy?'cancel-scan':'scan-folders')+'" '+(state.scanCommitting?'disabled':'')+' title="Read-only refresh of selected Catalog Folder(s), or a specified indexed subfolder">'+icon(state.scanBusy?'close':'search',15)+' <span>'+(state.scanCommitting?'Saving':state.scanBusy?'Cancel':state.sourceIndex?.roots.length?'Refresh':'Index')+'</span></button>'+
    ((state.sourceIndex?.roots.length||state.indexProblem)&&!state.scanBusy?'<button class="text-button" data-action="clear-source-index" title="Clear device-local index">'+icon('close',13)+' <span>Clear</span></button>':'')+
    '<span class="scan-status" id="scan-status" title="Device-local snapshot, not a live filesystem watcher. Cached roots cannot assert missing files.">'+escapeHTML(scanStatus())+'</span>':'';
  const sortControl='<select id="sort-mode" class="sort-control" aria-label="Sort"><option value="name" '+(state.sort==='name'?'selected':'')+'>Name ↑</option><option value="name-desc" '+(state.sort==='name-desc'?'selected':'')+'>Name ↓</option><option value="type" '+(state.sort==='type'?'selected':'')+'>Type</option>'+(plain?'':'<option value="location" '+(state.sort==='location'?'selected':'')+'>Location</option>')+'</select>';
  const groupControl=state.activeViewId?'<select id="group-mode" class="sort-control" aria-label="Group by"><option value="none" '+(state.groupBy==='none'?'selected':'')+'>No groups</option><option value="source" '+(state.groupBy==='source'?'selected':'')+'>By source</option><option value="folder" '+(state.groupBy==='folder'?'selected':'')+'>By folder</option><option value="type" '+(state.groupBy==='type'?'selected':'')+'>By type</option></select>':'';
  const activeTab=activeFolderTab();
  const backward=activeTab&&activeTab.position>0;
  const nextward=activeTab&&activeTab.position<activeTab.history.length-1;
  const historyControls=plain
    ?'<button class="icon-button" title="Back" aria-label="Back" data-action="tab-back" '+(backward?'':'disabled')+'>'+icon('back')+'</button><button class="icon-button" title="Forward" aria-label="Forward" data-action="tab-forward" '+(nextward?'':'disabled')+'>'+icon('forward')+'</button>'
    :'';
  const tabSwitchControls=plain&&state.sources.length>1
    ?'<span class="tab-switch-controls" role="group" aria-label="Switch Folder Tabs"><button class="icon-button" data-action="tab-prev" title="Previous Folder Tab (Alt+Shift+Left)" aria-label="Previous Folder Tab">'+icon('back',14)+'</button><button class="icon-button" data-action="tab-next" title="Next Folder Tab (Alt+Shift+Right)" aria-label="Next Folder Tab">'+icon('forward',14)+'</button></span>'
    :'';
  clearSidePreview();
  $('#app').innerHTML='<div class="shell"><aside id="sidebar" class="sidebar '+(state.sidebar?'open':'')+'"><div class="brand">'+icon('book',22)+'<strong>Sourcebook</strong></div>'+header+recoveryNotice+conflictNotice+rootSection+catalogSection+'<div class="sidebar-footer">'+(plain?'Local folder · read-only':'Local catalog')+'</div></aside><div id="sidebar-resizer" class="pane-grip" role="separator" tabindex="0" aria-label="Resize sidebar" aria-orientation="vertical"></div><div class="workspace"><header class="topbar">'+button('Navigation','menu','sidebar')+historyControls+tabSwitchControls+'<div class="breadcrumbs" id="breadcrumbs"></div><label class="search">'+icon('search',16)+'<input id="search-input" type="search" maxlength="256" placeholder="Search" value="'+escapeHTML(state.search)+'"/></label>'+button('Refresh','refresh','refresh') +button('Save URL or text as file','file','capture-file')+button('Review clipboard image','image','capture-clipboard-image')+'<div class="layout-buttons" role="group" aria-label="Layout">'+button('Gallery','grid','gallery',state.view==='gallery')+button('List','list','list',state.view==='list')+button('Table','table','table',state.view==='table')+'</div>'+button('Inspector','info','inspector',state.inspector)+button('Settings','more','settings')+'</header><div class="contentbar"><h2>'+escapeHTML(viewsUI.title()||state.parts.at(-1)||currentSource()?.name||'Files')+'</h2><span class="count" id="item-count"></span>'+(state.tagFilter?'<button class="filter-pill" data-action="clear-tag-filter" title="Clear tag filter">#'+escapeHTML(tagLeaf(state.tagFilter))+' '+icon('close',12)+'</button>':'')+'<div class="spacer"></div><label class="zoom" '+(state.view==='table'?'hidden':'')+'>'+icon('grid',15)+'<input id="density" type="range" min="110" max="280" value="'+state.size+'" aria-label="Thumbnail size"/></label>'+typeControl+hiddenControl+statusControl+sortControl+groupControl+columnsButton+viewActions+scanControls+selectionActions+fileActions+'</div><div id="scroller" class="scroller"><div id="items"></div></div><footer class="footer"><span id="status">Local-first</span><span>'+(plain?'Folder browser':'Sourcebook preview')+'</span></footer></div>'+(state.inspector?'<div id="inspector-resizer" class="pane-grip" role="separator" tabindex="0" aria-label="Resize side preview" aria-orientation="vertical"></div><aside class="inspector"><h3>'+(plain?'File info':'Properties')+'</h3><div id="side-preview" class="side-preview" aria-label="Selected file preview"></div><div id="inspector-data"></div></aside>':'')+'</div>';
  $('#breadcrumbs').innerHTML=viewsUI.inResults()?'<button data-action="exit-catalog-tag">'+icon('database',16)+' Catalog</button><span class="crumb">'+icon('chevron',13)+'</span><button>'+icon('tag',14)+' '+escapeHTML(viewsUI.title())+'</button>':'<button data-crumb="-1">'+icon('folder',16)+' '+escapeHTML(currentSource()?.name||'Files')+'</button>'+state.parts.map((part,i)=>'<span class="crumb">'+icon('chevron',13)+'</span><button data-crumb="'+i+'">'+escapeHTML(part)+'</button>').join('');
  renderItems();renderInspector();
}
function visibleItems(){
  if(viewsUI.inResults())return sortCatalogResults(state.items.filter(item=>(state.fileType==='all'||catalogFileType(item)===state.fileType)&&matchesResourceSearch(item.kind==='url'?item.name+' '+item.url:item.name,recordTagPaths(item.record,state.taxonomy),state.search)),state.sort);
  if(!state.catalog)return sortBrowserItems(filterFolderEntries(state.items,{
    query:state.search,fileType:state.fileType,showHidden:state.showHidden,nameOf:item=>cleanName(item.name)
  }),state.sort);
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
  return '<button class="resource '+(state.selected.has(item.id)?'selected':'')+'" data-item="'+escapeHTML(item.id)+'" title="'+escapeHTML(item.name)+'" aria-selected="'+state.selected.has(item.id)+'"><span class="art '+kind+'">'+fileSymbol(item)+(kind==='image'?'<img loading="lazy" alt="" class="thumbnail"/>':'')+'</span><span class="filename">'+escapeHTML(cleanName(item.name))+'</span><span class="filetype">'+(item.catalogResult?escapeHTML(item.location+(item.missing?' · Missing at scan':'')+(item.changedKind?' · Type changed':'')+(item.unobjectified?' · Not cataloged':'')+(item.overlapConflict?' · Overlap: review metadata':'')):kind==='folder'?'Folder':kind)+'</span></button>';
}
function resourceTableRow(item){
  const meta=viewTableMetadata(item,recordTagPaths(itemRecord(item),state.taxonomy));
  const kind=itemKind(item);
  const columns=normalizeTableColumns(state.tableColumns);
  return '<tr class="resource '+(state.selected.has(item.id)?'selected':'')+'" data-item="'+escapeHTML(item.id)+'" tabindex="0" aria-selected="'+state.selected.has(item.id)+'" title="'+escapeHTML(item.name)+'">'+columns.map(key=>{
    if(key==='name')return '<td class="table-name">'+fileSymbol(item)+'<span>'+escapeHTML(cleanName(item.name))+'</span></td>';
    const value=key==='tags'?meta.tags.map(tag=>'#'+tag).join(' '):meta[key]??'';
    return '<td class="table-'+key+'" title="'+escapeHTML(String(value))+'">'+escapeHTML(String(value))+'</td>';
  }).join('')+'</tr>';
}
function renderItems(){
  const host=$('#items');if(!host)return;
  const activeResourceId=document.activeElement?.closest('#items .resource[data-item]')?.dataset.item||null;
  const activePager=document.activeElement?.closest('#items [data-page-step]')?.dataset.pageStep||null;
  state.observer?.disconnect();state.observer=null;
  host.className=state.view+(viewsUI.inResults()?' catalog-results':'');
  host.style.setProperty('--size',state.size+'px');
  const items=visibleItems();
  // Never retain hidden selections after a filter or listing change.
  const kept=pruneVisibleSelection(items.map(item=>item.id),state.selected,state.selectionAnchor,state.lastSelected);
  if(kept.changed){state.selected=kept.selected;state.selectionAnchor=kept.anchorId;state.lastSelected=kept.focusId;queueMicrotask(()=>renderInspector());}
  const ambiguous=items.filter(item=>item.overlapConflict).length;
  const partial=!viewsUI.inResults()&&(state.folderReadState==='limited'||state.folderReadState==='failed');
  const partialLabel=state.folderReadState==='limited'?' · partial (safety limit)':' · incomplete (read failed)';
  const filtered=!state.catalog&&(state.search.trim()||state.fileType!=='all'||!state.showHidden);
  $('#item-count').textContent=items.length+(state.loading?'+':'')+' items'+(filtered?' of '+state.items.length+' read':'')+(partial?partialLabel:'')+(ambiguous?' · '+ambiguous+' overlap metadata entries':'');
  if(!viewsUI.inResults()&&!state.sourceId){host.innerHTML='<div class="empty">'+icon('folder',38)+'<h3>Your files, one click away</h3><p>Choose a folder to browse.</p><button class="primary" data-action="'+(state.catalog?'add-source':'open-folder')+'">Open folder</button></div>';return;}
  if(!viewsUI.inResults()&&!state.handles.has(state.sourceId)){host.innerHTML='<div class="empty">'+icon('alert',35)+'<h3>Reconnect your folder</h3><p>Renew this folder permission to continue.</p><button class="primary" data-action="reconnect">Reconnect source</button></div>';return;}
  if(!items.length){host.innerHTML='<div class="empty">'+icon('folder',32)+'<h3>'+(state.loading?'Reading files…':partial?'Folder listing incomplete':state.search||state.tagFilter||viewsUI.inResults()||(!state.catalog&&(state.fileType!=='all'||!state.showHidden))?'No matches':'Nothing here yet')+'</h3></div>';return;}
  const page=pageWindow(items.length,state.pageOffset,state.pageCount);
  state.pageOffset=page.start;
  const shown=items.slice(page.start,page.end);
  // Release off-page thumbnail URLs rather than retaining up to 20,000 images.
  const onPage=new Set(shown.map(item=>item.id));
  for(const [id,url] of state.thumbnailUrls){
    if(!onPage.has(id)){URL.revokeObjectURL(url);state.imageUrls.delete(url);state.thumbnailUrls.delete(id);}
  }
  const grouped=!!state.activeViewId&&state.groupBy!=='none';
  const groups=groupViewItems(shown,grouped?state.groupBy:'none');
  const pager=page.pages>1?'<nav class="resource-pager" aria-label="Resource pages"><button type="button" data-page-step="-1" '+(page.hasPrevious?'':'disabled')+' aria-label="Previous resource page">'+icon('back',14)+' Previous</button><span aria-live="polite">'+(page.start+1)+'–'+page.end+' of '+page.total+' · Page '+page.page+'/'+page.pages+'</span><button type="button" data-page-step="1" '+(page.hasNext?'':'disabled')+' aria-label="Next resource page">Next '+icon('forward',14)+'</button></nav>':'';
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
    host.innerHTML='<table class="view-table"><thead><tr>'+headers+'</tr></thead><tbody>'+groupRows+'</tbody></table>'+pager;
  }else if(grouped){
    host.classList.add('grouped');
    host.innerHTML=groups.map(group=>'<section class="resource-group"><h3 class="resource-group-title">'+escapeHTML(group.label)+' <span>'+group.items.length+'</span></h3><div class="group-contents '+state.view+'">'+group.items.map(resourceCard).join('')+'</div></section>').join('')+pager;
  }else host.innerHTML=shown.map(resourceCard).join('')+pager;
  if(activeResourceId)state.keyboardFocusId=activeResourceId;
  syncResourceTabStops();
  if(activeResourceId){
    const replacement=[...host.querySelectorAll('.resource[data-item]')].find(node=>node.dataset.item===activeResourceId);
    (replacement||host.querySelector('.resource[data-item]'))?.focus({preventScroll:true});
  }else if(activePager){
    (host.querySelector('[data-page-step="'+activePager+'"]:not(:disabled)')||host.querySelector('.resource[data-item]'))?.focus({preventScroll:true});
  }
  const watcher=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){watcher.unobserve(entry.target);thumbnail(entry.target);}
  },{root:$('#scroller'),rootMargin:'240px'});
  state.observer=watcher;
  host.querySelectorAll('.resource:has(.thumbnail)').forEach(el=>watcher.observe(el));
  $('#status').textContent=state.selected.size?state.selected.size+' selected'+(partial?' · incomplete listing':''):'Local-first · '+items.length+' resources'+(partial?' · incomplete listing':'');
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
function clearSidePreview(){
  ++state.sidePreviewSerial;
  if(state.sidePreviewUrl){URL.revokeObjectURL(state.sidePreviewUrl);state.sidePreviewUrl=null;}
}
async function renderSidePreview(item){
  const host=$('#side-preview');
  clearSidePreview();
  if(!host)return;
  const serial=state.sidePreviewSerial;
  if(!item){host.innerHTML='<div class="side-preview-empty">'+icon('view',25)+'<span>Select a file to preview</span></div>';return;}
  if(item.missing){host.innerHTML='<div class="side-preview-empty">'+icon('alert',23)+'<span>File not found at last completed scan</span></div>';return;}
  if(item.kind==='url'){
    host.innerHTML='<div class="side-preview-symbol">'+fileSymbol(item)+'<span>'+escapeHTML(item.url)+'</span></div>';return;
  }
  if(item.kind==='directory'){
    host.innerHTML='<div class="side-preview-symbol">'+fileSymbol(item)+'</div>';
    return;
  }
  host.innerHTML='<div class="side-preview-empty">Loading preview…</div>';
  try{
    const handle=item.catalogResult?await catalogResultHandle(item):item.handle;
    if(!handle||typeof handle.getFile!=='function')throw Error('Reconnect folder to preview');
    const file=await handle.getFile(),format=sidePreviewKind(item,file.size);
    let body;
    if(format==='shortcut'){
      const shortcut=await readPhysicalShortcut(file);
      body=shortcut.status==='ok'?'<div class="side-preview-symbol">'+fileSymbol(item)+'<a href="'+escapeHTML(shortcut.url)+'" target="_blank" rel="noopener noreferrer" title="Open external link">'+escapeHTML(shortcut.url)+'</a></div>':'<div class="side-preview-symbol">'+escapeHTML(shortcut.reason)+'</div>';
    }else if(format==='text'){
      const text=await file.slice(0,120000).text();
      body='<pre class="side-preview-text">'+escapeHTML(text)+'</pre>';
    }else if(['image','pdf','video','audio'].includes(format)){
      if(serial!==state.sidePreviewSerial||!host.isConnected)return;
      const url=URL.createObjectURL(file);
      state.sidePreviewUrl=url;
      if(format==='image')body='<img src="'+url+'" alt="'+escapeHTML(item.name)+'" class="side-preview-media"/>';
      if(format==='pdf')body='<iframe src="'+url+'#toolbar=0" title="PDF preview" class="side-preview-pdf"></iframe>';
      if(format==='video')body='<video src="'+url+'" controls preload="metadata" class="side-preview-media"></video>';
      if(format==='audio')body='<audio src="'+url+'" controls preload="metadata" class="side-preview-audio"></audio>';
    }else body='<div class="side-preview-symbol">'+fileSymbol(item)+'<span>'+(format==='large-text'?'Large text file':'Preview unavailable')+'</span></div>';
    if(serial!==state.sidePreviewSerial||!host.isConnected)return;
    host.innerHTML='<div class="side-preview-content">'+body+'</div><button class="side-preview-open" data-action="side-open-preview" title="Open full preview">'+icon('view',14)+'<span>Open preview</span></button>';
  }catch(error){
    if(serial!==state.sidePreviewSerial||!host.isConnected)return;
    host.innerHTML='<div class="side-preview-empty">'+icon('alert',18)+'<span>'+escapeHTML(errorText(error))+'</span></div>';
  }
}
function renderInspector(){
  const host=$('#inspector-data');if(!host)return;
  void renderSidePreview(state.selected.size===1?state.items.find(x=>state.selected.has(x.id)):null);
  if(viewsUI.inResults()){
    const selected=state.selected.size===1?state.items.find(item=>state.selected.has(item.id)):null;
    if(!selected){host.innerHTML='<div class="inspector-placeholder">'+icon('info',32)+'<span>'+(state.selected.size?state.selected.size+' results selected':'Select a resource')+'</span></div>';return;}
    const tags=recordTagPaths(selected.record,state.taxonomy);
    if(selected.kind==='url'){
      host.innerHTML='<h4>'+escapeHTML(selected.name)+'</h4><div class="detail"><div class="label">URL</div><div class="micro-hint">'+escapeHTML(selected.url)+'</div></div><div class="detail"><div class="label">TAGS</div>'+tags.map(t=>'<span class="tag-pill" title="'+escapeHTML(t)+'">#'+escapeHTML(tagLeaf(t))+'</span>').join(' ')+'</div><div class="detail"><div class="label">NOTES</div><div class="micro-hint">'+escapeHTML(selected.record?.notes||'—')+'</div></div><a class="secondary full" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(selected.url)+'">'+icon('link',15)+' Open link</a><button class="secondary full" data-action="edit-catalog-link">'+icon('tag',15)+' Edit metadata</button>';
      return;
    }
    host.innerHTML='<h4>'+escapeHTML(cleanName(selected.name))+'</h4><div class="detail"><div class="label">LOCATION</div><div class="micro-hint">'+escapeHTML(selected.location)+'</div></div>'+(selected.missing?'<div class="micro-hint">Not found during the last completed folder scan. Check the path before editing metadata.</div>':'')+(selected.changedKind?'<div class="micro-hint">Source type differs from catalog metadata. Resolve before editing.</div>':'')+(selected.overlapConflict?'<div class="micro-hint" role="status">Verified overlapping Folders report competing metadata or inconsistent source state. Both entries remain visible; review each registered Folder before editing. No records were merged.</div>':'')+(selected.unobjectified?'<div class="micro-hint">Not cataloged. Reveal in folder to add tags.</div>':'')+(selected.staleIndex?'<div class="micro-hint">Cached index snapshot · refresh this Folder to verify its contents.</div>':'')+'<div class="detail"><div class="label">TAGS</div>'+tags.map(t=>'<span class="tag-pill" title="'+escapeHTML(t)+'">#'+escapeHTML(tagLeaf(t))+'</span>').join(' ')+'</div>'+(selected.overlapConflict?'<button class="secondary full" data-action="review-overlap-records">'+icon('search',15)+' Review overlapping records</button>':'')+'<button class="secondary full" data-action="reveal-catalog-result">'+icon('folder',16)+' Show in folder</button>';
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
    host.innerHTML='<h4>'+escapeHTML(cleanName(item.name))+'</h4>'+(item.kind==='directory'?'<button class="secondary full" data-action="open-selected-tab">'+icon('plus',15)+' Open in new tab</button>':'')+'<details class="file-details" open><summary>File information</summary><code>'+escapeHTML(item.name)+'</code></details>';
    return;
  }
  if(state.tagDraftItem!==item.id){
    state.tagDraftItem=item.id;state.tagDraft=recordTagPaths(record,state.taxonomy);
  }
  host.innerHTML='<h4>'+escapeHTML(cleanName(item.name))+'</h4><div class="detail"><div class="label">TAGS</div><div class="tag-editor" id="tag-editor"><div class="tag-pills" id="tag-pills"></div><input id="tag-input" aria-label="Add tag" placeholder="# Add tag…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="tag-suggestions" aria-expanded="false"/></div><div class="tag-suggestions" id="tag-suggestions" role="listbox" aria-label="Existing tags" hidden></div><div class="micro-hint">Nest tags with /, e.g. Architecture / Facades</div></div><div class="detail"><div class="label">NOTES</div><textarea rows="3" id="notes" placeholder="Optional note">'+escapeHTML(record?.notes||'')+'</textarea></div><button class="primary full" data-action="save-resource">'+icon('save',16)+' Save</button><details class="file-details"><summary>File information</summary><code>'+escapeHTML(item.name)+'</code>'+(record?'<div class="micro-hint">ID: '+escapeHTML(record.id)+'</div>':'')+'</details>';
  renderTagPills();
}
function syncResourceTabStops(){
  const nodes=[...document.querySelectorAll('#items .resource[data-item]')];
  state.keyboardFocusId=resourceFocusId(nodes.map(node=>node.dataset.item),state.keyboardFocusId);
  for(const node of nodes)node.tabIndex=node.dataset.item===state.keyboardFocusId?0:-1;
}
function refreshSelectionUI(){
  syncResourceTabStops();
  for(const node of document.querySelectorAll('#items [data-item]')){
    const selected=state.selected.has(node.dataset.item);
    node.classList.toggle('selected',selected);
    node.setAttribute('aria-selected',String(selected));
  }
  const clear=$('[data-action="clear-selection"]');if(clear)clear.hidden=!state.selected.size;
  const status=$('#status');
  if(status){
    const partial=!viewsUI.inResults()&&['limited','failed'].includes(state.folderReadState);
    status.textContent=state.selected.size?state.selected.size+' selected'+(partial?' · incomplete listing':''):
      'Local-first · '+visibleItems().length+' shown'+(partial?' · incomplete listing':'');
  }
}
function select(item,event){
  if(state.bulkSaving)return false;
  try{
    const next=changeVisibleSelection(visibleItems().map(entry=>entry.id),{
      selected:state.selected,anchorId:state.selectionAnchor,focusId:state.lastSelected
    },item.id,{range:!!event.shiftKey,additive:!!(event.ctrlKey||event.metaKey)&&!!event.shiftKey,
      toggle:!!(event.ctrlKey||event.metaKey||state.selectionMode),limit:SELECTION_LIMIT});
    state.selected=next.selected;state.selectionAnchor=next.anchorId;state.lastSelected=next.focusId;
    state.keyboardFocusId=item.id;
    refreshSelectionUI();renderInspector();return true;
  }catch(error){toast('Selection: '+errorText(error),true);return false;}
}
function selectShownItems(){
  const items=visibleItems(),page=pageWindow(items.length,state.pageOffset,state.pageCount);
  const shown=items.slice(page.start,page.end).map(item=>item.id);
  const result=selectDisplayedItems(shown,SELECTION_LIMIT);
  state.selected=result.selected;state.selectionAnchor=result.anchorId;state.lastSelected=result.focusId;
  state.selectionMode=true;render();
  if(result.truncated)toast('Selected the first '+SELECTION_LIMIT+' displayed items. Narrow the filter to select a different range.',true);
}
async function bulkTags(mode){
  if(!state.catalog||state.bulkSaving||state.resourceSaving||state.backupBusy||state.selected.size<2)return;
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
    if(state.pendingTransaction)throw Error('Recover the interrupted catalog save before bulk tagging.');
    const count=await commitBulkTags({handle:catalogHandle,plan,expectedCatalog:latest,expectedTaxonomy:state.taxonomy});
    toast('Updated '+count+' catalog records · source files unchanged');
    state.tagDraftItem=null;state.tagDraft=[];
  }catch(error){toast('Bulk tags failed: '+errorText(error),true);}
  finally{
    await refreshPendingCatalog();
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
  if(state.bulkSaving||state.resourceSaving||state.backupBusy)return toast('Finish the current metadata save or backup inspection first.',true);
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
    const rawTags=await readJson(state.catalogHandle,'tags.json',null),diskTags=rawTags??[];
    assertTagSnapshotUnchanged(state.taxonomy,diskTags);
    let taxonomy=diskTags,tagIds=[];
    for(const path of tags){
      const result=ensureTagPath(taxonomy,path);
      taxonomy=result.tags;tagIds.push(result.id);
    }
    const changes=[];
    if(JSON.stringify(taxonomy)!==JSON.stringify(diskTags))
      changes.push({path:'tags.json',before:rawTags,after:taxonomy});
    let saved;
    if(current){
      const prior=Date.parse(current.updatedAt||'');
      const updatedAt=new Date(Math.max(Date.now(),Number.isFinite(prior)?prior+1:0)).toISOString();
      saved={...current,tagIds,notes,updatedAt};
      delete saved.tags;
      changes.push({path:'resources/'+saved.id+'.json',before:current,after:saved});
    }else{
      // Identity is catalog-local; ordinary source filenames are never changed.
      const plan=planResourceIdentity(latest,[...state.records.values()],item.name,state.items.map(i=>i.name));
      saved={formatVersion:1,id:plan.id,kind:item.kind,sourceId,path:[...parts,item.name].join('/'),tagIds,notes,renamed:false,updatedAt:new Date().toISOString()};
      if(plan.nextSequence>(latest.nextSequence||1))
        changes.push({path:'catalog.json',before:latest,after:{...latest,nextSequence:plan.nextSequence}});
      changes.push({path:'resources/'+saved.id+'.json',before:null,after:saved});
    }
    await assertLiveSourceEntry(root,parts,item);
    await commitCatalogEdits(changes);
    state.taxonomy=taxonomy;
    state.records.set(saved.id,saved);
    if(!current)state.catalog=await readJson(state.catalogHandle,'catalog.json');
    toast(current?'Properties saved in catalog':'Saved to catalog · original file unchanged');
    state.tagDraftItem=null;
    render();
  }catch(e){
    toast('Save failed: '+errorText(e),true);
    try{
      await refreshPendingCatalog();
      state.taxonomy=await readJson(state.catalogHandle,'tags.json',[]);
      state.catalog=await readJson(state.catalogHandle,'catalog.json');
      await refreshRecords();render();
    }catch(error){toast('Catalog refresh failed: '+errorText(error),true);}
  }finally{state.resourceSaving=false;}
}
function closePreview(){
  ++state.viewerSerial;
  $('#viewer')?.remove();
  if(state.previewUrl){URL.revokeObjectURL(state.previewUrl);state.previewUrl=null;}
  state.previewId=null;
}
async function showPreview(item){
  if(!item){item=state.items.find(i=>state.selected.has(i.id));}
  if(!item)return;
  if(item.kind==='url'){
    try{validateCatalogURLRecord(item.record);window.open(item.record.url,'_blank','noopener,noreferrer');}
    catch(error){toast('Invalid Catalog URL: '+errorText(error),true);}
    return;
  }
  if(item.catalogResult&&item.kind==='directory')return revealCatalogResult(item);
  if(item.kind==='directory')return navigate(state.sourceId,[...state.parts,item.name]);
  closePreview();
  const serial=state.viewerSerial;
  try{
    const handle=item.catalogResult?await catalogResultHandle(item):item.handle;
    if(!handle||typeof handle.getFile!=='function')throw Error('Reconnect Folder to preview');
    const file=await handle.getFile();
    const kind=itemKind(item),format=sidePreviewKind(item,file.size);
    let body='',useBlob=false;
    if(format==='shortcut'){
      const shortcut=await readPhysicalShortcut(file);
      body=shortcut.status==='ok'?
        '<section class="shortcut-viewer"><div class="shortcut-label">Internet Shortcut · ordinary .url file</div><p class="shortcut-address">'+escapeHTML(shortcut.url)+'</p><a class="shortcut-open" href="'+escapeHTML(shortcut.url)+'" target="_blank" rel="noopener noreferrer">Open link ↗</a><p class="shortcut-note">External website opens only when you select the link. Sourcebook does not fetch the page.</p></section>':
        '<section class="shortcut-viewer"><p>Invalid .url shortcut</p><small>'+escapeHTML(shortcut.reason)+'</small></section>';
    }else if(format==='text'){
      const preview=await readPhysicalTextPreview(file);
      body='<div class="viewer-text-wrap"><pre class="viewer-text">'+escapeHTML(preview.text)+'</pre>'+(preview.truncated?'<p class="viewer-truncated">Preview limited to 200 KB; original file unchanged.</p>':'')+'</div>';
    }else useBlob=true;
    if(serial!==state.viewerSerial)return;
    if(useBlob){
      const url=URL.createObjectURL(file);state.previewUrl=url;
      body='<div class="unsupported">'+fileSymbol(item)+'<p>Preview unavailable for this format</p><a download="'+escapeHTML(item.name)+'" href="'+url+'">Download file</a></div>';
      if(kind==='image')body='<img class="viewer-image" src="'+url+'" alt="'+escapeHTML(item.name)+'"/>';
      if(kind==='pdf')body='<iframe class="viewer-pdf" src="'+url+'#toolbar=0" title="PDF preview"></iframe>';
      if(kind==='video')body='<video class="viewer-video" src="'+url+'" controls autoplay></video>';
    }
    state.previewId=item.id;
    const panel=document.createElement('div');panel.id='viewer';panel.className='viewer';
    panel.innerHTML='<header><span>'+escapeHTML(cleanName(item.name))+'</span>'+button('Close','close','close-viewer')+'</header><main>'+body+'</main><footer>← → next file <span>Esc to close</span></footer>';
    document.body.append(panel);
  }catch(e){if(serial===state.viewerSerial)toast(errorText(e),true);}
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
// File input works on browsers where showOpenFilePicker is unavailable (including Android).
// Selection and drag/drop only open a review dialog: writing requires explicit confirmation.
let pendingFileImport=null,pendingFileImportCleanup=null,fileImportController=null;
function showFileImport(files,{origin='files',onVerified=null}={}){
  if(state.captureWriting)return toast('Finish the current file operation first',true);
  try{
    const plan=planOrdinaryFileImport(files);
    pendingFileImport=plan.items.map(item=>item.file);
    pendingFileImportCleanup=onVerified;
    const current=!viewsUI.inResults()&&state.sourceId;
    const clipboard=origin==='clipboard',shared=origin==='share';
    openDialog('<h2>'+(clipboard?'Review clipboard images':shared?'Review shared files':'Add ordinary files')+'</h2><p>'+(clipboard?'These image names were generated for the clipboard; review them before saving. ':shared?'These files are temporary in this device’s incoming inbox until a verified Folder copy. ':'')+'Copies selected files to a user-granted Folder. No automatic renaming, overwriting or Catalog metadata changes. Max 10 files / 512 MiB each / 1 GiB per batch. Files over 25 MiB use bounded 1 MiB chunks with byte-for-byte readback.</p>'+
      '<form id="import-files-form"><div class="capture-count">'+plan.items.length+' files · '+(plan.totalBytes/1048576).toFixed(2)+' MiB</div>'+
      plan.items.map(item=>'<div class="capture-row">'+escapeHTML(item.name)+' <small>'+item.size+' bytes</small></div>').join('')+
      '<label>Destination<select name="destination">'+(current?'<option value="current">Current Folder</option>':'')+
      '<option value="choose">Choose Folder…</option></select></label>'+
      '<p>Import starts only after confirmation. If a provider fails or you cancel, partial files may remain for inspection. Large files are byte-compared, not SHA-256 hashed.</p>'+ 
       '<p id="import-progress" role="status" aria-live="polite">Ready to copy</p>'+
      '<div class="dialog-actions"><button type="button" class="secondary" id="cancel-import">Cancel</button>'+
      '<button class="primary" type="submit">Copy files</button></div></form>');
    $('#cancel-import')?.addEventListener('click',()=>{
      if(fileImportController){fileImportController.abort();const button=$('#cancel-import');if(button){button.disabled=true;button.textContent='Cancelling…';}}
      else{pendingFileImport=null;pendingFileImportCleanup=null;$('#dialog')?.remove();}
    });
  }catch(error){pendingFileImport=null;pendingFileImportCleanup=null;toast('Add files: '+errorText(error),true);}
}
async function captureClipboardImages(){
  if(state.captureWriting)return toast('Finish the current file operation first',true);
  // read() requires a user gesture and may be denied on Android/browser providers.
  // A successful read opens ordinary-file review; it never writes automatically.
  const files=await readClipboardImages(navigator.clipboard);
  showFileImport(files,{origin:'clipboard'});
}
function importFiles(){
  const input=document.createElement('input');
  input.type='file';input.multiple=true;input.setAttribute('aria-label','Choose ordinary files');
  input.addEventListener('change',()=>{if(input.files?.length)showFileImport([...input.files]);},{once:true});
  input.click();
}
async function submitFileImportForm(form){
  if(state.captureWriting)return toast('Finish the current file operation first',true);
  if(!pendingFileImport?.length)return toast('Choose files again',true);
  if(state.scanBusy||state.bulkSaving||state.resourceSaving||state.viewSaving||state.backupBusy)
    return toast('Finish the current operation first',true);
  state.captureWriting=true;
  const controller=new AbortController();fileImportController=controller;
  const progress=form.querySelector('#import-progress'),submit=form.querySelector('button[type="submit"]');
  if(submit)submit.disabled=true;
  if(progress)progress.textContent='Waiting for destination Folder permission…';
  let here=false,lastProgress=0;
  try{
    let folder;
    if(form.elements.destination.value==='current'&&!viewsUI.inResults()&&state.sourceId){
      const root=sourceHandle();
      if(root){folder=await nested(root,state.parts);here=true;}
    }
    if(!folder){
      if(typeof window.showDirectoryPicker!=='function')
        throw Error('This browser cannot choose a writable Folder. Use the Android file manager to copy the original files; Sourcebook has not imported anything.');
      folder=await window.showDirectoryPicker({mode:'readwrite'});
    }
    if(controller.signal.aborted)throw Error('Import cancelled before writing');
    if(!await authorized(folder,'readwrite'))throw Error('Destination Folder write permission was not granted');
    if(controller.signal.aborted)throw Error('Import cancelled before writing');
    const result=await importOrdinaryFiles(folder,pendingFileImport,{signal:controller.signal,onProgress:event=>{
      const now=Date.now();if(event.phase!=='done'&&now-lastProgress<120)return;
      lastProgress=now;
      if(progress?.isConnected)progress.textContent='File '+event.fileIndex+'/'+event.fileCount+' · '+event.phase+' · '+(event.bytes/1048576).toFixed(1)+' / '+(event.size/1048576).toFixed(1)+' MiB · '+event.name;
    }});
    const cleanup=pendingFileImportCleanup;
    pendingFileImport=null;pendingFileImportCleanup=null;$('#dialog')?.remove();
    toast('Verified '+result.saved.length+' file copies; originals unchanged');
    if(cleanup){
      try{await cleanup();}catch(error){toast('File copies verified, but the temporary inbox was not cleared: '+errorText(error),true);}
    }
    if(here){invalidateScan();await navigate(state.sourceId,[...state.parts]);}
  }catch(error){
    if(progress?.isConnected)progress.textContent='Stopped: '+errorText(error);
    toast('Add files: '+errorText(error),true);
    if(here){invalidateScan();void navigate(state.sourceId,[...state.parts]).catch(()=>{});}
  }finally{
    state.captureWriting=false;fileImportController=null;
    if(submit?.isConnected)submit.disabled=false;
    const cancel=form.querySelector('#cancel-import');if(cancel){cancel.disabled=false;cancel.textContent='Cancel';}
  }
}
const paneConfigs={
  'sidebar-resizer':{selector:'.sidebar',cssVar:'--sb-sidebar-width',key:'sb-sidebar-width',min:154,max:360,defaultWidth:206,direction:1},
  'inspector-resizer':{selector:'.inspector',cssVar:'--sb-inspector-width',key:'sb-inspector-width',min:250,max:660,defaultWidth:350,direction:-1}
};
for(const config of Object.values(paneConfigs)){
  const stored=Number(localStorage.getItem(config.key));
  if(stored>=config.min&&stored<=config.max)document.documentElement.style.setProperty(config.cssVar,stored+'px');
}
document.addEventListener('pointerdown',event=>{
  const grip=event.target.closest('.pane-grip'),config=grip&&paneConfigs[grip.id];
  if(!config||event.button!==0||window.innerWidth<=760)return;
  const panel=document.querySelector(config.selector);
  if(!panel)return;
  event.preventDefault();
  const startX=event.clientX,initial=panel.getBoundingClientRect().width;
  function apply(x){
    const max=Math.min(config.max,Math.max(config.min,window.innerWidth-330));
    const next=Math.max(config.min,Math.min(max,Math.round(initial+(x-startX)*config.direction)));
    document.documentElement.style.setProperty(config.cssVar,next+'px');
    grip.setAttribute('aria-valuenow',String(next));
    return next;
  }
  function move(e){if(e.pointerId===event.pointerId)apply(e.clientX);}
  function end(e){
    if(e.pointerId!==event.pointerId)return;
    const width=apply(e.clientX);
    localStorage.setItem(config.key,String(width));
    window.removeEventListener('pointermove',move,true);
    window.removeEventListener('pointerup',end,true);
    window.removeEventListener('pointercancel',end,true);
  }
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',end,true);
});
document.addEventListener('keydown',event=>{
  const grip=event.target.closest('.pane-grip'),config=grip&&paneConfigs[grip.id];
  if(!config||!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();
  const panel=document.querySelector(config.selector);
  if(!panel)return;
  const width=event.key==='Home'?config.defaultWidth:panel.getBoundingClientRect().width+(event.key==='ArrowRight'?1:-1)*config.direction*(event.shiftKey?36:12);
  const val=Math.max(config.min,Math.min(config.max,Math.round(width)));
  document.documentElement.style.setProperty(config.cssVar,val+'px');
  localStorage.setItem(config.key,String(val));
},true);
document.addEventListener('submit',event=>{
  if(event.target.id==='capture-file-form'){event.preventDefault();void saveFileCaptureForm(event.target,event.submitter?.dataset.delivery||'folder');}
  if(event.target.id==='import-files-form'){event.preventDefault();void submitFileImportForm(event.target);}
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
document.addEventListener('change',event=>{
  if(event.target.id==='backup-inspect-file')void inspectBackupFile(event.target.files?.[0]);
  if(event.target.id==='scan-root'){
    state.scanRootId=event.target.value;state.scanFolderPath='';render();
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='scan-subfolder')state.scanFolderPath=event.target.value.trim();
  if(event.target.id==='tag-input')showTagSuggestions();
  if(event.target.id==='view-tag-search'){
    const q=event.target.value.trim().toLocaleLowerCase();
    for(const label of document.querySelectorAll('[data-view-tag-option]'))label.hidden=!!q&&!label.dataset.viewTagOption.includes(q);
  }
  if(event.target.id==='accent-color')applyAccent(event.target.value);
  if(event.target.id==='search-input'){state.search=event.target.value.slice(0,256);state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;state.tagDraftItem=null;scheduleFolderTabPreferences();renderItems();renderInspector();}
  if(event.target.id==='sort-mode'){state.sort=event.target.value;scheduleFolderTabPreferences();renderItems();}
  if(event.target.id==='group-mode'){state.groupBy=event.target.value;state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;renderItems();}
  if(event.target.id==='file-status'){
    state.fileStatus=event.target.value;
    state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;
    if(state.activeViewId)viewsUI.requery();
  }
  if(event.target.id==='file-type'){
    state.fileType=event.target.value;state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;state.tagDraftItem=null;state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;
    scheduleFolderTabPreferences();
    if(state.activeViewId)viewsUI.requery();else {renderItems();renderInspector();}
  }
  if(event.target.id==='density'){state.size=Number(event.target.value);localStorage.setItem('sb-size',state.size);scheduleFolderTabPreferences();$('#items')?.style.setProperty('--size',state.size+'px');}
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
    state.sort=mode==='name'&&state.sort==='name'?'name-desc':(!state.catalog&&mode==='location'?'name':mode);
    scheduleFolderTabPreferences();render();return;
  }
  const pageButton=event.target.closest('#items [data-page-step]');
  if(pageButton){
    const items=visibleItems();
    const next=pageWindow(items.length,Math.max(0,state.pageOffset+Number(pageButton.dataset.pageStep)*state.pageCount),state.pageCount);
    if(next.start!==state.pageOffset){
      state.pageOffset=next.start;state.keyboardFocusId=items[next.start]?.id||null;
      renderItems();$('#scroller').scrollTop=0;
      $('#items .resource[data-item]')?.focus({preventScroll:true});
    }
    return;
  }
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  switch(action){
    case 'open-folder':choosePlainFolder();break;
    case 'open-selected-tab':openSelectedFolderTab().catch(e=>toast(errorText(e),true));break;
    case 'tab-back':folderHistoryStep(-1);break;
    case 'tab-forward':folderHistoryStep(1);break;
    case 'tab-prev':void switchAdjacentFolderTab(-1);break;
    case 'tab-next':void switchAdjacentFolderTab(1);break;
    case 'create-catalog':createCatalog();break;
    case 'open-catalog':chooseCatalog().catch(e=>toast(errorText(e),true));break;
    case 'recent':recentCatalog().catch(e=>toast(errorText(e),true));break;
    case 'home':if(state.resourceSaving||state.bulkSaving||state.viewSaving)return toast('Finish catalog editing first.',true);landing();break;
    case 'add-source':addSource();break;
    case 'recover-catalog':void recoverCatalogSave();break;
    case 'export-catalog-backup':void exportCatalogBackup();break;
    case 'inspect-catalog-backup':chooseBackupForInspection();break;
    case 'inspect-catalog-conflicts':openCatalogConflictsDialog();break;
    case 'review-overlap-records':overlapUI.open();break;
    case 'refresh-overlap-review':void overlapUI.refresh();break;
    case 'export-overlap-review':overlapUI.exportReport();break;
    case 'reveal-overlap-record':void overlapUI.reveal(event.target.closest('[data-review-id]')?.dataset.reviewId).catch(error=>toast(errorText(error),true));break;
    case 'refresh-catalog-conflicts':void refreshCatalogConflictDialog();break;
    case 'export-catalog-conflict-report':exportCatalogConflictReport();break;
    case 'restore-missing-backup-records':void restoreMissingBackupRecords();break;
    case 'reconnect':reconnect();break;
    case 'refresh':viewsUI.inResults()?void refreshCatalogTagView():navigate(state.sourceId,[...state.parts]);break;
    case 'scan-folders':void runCatalogScan(state.scanRootId,state.scanFolderPath);break;
    case 'clear-source-index':void clearDeviceSourceIndex();break;
    case 'cancel-scan':cancelCatalogScan();break;
    case 'exit-catalog-tag':navigate(state.sourceId,[...state.parts]);break;
    case 'reveal-catalog-result':revealCatalogResult(state.items.find(x=>state.selected.has(x.id))).catch(e=>toast(errorText(e),true));break;
    case 'save-view':viewFilterDialog('save');break;
    case 'rename-view':viewFilterDialog('rename');break;
    case 'edit-view-tags':viewFilterDialog('tags');break;
    case 'update-view':void viewsUI.update();break;
    case 'table-columns':openTableColumnsDialog();break;
    case 'gallery':case 'list':case 'table':state.view=action;localStorage.setItem('sb-view',action);scheduleFolderTabPreferences();render();break;
    case 'inspector':state.inspector=!state.inspector;render();break;
    case 'side-open-preview':showPreview();break;
    case 'sidebar':state.sidebar=!state.sidebar;$('#sidebar')?.classList.toggle('open');break;
    case 'toggle-dotfiles':if(!state.catalog){state.showHidden=!state.showHidden;state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;state.pageCount=RESOURCE_PAGE_SIZE;state.pageOffset=0;scheduleFolderTabPreferences();render();}break;
    case 'clear-tag-filter':state.tagFilter=null;state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;render();break;
    case 'toggle-selection':state.selectionMode=!state.selectionMode;render();break;
    case 'select-shown':selectShownItems();break;
    case 'clear-selection':state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;state.selectionMode=false;render();break;
    case 'bulk-add':void bulkTags('add');break;
    case 'bulk-remove':void bulkTags('remove');break;
    case 'device-checks':deviceReadiness.open();break;
    case 'capture-file':openFileCapture();break;
    case 'capture-read-clipboard':void readCaptureClipboard().catch(error=>toast('Clipboard: '+errorText(error),true));break;
    case 'capture-clipboard-image':void captureClipboardImages().catch(error=>toast('Clipboard image: '+errorText(error),true));break;
    case 'capture-links':linkCapture.open();break;
    case 'catalog-links':void catalogLinksUI.open().catch(error=>toast('Catalog links: '+errorText(error),true));break;
    case 'show-catalog-links':showCatalogLinks();break;
    case 'edit-catalog-link':{const item=state.items.find(x=>state.selected.has(x.id));if(item?.kind==='url')catalogLinksUI.openEdit(item.record.id);break;}
    case 'incoming-shares':void shareInbox.open().catch(error=>toast('Incoming shares: '+errorText(error),true));break;
    case 'settings':openDialog('<h2>Settings</h2><p>Minimal interface. One highlight color.</p><label class="setting-row">Highlight color<input id="accent-color" aria-label="Highlight color" type="color" value="'+(localStorage.getItem('sb-accent')||'#5276bd')+'"/></label>'+(state.catalog?'<div class="backup-tools"><strong>Catalog metadata</strong><p>Local JSON backups; no source files or previews included.</p><button type="button" class="secondary" data-action="export-catalog-backup">Export backup</button> <button type="button" class="secondary" data-action="inspect-catalog-backup">Inspect / restore</button> <button type="button" class="secondary" data-action="inspect-catalog-conflicts">Inspect conflicts</button> <button type="button" class="secondary" data-action="review-overlap-records">Review overlaps</button> <button type="button" class="secondary" data-action="catalog-links">Catalog links</button></div>':'')+'<div class="backup-tools"><strong>File-backed capture</strong><p>Save URL shortcuts (.url) or pasted text (.md) in a chosen physical Folder. Staged links are temporary.</p><button type="button" class="secondary" data-action="capture-file">Save URL/text as file</button> <button type="button" class="secondary" data-action="import">Add ordinary files</button> <button type="button" class="secondary" data-action="capture-clipboard-image">Clipboard image</button> <button type="button" class="secondary" data-action="capture-links">Staging inbox</button> <button type="button" class="secondary" data-action="incoming-shares">Incoming shares</button></div><div class="backup-tools"><strong>Device acceptance</strong><p>Browser capabilities, disposable Folder permission tests and manual M0 record.</p><button type="button" class="secondary" data-action="device-checks">Device checks</button></div><div class="dialog-actions"><button type="button" class="secondary" data-action="reset-accent">Default blue</button><button type="button" class="primary" data-action="dismiss">Done</button></div>');break;
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
// Paste/drop in the file browser is an explicit create-file gesture. Text
// controls are excluded; unsupported destinations fail without a hidden write.
function pasteDropEligible(target){
  return !!target?.closest?.('#scroller')&&!target.closest('input,textarea,select,[contenteditable="true"]');
}
document.addEventListener('paste',event=>{
  if(!pasteDropEligible(event.target))return;
  const imageBlobs=collectPastedImageBlobs(event.clipboardData);
  if(imageBlobs.length){
    event.preventDefault();
    try{showFileImport(prepareClipboardImages(imageBlobs),{origin:'clipboard'});}
    catch(error){toast('Paste image: '+errorText(error),true);}
    return;
  }
  const value=event.clipboardData?.getData('text/plain');
  if(!value)return;
  event.preventDefault();
  try{
    const intake=prepareCaptureIntake({text:value,source:'paste'});
    openFileCapture({intake});
  }catch(error){toast('Paste: '+errorText(error),true);}
});
document.addEventListener('dragover',event=>{
  if(!pasteDropEligible(event.target))return;
  if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy';return;}
  if(event.dataTransfer?.types?.includes('text/plain')||event.dataTransfer?.types?.includes('text/uri-list')){
    event.preventDefault();event.dataTransfer.dropEffect='copy';
  }
});
document.addEventListener('drop',event=>{
  if(!pasteDropEligible(event.target))return;
  if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();showFileImport([...event.dataTransfer.files]);return;}
  const text=event.dataTransfer?.getData('text/plain')||'';
  const uriList=event.dataTransfer?.getData('text/uri-list')||'';
  if(!text&&!uriList)return;
  event.preventDefault();
  try{
    const intake=prepareCaptureIntake({text,uriList,source:'drop'});
    openFileCapture({intake});
  }catch(error){toast('Drop: '+errorText(error),true);}
});
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
document.addEventListener('focusin',event=>{
  const resource=event.target.closest('#items .resource[data-item]');
  if(resource){state.keyboardFocusId=resource.dataset.item;syncResourceTabStops();}
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
  // Dialogs own keyboard focus; never select the background grid.
  if($('#dialog')){if(event.key==='Escape'){event.preventDefault();$('#dialog')?.remove();}return;}
  if(!state.catalog&&event.altKey&&event.shiftKey&&(event.key==='ArrowLeft'||event.key==='ArrowRight')&&!state.previewId&&!event.target.closest('input,textarea,select,[contenteditable="true"]')){
    event.preventDefault();void switchAdjacentFolderTab(event.key==='ArrowLeft'?-1:1);return;
  }
  if(!state.catalog&&event.altKey&&!event.shiftKey&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();folderHistoryStep(event.key==='ArrowLeft'?-1:1);return;}
  if(event.key==='Escape'){if(state.previewId)closePreview();else if($('#folder-context'))$('#folder-context')?.remove();else if(state.selected.size&&!event.target.closest('input,textarea,select,[contenteditable="true"]')){state.selected.clear();state.lastSelected=null;state.selectionAnchor=null;state.selectionMode=false;render();}return;}
  if(state.previewId){if(event.key==='ArrowRight')previewStep(1);if(event.key==='ArrowLeft')previewStep(-1);return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#search-input')?.focus();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'&&!event.target.closest('input,textarea,select,[contenteditable="true"]')&&state.sourceId){event.preventDefault();selectShownItems();return;}
  if(!state.catalog&&event.ctrlKey&&event.key==='Enter'){const selected=state.items.find(item=>item.id===state.lastSelected);if(selected?.kind==='directory'){event.preventDefault();openSelectedFolderTab().catch(e=>toast(errorText(e),true));}return;}
  // Preserve native keyboard handling for toolbar controls and table-sort buttons.
  if(event.target.matches('input,textarea,select')||event.target.closest('button:not(.resource)')||event.altKey)return;
  const focusedResource=event.target.closest('#items .resource[data-item]');
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)&&focusedResource){
    // Ctrl/Cmd+Shift extends a range; plain Ctrl/Cmd+arrows stay browser-owned.
    if((event.ctrlKey||event.metaKey)&&!event.shiftKey)return;
    const nodes=[...document.querySelectorAll('#items .resource[data-item]')];
    if(!nodes.length)return;
    event.preventDefault();
    const columns=state.view==='list'||state.view==='table'?1:nodes.filter(node=>node.offsetTop===nodes[0].offsetTop).length;
    const all=visibleItems();
    const nextId=nextResourceFocusId(all.map(item=>item.id),focusedResource.dataset.item,event.key,columns);
    const index=all.findIndex(item=>item.id===nextId);
    if(index<0)return;
    const page=pageForIndex(all.length,index,state.pageCount);
    if(page.start!==state.pageOffset){state.pageOffset=page.start;state.keyboardFocusId=nextId;renderItems();$('#scroller').scrollTop=0;}
    const next=[...document.querySelectorAll('#items .resource[data-item]')].find(node=>node.dataset.item===nextId);
    const item=all[index];
    if(item&&next&&select(item,event)){next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest'});}
    return;
  }
  if(event.ctrlKey||event.metaKey)return;
  if(event.key==='Enter'&&focusedResource){
    const item=state.items.find(entry=>entry.id===focusedResource.dataset.item);
    if(item){event.preventDefault();select(item,{shiftKey:false,ctrlKey:false,metaKey:false});showPreview(item);}
    return;
  }
  if(event.key===' '&&focusedResource){
    event.preventDefault();
    const item=state.items.find(entry=>entry.id===focusedResource.dataset.item);
    if(item)select(item,{shiftKey:false,ctrlKey:true,metaKey:false});
    return;
  }
  if(event.key==='Backspace'&&state.parts.length){event.preventDefault();navigate(state.sourceId,state.parts.slice(0,-1));}
});
async function boot(){
  if(typeof window.showDirectoryPicker!=='function'){landing();toast('Folder browsing unavailable here; review shares or capture files through explicit Download/Send fallbacks.',true);return;}
  try{
    if(await getLocal('last-mode')==='folder'){
      const session=loadFolderTabs(await getLocal('folder-tabs-v1'));
      if(!session.tabs.length){
        // Upgrade the previous single-root local preference when present.
        const old=await getLocal('last-folder');
        if(old?.handle&&typeof old.handle.queryPermission==='function'&&await old.handle.queryPermission({mode:'read'})==='granted')return await setPlainFolder(old.handle);
      }
      if(session.tabs.length){
        state.catalog=null;state.catalogHandle=null;state.pendingTransaction=null;state.records.clear();state.taxonomy=[];state.tagFilter=null;
        state.sources=session.tabs;state.handles=new Map(session.tabs.map(tab=>[tab.id,tab.handle]));
        state.sourceId=session.activeId;
        const active=activeFolderTab();
        state.parts=[...active.parts];applyFolderTabPreferences(active);
        if(await active.handle.queryPermission({mode:'read'})==='granted')return await navigate(active.id,[...active.parts],null,{preserveSearch:true});
        state.handles.delete(active.id);render();return;
      }
      landing();return;
    }
    const r=await getLocal('recent');
    if(r?.handle&&typeof r.handle.queryPermission==='function'&&await r.handle.queryPermission({mode:'read'})==='granted')return await openDirectory(r.handle);
  }catch(e){console.warn('Restore needs permission',e);}
  landing();
}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{type:'module'}).catch(console.warn));
boot().then(async()=>{
  const url=new URL(location.href);
  if(url.searchParams.get('shared')!=='1')return;
  url.searchParams.delete('shared');
  history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  await shareInbox.open();
}).catch(e=>{console.error(e);landing();toast(errorText(e),true);});
