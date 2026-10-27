// Compact, explicit read-only review of competing Catalog metadata under
// live-verified overlapping Folders. No source or Catalog writes are exposed.
import {createCatalogBackup} from './catalog-backup.mjs';
import {inspectIndexedRootOverlaps} from './source-overlap.mjs';
import {buildOverlapRecordReview,verifyOverlapRecordBindings} from './overlap-review.mjs';

export function createOverlapReviewUI({state,openDialog,escapeHTML,icon,toast,errorText,revealCatalogResult}){
  const $=selector=>document.querySelector(selector);
  function open(){
    if(!state.catalog)return toast('Open a Catalog first.',true);
    if(!state.sourceIndex||state.sourceIndex.roots.length<2)
      return toast('Index at least two registered Catalog Folders in a saved View before reviewing overlaps.',true);
    state.overlapReport=null;
    openDialog('<h2>Review overlapping records</h2><p>Compare metadata under identity-verified overlapping Folders. Individual files are rechecked read-only; no records are merged or deleted.</p><div id="overlap-review-results" class="backup-results" aria-live="polite">Checking Folder identities…</div><div class="dialog-actions"><button class="secondary" data-action="refresh-overlap-review">Recheck</button><button class="secondary" data-action="export-overlap-review">Export report</button><button class="primary" data-action="dismiss">Done</button></div>');
    void refresh();
  }
  async function refresh(){
    const target=$('#overlap-review-results');
    if(!target||!state.catalog||state.backupBusy||state.resourceSaving||state.bulkSaving||state.viewSaving||state.scanBusy)return;
    const handle=state.catalogHandle,index=state.sourceIndex,catalogId=state.catalog.id,generation=state.scanGeneration;
    if(!index||index.roots.length<2){target.textContent='Index at least two Catalog Folders first.';return;}
    state.backupBusy=true;state.overlapReport=null;
    target.textContent='Verifying Catalog JSON, Folder relationships and individual source entries…';
    try{
      if(state.pendingTransaction)throw Error('Resolve the pending Catalog transaction before reviewing metadata');
      const [backup,proof]=await Promise.all([
        createCatalogBackup(handle),inspectIndexedRootOverlaps(index,new Map(state.handles))
      ]);
      const stillCurrent=()=>state.catalogHandle===handle&&state.catalog?.id===catalogId&&
        state.sourceIndex===index&&state.scanGeneration===generation;
      if(!stillCurrent())throw Error('Catalog or Folder index changed during overlap inspection');
      const files=new Map(backup.files.map(file=>[file.path,file.data]));
      if(files.has('.sourcebook-pending.json'))throw Error('A Catalog recovery journal appeared during inspection; resolve it before reviewing overlaps');
      const sources=JSON.parse(files.get('sources.json')||'[]');
      const taxonomy=JSON.parse(files.get('tags.json')||'[]');
      const records=backup.files.filter(file=>/^resources\/[a-z0-9_-]{1,100}\.json$/.test(file.path))
        .map(file=>JSON.parse(file.data));
      const review=buildOverlapRecordReview(records,sources,taxonomy,proof.overlaps);
      const checked=await verifyOverlapRecordBindings(review,new Map(state.handles));
      if(!stillCurrent())throw Error('Catalog or Folder index changed during overlap inspection');
      state.overlapReport={...checked,catalogId,inspectedAt:new Date().toISOString(),
        verifiedRootRelations:proof.overlaps,rootProblems:proof.problems,
        notice:'Read-only comparison. Only same-entry proves live file handles matched. No automatic reconciliation.'};
      const summary=checked.counts;
      target.innerHTML='<p>'+summary.groups+' overlapping metadata location(s) · '+summary.differing+' with differing fields · '+summary.verified+' same-entry verified · '+summary.different+' different-entry · '+summary.unresolved+' unresolved.</p>'+
        (proof.problems.length?'<p>Unresolved Folder checks: '+escapeHTML(proof.problems.join('; '))+'</p>':'')+
        (checked.groups.length?'<div class="overlap-review-list">'+checked.groups.slice(0,100).map(group=>
          '<details class="overlap-review-group"><summary>'+escapeHTML(group.location)+' · '+escapeHTML(group.binding)+' · '+escapeHTML(group.flags.join(', ')||'Matching metadata')+'</summary>'+
          group.records.map(record=>'<div class="overlap-review-record"><strong>'+escapeHTML(record.id)+' · '+escapeHTML(record.sourceName)+'</strong><code>'+escapeHTML(record.path)+'</code>'+
            '<div>'+escapeHTML(record.kind)+' · '+escapeHTML(record.entryStatus)+' · '+escapeHTML(record.tagPaths.map(tag=>'#'+tag).join(', ')||'No tags')+'</div>'+
            (record.missingTagIds.length?'<div>Unknown Tag IDs: '+escapeHTML(record.missingTagIds.join(', '))+'</div>':'')+
            (record.notes?'<div>Notes: '+escapeHTML(record.notes.slice(0,300))+(record.notes.length>300?'…':'')+'</div>':'')+
            '<button class="secondary" data-action="reveal-overlap-record" data-review-id="'+escapeHTML(record.id)+'">'+icon('folder',14)+' Show in folder</button></div>').join('')+
          '</details>').join('')+'</div>'+
          (checked.groups.length>100?'<p>Showing 100 of '+checked.groups.length+' groups. Export for the full report.</p>':'')+
          '<p>Same-entry verifies current handles only; metadata still needs manual review. Export includes notes and other Catalog fields.</p>':
          '<p>No competing Catalog records found under verified Folder relationships. Disconnected or ambiguous roots are not inferred from names.</p>');
    }catch(error){
      state.overlapReport=null;
      target.textContent='Overlap review unavailable: '+errorText(error)+'. No Catalog or source files were changed.';
    }finally{state.backupBusy=false;}
  }
  function exportReport(){
    const report=state.overlapReport;
    if(!report||report.catalogId!==state.catalog?.id)return toast('Recheck overlapping records before exporting.',true);
    const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='sourcebook-'+new Date().toISOString().slice(0,10)+'-overlap-review.json';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    toast('Read-only overlap report exported; includes Catalog notes.');
  }
  async function reveal(id){
    const report=state.overlapReport;
    if(!report||report.catalogId!==state.catalog?.id)return toast('Recheck overlaps before revealing a record.',true);
    const record=report.groups.flatMap(group=>group.records).find(item=>item.id===id);
    if(!record)return toast('Record is not in the current overlap report.',true);
    $('#dialog')?.remove();
    const parts=record.path.split('/'),name=parts.pop();
    await revealCatalogResult({catalogResult:true,sourceId:record.sourceId,parts,name,kind:record.kind});
  }
  return {open,refresh,exportReport,reveal};
}
