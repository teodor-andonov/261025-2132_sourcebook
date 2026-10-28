// Device readiness is local and opt-in. API presence never counts as M0 acceptance.
import {getLocal,setLocal,removeLocal} from './storage.mjs';
import {normalizeWriteProbe,normalizeReopenProbe,probeDisposableWriteFolder,rememberDisposableReadFolder,recheckDisposableReadFolder,forgetDisposableReadFolder} from './m0-feasibility.mjs';
export const M0_CASES=[
  ['M0-01','Standalone PWA installation','Record OS, Chrome and published commit.'],
  ['M0-02','Real Folder browsing and Tabs','Mixed files, nested paths, previews and unchanged originals.'],
  ['M0-03','Portable Catalog persistence','Nested Tags, Notes and JSON after reopening.'],
  ['M0-04','Restart and permission regrant','Restore Tabs/Catalog; revoke and reconnect.'],
  ['M0-05','Syncthing cross-device roundtrip','Verify Tags and Views on Windows and Android.'],
  ['M0-06','Offline shell and update','Check offline load; never reload during a Catalog write.'],
  ['M0-07','500-file browsing','Record responsiveness, previews and crashes.'],
  ['M0-08','Android capture fallbacks','Share URL/text, clipboard and file-picker limitations.']
];
export const M0_STORAGE_KEY='sourcebook-m0-device-readiness-v1';
export const M0_STATUSES=['Not tested','Pass','Fail','Blocked'];
const safe=(value,max=400)=>String(value??'').slice(0,max);
const evidence=(value)=>{
  const raw=safe(value,300).trim();
  if(!raw)return '';
  try{const url=new URL(raw);return url.protocol==='https:'?url.href.slice(0,300):'';}catch{return '';}
};
export function normalizeM0Record(input,now=new Date().toISOString()){
  const value=input&&typeof input==='object'?input:{};
  const results={};
  for(const [id] of M0_CASES){
    const item=value.results?.[id]||{};
    results[id]={
      status:M0_STATUSES.includes(item.status)?item.status:'Not tested',
      note:safe(item.note),
      evidence:evidence(item.evidence)
    };
  }
  const probe=value.probe||{};
  return {
    schema:1,
    createdAt:typeof value.createdAt==='string'&&!Number.isNaN(Date.parse(value.createdAt))?value.createdAt:now,
    updatedAt:now,
    releaseCommit:/^[a-f0-9]{7,40}$/i.test(value.releaseCommit||'')?value.releaseCommit:'',
    results,
    writeProbe:normalizeWriteProbe(value.writeProbe),
    reopenProbe:normalizeReopenProbe(value.reopenProbe),
    probe:{
      status:['not-run','ok','unsupported','cancelled','denied','error'].includes(probe.status)?probe.status:'not-run',
      permission:['unknown','granted','prompt','denied','unavailable'].includes(probe.permission)?probe.permission:'unknown',
      entriesSampled:Number.isInteger(probe.entriesSampled)?Math.max(0,Math.min(10,probe.entriesSampled)):0,
      fileReadable:probe.fileReadable===true,
      identityCheck:['unknown','same','different','unavailable'].includes(probe.identityCheck)?probe.identityCheck:'unknown'
    }
  };
}
export function inspectDeviceCapabilities(env=globalThis){
  const win=env.window||env,nav=env.navigator||win.navigator||{},ua=String(nav.userAgent||'');
  const platform=/android/i.test(ua)||/android/i.test(nav.userAgentData?.platform||'')?'Android':
    /windows/i.test(ua)||/windows/i.test(nav.userAgentData?.platform||'')?'Windows':'Other / unknown';
  const chromeVersion=ua.match(/(?:Chrome|CriOS)\/([0-9.]+)/)?.[1]||'Unknown';
  let standalone=false;
  try{standalone=!!win.matchMedia?.('(display-mode: standalone)').matches||nav.standalone===true;}catch{}
  const features=[
    ['Secure context',win.isSecureContext===true],
    ['Directory picker',typeof win.showDirectoryPicker==='function'],
    ['Open-file picker',typeof win.showOpenFilePicker==='function'],
    ['IndexedDB',!!win.indexedDB],
    ['Service worker',!!nav.serviceWorker],
    ['Active service worker',!!nav.serviceWorker?.controller],
    ['Clipboard readText',typeof nav.clipboard?.readText==='function'],
    ['Web Share',typeof nav.share==='function'],
    ['Persistent storage API',typeof nav.storage?.persist==='function'],
    ['Standalone display',standalone]
  ].map(([label,available])=>({label,available}));
  return {platform,chromeVersion,standalone,features};
}
const blankProbe=()=>({status:'not-run',permission:'unknown',entriesSampled:0,fileReadable:false,identityCheck:'unknown'});
export async function probeReadOnlyFolder(picker){
  if(typeof picker!=='function')return {...blankProbe(),status:'unsupported'};
  let handle;
  try{handle=await picker({mode:'read'});}
  catch(error){return {...blankProbe(),status:error?.name==='AbortError'?'cancelled':error?.name==='NotAllowedError'?'denied':'error'};}
  if(!handle||typeof handle.values!=='function')return {...blankProbe(),status:'unsupported'};
  let permission='unavailable';
  try{
    if(typeof handle.queryPermission==='function'){
      const value=await handle.queryPermission({mode:'read'});
      permission=['granted','prompt','denied'].includes(value)?value:'unknown';
    }
  }catch{permission='unknown';}
  let identityCheck='unavailable';
  try{if(typeof handle.isSameEntry==='function')identityCheck=await handle.isSameEntry(handle)?'same':'different';}
  catch{identityCheck='unknown';}
  if(permission==='denied')return {status:'denied',permission,entriesSampled:0,fileReadable:false,identityCheck};
  let entriesSampled=0,fileReadable=false;
  try{
    for await(const entry of handle.values()){
      if(entriesSampled>=10)break;
      entriesSampled++;
      if(!fileReadable&&entry?.kind==='file'&&typeof entry.getFile==='function'){
        await entry.getFile(); // File metadata only. Never read bytes or names.
        fileReadable=true;
      }
    }
  }catch{return {status:'error',permission,entriesSampled,fileReadable,identityCheck};}
  return {status:'ok',permission,entriesSampled,fileReadable,identityCheck};
}
export function exportM0Report(record,capabilities,now=new Date().toISOString()){
  const value=normalizeM0Record(record,now);
  return {
    schema:'sourcebook-m0-device-report-v1',exportedAt:now,
    environment:{platform:capabilities.platform,chromeVersion:capabilities.chromeVersion,standalone:capabilities.standalone},
    capabilities:capabilities.features,releaseCommit:value.releaseCommit,
    results:value.results,readOnlyFolderProbe:value.probe,
    disposableWriteProbe:value.writeProbe,savedReadHandleProbe:value.reopenProbe,
    caveat:'API presence and the read-only probe are not physical-device acceptance. All Pass/Fail/Blocked outcomes are manually entered.'
  };
}
export function createDeviceReadinessUI({openDialog,escapeHTML,toast,env=globalThis}){
  const doc=env.document,store=env.localStorage;
  const load=()=>{try{return JSON.parse(store?.getItem(M0_STORAGE_KEY)||'null');}catch{return null;}};
  let record=normalizeM0Record(load());
  const save=()=>{
    record=normalizeM0Record(record);
    try{store?.setItem(M0_STORAGE_KEY,JSON.stringify(record));}
    catch{toast('Device checklist could not be stored in this browser.',true);}
  };
  let lastLeftoverName='';
  const writeSummary=()=>{
    const p=record.writeProbe;
    return p.status==='not-run'?'Not run. Explicit consent and a disposable Folder are required.':
      'Write probe '+p.status+' · permission '+p.permission+' · exact readback '+(p.writeVerified?'verified':'not verified')+
      ' · removal '+(p.cleanupVerified?'verified':'not verified')+(p.cleanupRequired?' · MANUAL CLEANUP REQUIRED':'')+'.';
  };
  const reopenSummary=()=>{
    const p=record.reopenProbe;
    return p.status==='not-run'?'Not run. Save a disposable Folder grant, restart Sourcebook, then recheck.':
      'Saved handle '+p.status+' · read permission '+p.permission+' · enumeration '+(p.enumerated?'worked':'not verified')+'.';
  };
  const probeSummary=()=>{
    const p=record.probe;
    return p.status==='not-run'?'Not run. Select a disposable Folder for this read-only probe.':
      'Probe '+p.status+' · read permission '+p.permission+' · '+p.entriesSampled+' entries · file metadata '+(p.fileReadable?'read':'not read')+
      ' · self-identity '+p.identityCheck+'. This read-only probe does not test persistence or writes.';
  };
  const open=()=>{
    record=normalizeM0Record(load()||record);
    const caps=inspectDeviceCapabilities(env);
    const rows=M0_CASES.map(([id,title,hint])=>{
      const item=record.results[id];
      return '<section class="m0-row" data-m0-id="'+id+'"><div class="m0-row-head"><strong>'+id+' · '+escapeHTML(title)+'</strong>'+
        '<select data-m0-field="status" aria-label="'+id+' result">'+M0_STATUSES.map(status=>'<option value="'+status+'" '+(item.status===status?'selected':'')+'>'+status+'</option>').join('')+'</select></div>'+
        '<small>'+escapeHTML(hint)+'</small><details><summary>Notes / evidence</summary>'+
        '<textarea data-m0-field="note" maxlength="400" rows="2" aria-label="'+id+' notes" placeholder="Actual result or reproducible failure">'+escapeHTML(item.note)+'</textarea>'+
        '<input type="url" data-m0-field="evidence" aria-label="'+id+' evidence" placeholder="HTTPS issue / test log link (optional)" value="'+escapeHTML(item.evidence)+'"></details></section>';
    }).join('');
    openDialog('<div class="m0-readiness"><h2>Device checks · M0</h2><p>Device acceptance remains open. API detection and the read-only probe never mark tests passed. Your notes stay in this browser until you export them.</p>'+
      '<div class="m0-capabilities"><strong>'+escapeHTML(caps.platform)+' · Chrome '+escapeHTML(caps.chromeVersion)+' · '+(caps.standalone?'Standalone':'Browser tab / unknown')+'</strong>'+
      '<div class="m0-cap-grid">'+caps.features.map(f=>'<span>'+escapeHTML(f.label)+'</span><span>'+(f.available?'API present':'Unavailable / inactive')+'</span>').join('')+'</div></div>'+
      '<div class="m0-probe"><button class="secondary" type="button" data-m0-probe '+(typeof env.showDirectoryPicker==='function'?'':'disabled')+'>Probe a Folder (read-only)</button><p role="status" data-m0-probe-result>'+escapeHTML(probeSummary())+'</p></div>'+
      '<div class="m0-probe"><strong>Disposable Folder feasibility</strong><p>Use an empty throwaway Folder, never a project/source or .sb Catalog. Write test creates one unpredictable probe file, verifies its contents and removes it. A failure may leave that synthetic file for manual cleanup.</p>'+
      '<div class="m0-probe-actions"><button class="secondary" type="button" data-m0-write '+(typeof env.showDirectoryPicker==='function'?'':'disabled')+'>Test write / read / remove</button><button class="secondary" type="button" data-m0-remember '+(typeof env.showDirectoryPicker==='function'?'':'disabled')+'>Remember read handle</button><button class="secondary" type="button" data-m0-recheck>Recheck after restart</button><button class="secondary" type="button" data-m0-forget>Forget handle</button></div>'+
      '<p role="status" data-m0-write-result>'+escapeHTML(writeSummary())+'</p><p role="status" data-m0-reopen-result>'+escapeHTML(reopenSummary())+'</p></div>'+
      '<label class="m0-commit">Published commit (optional, verify in Actions)<input data-m0-commit maxlength="40" value="'+escapeHTML(record.releaseCommit)+'" placeholder="7–40 hex characters"></label>'+
      '<div class="m0-checks">'+rows+'</div><p class="m0-warning">Do not enter private paths, filenames, file contents, device IDs or secrets in notes.</p>'+
      '<div class="dialog-actions"><button class="secondary" type="button" data-m0-reset>Clear local results</button><button class="secondary" type="button" data-m0-export>Export JSON</button><button class="primary" type="button" data-action="dismiss">Done</button></div></div>');
    const root=doc.querySelector('#dialog .m0-readiness');
    if(!root)return;
    const update=event=>{
      const field=event.target?.dataset?.m0Field;
      if(field){
        const id=event.target.closest('[data-m0-id]')?.dataset.m0Id;
        if(!M0_CASES.some(([caseId])=>caseId===id))return;
        record.results[id][field]=event.target.value;
        save();
      }else if(event.target?.hasAttribute('data-m0-commit')){
        record.releaseCommit=event.target.value.trim();
        save();
      }
    };
    root.addEventListener('input',update);
    root.addEventListener('change',update);
    root.querySelector('[data-m0-probe]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      button.disabled=true;
      try{
        record.probe=await probeReadOnlyFolder(typeof env.showDirectoryPicker==='function'?env.showDirectoryPicker.bind(env):null);
        save();
        root.querySelector('[data-m0-probe-result]').textContent=probeSummary();
      }finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-write]')?.addEventListener('click',async event=>{
      if(typeof env.confirm!=='function'||!env.confirm('Use ONLY an empty disposable Folder. Sourcebook will create one random .sourcebook-m0-probe file, verify it and try to remove it. If the operation fails, you may need to remove that file manually. Continue?'))return;
      const button=event.currentTarget;button.disabled=true;
      try{
        const result=await probeDisposableWriteFolder(typeof env.showDirectoryPicker==='function'?env.showDirectoryPicker.bind(env):null,{confirmed:true});
        lastLeftoverName=result.leftoverName||'';
        record.writeProbe=normalizeWriteProbe(result);save();
        root.querySelector('[data-m0-write-result]').textContent=writeSummary()+(lastLeftoverName?' Inspect and manually remove '+lastLeftoverName+' from the disposable Folder after verifying it is the probe file.':'');
      }catch{toast('Disposable write probe failed. Inspect the selected Folder for a synthetic probe file.',true);}
      finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-remember]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        record.reopenProbe=normalizeReopenProbe(await rememberDisposableReadFolder(typeof env.showDirectoryPicker==='function'?env.showDirectoryPicker.bind(env):null,setLocal));
        save();root.querySelector('[data-m0-reopen-result]').textContent=reopenSummary();
      }catch{toast('Could not remember the disposable Folder handle.',true);}
      finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-recheck]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        record.reopenProbe=normalizeReopenProbe(await recheckDisposableReadFolder(getLocal));
        save();root.querySelector('[data-m0-reopen-result]').textContent=reopenSummary();
      }catch{toast('Saved handle recheck failed.',true);}
      finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-forget]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        await forgetDisposableReadFolder(removeLocal);
        record.reopenProbe=normalizeReopenProbe(null);save();
        root.querySelector('[data-m0-reopen-result]').textContent=reopenSummary();
      }catch{toast('Could not remove the saved disposable Folder handle.',true);}
      finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-export]').addEventListener('click',()=>{
      const report=exportM0Report(record,caps);
      const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));
      const link=doc.createElement('a');
      link.href=url;
      link.download='sourcebook-m0-'+new Date().toISOString().slice(0,10)+'.json';
      doc.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      toast('Device report exported locally. No data uploaded.');
    });
    root.querySelector('[data-m0-reset]').addEventListener('click',()=>{
      if(typeof env.confirm==='function'&&!env.confirm('Clear the M0 checklist and probe result on this device?'))return;
      record=normalizeM0Record(null);
      lastLeftoverName='';
      save();open();
    });
  };
  return {open};
}
