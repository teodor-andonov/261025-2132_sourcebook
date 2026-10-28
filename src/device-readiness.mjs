// Device readiness is local and opt-in. API presence never counts as M0 acceptance.
import {getLocal,setLocal,removeLocal} from './storage.mjs';
import {parseM0EvidenceReport,compareM0EvidenceReports,M0_REPORT_LIMIT} from './m0-evidence-review.mjs';
import {normalizeShareStorageProbe,inspectShareStorage,requestShareStoragePersistence} from './share-storage.mjs';
import {normalizeWriteProbe,normalizeReopenProbe,probeDisposableWriteFolder,rememberDisposableReadFolder,recheckDisposableReadFolder,forgetDisposableReadFolder} from './m0-feasibility.mjs';
import {normalizePortableProbe,normalizeOfflineProbe,createM0PortableCatalogFixture,verifyM0PortableCatalogFixture,inspectM0OfflineShell} from './m0-acceptance.mjs';
import {normalizeCaptureProbe,createM0CaptureFixture,verifyM0CaptureFixture} from './m0-capture-acceptance.mjs';
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
    shareStorageProbe:normalizeShareStorageProbe(value.shareStorageProbe),
    portableCreateProbe:normalizePortableProbe(value.portableCreateProbe),
    portableVerifyProbe:normalizePortableProbe(value.portableVerifyProbe),
    captureCreateProbe:normalizeCaptureProbe(value.captureCreateProbe),
    captureVerifyProbe:normalizeCaptureProbe(value.captureVerifyProbe),
    offlineProbe:normalizeOfflineProbe(value.offlineProbe),
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
    shareInboxStorageProbe:value.shareStorageProbe,
    portableCatalogCreateProbe:value.portableCreateProbe,portableCatalogVerifyProbe:value.portableVerifyProbe,
    physicalCaptureCreateProbe:value.captureCreateProbe,physicalCaptureVerifyProbe:value.captureVerifyProbe,
    offlineCacheProbe:value.offlineProbe,
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
  let lastFixtureName='';
  let lastCaptureFixtureName='';
  const portableSummary=()=>{
    const created=record.portableCreateProbe,verified=record.portableVerifyProbe;
    return 'Create '+created.status+' · transaction '+(created.transactionVerified?'verified':'not verified')+
      ' · local readback '+(created.portableVerified?'verified':'not verified')+
      ' · re-open '+verified.status+(verified.fixtureProof?' · fixture proof '+verified.fixtureProof.slice(0,12)+'…':'')+(created.cleanupRequired?' · PARTIAL FIXTURE: MANUAL REVIEW REQUIRED':'')+
      '. No device acceptance is automatic.';
  };
  const captureSummary=()=>{
    const created=record.captureCreateProbe,verified=record.captureVerifyProbe;
    return 'Create '+created.status+' · URL '+(created.urlVerified?'verified':'not verified')+
      ' · Markdown '+(created.textVerified?'verified':'not verified')+
      ' · reopen '+verified.status+(verified.fixtureProof?' · fixture proof '+verified.fixtureProof.slice(0,12)+'…':'')+
      (created.cleanupRequired?' · PARTIAL FIXTURE: MANUAL REVIEW REQUIRED':'')+
      '. Browser Download is NOT a verified Folder write. Device acceptance remains manual.';
  };
  const offlineSummary=()=>{
    const p=record.offlineProbe;
    return 'Cache '+p.status+' · controller '+(p.controllerActive?'active':'inactive')+
      ' · shell '+(p.shellCached?'present':'not verified')+' · module '+(p.appModuleCached?'present':'not verified')+
      '. This does not prove offline navigation.';
  };
  const storageSummary=()=>{
    const p=record.shareStorageProbe;
    return 'Storage '+p.status+' · persisted '+p.persisted+' · estimated free '+p.available+
      ' · origin pressure '+p.pressure+'. Estimates cover all apps on this origin; not a guarantee against eviction or Android Folder write support.';
  };
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
      '<div class="m0-probe"><strong>Portable .sb roundtrip fixture</strong><p>Choose an EMPTY disposable parent. Sourcebook creates a new UUID-named .sb fixture with a REAL source-files/*.url shortcut, a file-bound Catalog record, nested stable-ID Tags and a saved View, using its recovery journal. This synthetic in-Catalog source folder is for testing only; real external Folder grants still need separate device tests. It leaves the fixture in place for restart or Syncthing testing. Never select real project data; no automatic deletion.</p>'+
      '<div class="m0-probe-actions"><button class="secondary" type="button" data-m0-portable-create '+(typeof env.showDirectoryPicker==='function'?'':'disabled')+'>Create disposable .sb</button><button class="secondary" type="button" data-m0-portable-verify '+(typeof env.showDirectoryPicker==='function'?'':'disabled')+'>Verify .sb (read-only)</button></div>'+
      '<p role="status" data-m0-portable-result>'+escapeHTML(portableSummary())+'</p></div>'+
      '<div class="m0-probe"><strong>Physical URL / Markdown provider gate</strong><p>Choose an EMPTY disposable parent Folder. Sourcebook creates a new Sourcebook-M0-Capture-* Folder containing two REAL ordinary files (.url and .md), verifies exact contents, and LEAVES them for restart or Syncthing checks. Never use project/source data. On another device, choose the fixture Folder itself for read-only verification. If the directory picker is unavailable, record Blocked; a browser Download is not equivalent.</p>'+
      '<div class="m0-probe-actions"><button class="secondary" type="button" data-m0-capture-create '+(typeof env.showDirectoryPicker==='function'?'':'disabled')+'>Create .url + .md fixture</button><button class="secondary" type="button" data-m0-capture-verify '+(typeof env.showDirectoryPicker==='function'?'':'disabled')+'>Verify files (read-only)</button></div>'+
      '<p role="status" data-m0-capture-result>'+escapeHTML(captureSummary())+'</p></div>'+
      '<div class="m0-probe"><strong>Temporary Android share storage</strong><p>Inspect origin-wide quota pressure and whether Chrome reports persistent storage. Request persistence only by clicking; permission may be refused, and neither status proves that staged shares survive eviction or that a physical Folder is writable.</p>'+
      '<div class="m0-probe-actions"><button class="secondary" type="button" data-m0-storage>Inspect storage</button><button class="secondary" type="button" data-m0-persist>Request persistence</button></div>'+
      '<p role="status" data-m0-storage-result>'+escapeHTML(storageSummary())+'</p></div>'+
      '<div class="m0-probe"><strong>Offline shell diagnostic</strong><p>Inspect this app\'s Cache Storage and service-worker controller without going offline or changing caches. A cached shell does not establish offline acceptance.</p>'+
      '<button class="secondary" type="button" data-m0-offline>Inspect cached shell</button><p role="status" data-m0-offline-result>'+escapeHTML(offlineSummary())+'</p></div>'+
      '<label class="m0-commit">Published commit (optional, verify in Actions)<input data-m0-commit maxlength="40" value="'+escapeHTML(record.releaseCommit)+'" placeholder="7–40 hex characters"></label>'+
      '<div class="m0-checks">'+rows+'</div><p class="m0-warning">Do not enter private paths, filenames, file contents, device IDs or secrets in notes.</p>'+
      '<div class="m0-probe"><strong>Compare Windows + Android evidence</strong><p>Export a report on EACH real device after manually testing M0. Load both JSON files here to compare results, release commits and hashed disposable fixture identity. Imported files stay in memory only. A match never automatically accepts M0.</p>'+
      '<div class="m0-probe-actions"><label>Windows JSON<input type="file" accept=".json,application/json" data-m0-report="Windows"></label><label>Android JSON<input type="file" accept=".json,application/json" data-m0-report="Android"></label></div>'+
      '<div role="status" data-m0-comparison>Choose both exported reports. No data is uploaded.</div></div>'+
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
    // Imported reports are never persisted to localStorage, Catalogs or network.
    const imported={Windows:null,Android:null};
    const comparison=root.querySelector('[data-m0-comparison]');
    for(const input of root.querySelectorAll('[data-m0-report]')){
      input.addEventListener('change',async()=>{
        const platform=input.dataset.m0Report,file=input.files?.[0];
        imported[platform]=null;
        if(!file){comparison.textContent='Select both reports to compare.';return;}
        try{
          if(file.size>M0_REPORT_LIMIT)throw Error('Report exceeds 128 KiB.');
          const parsed=parseM0EvidenceReport(await file.text());
          if(parsed.platform!==platform)throw Error('Selected report identifies '+parsed.platform+', not '+platform+'.');
          imported[platform]=parsed;
          if(!imported.Windows||!imported.Android){
            comparison.textContent=platform+' report loaded. Select the other device report.';
            return;
          }
          const result=compareM0EvidenceReports(imported.Windows,imported.Android);
          const rows=result.rows.map(row=>'<tr><th>'+row.id+'</th><td>'+escapeHTML(row.windows)+(row.windowsEvidence?' · evidence':'')+'</td><td>'+escapeHTML(row.android)+(row.androidEvidence?' · evidence':'')+'</td></tr>').join('');
          comparison.innerHTML='<p><strong>Same published commit:</strong> '+(result.sameCommit?'Yes':'Not verified')+
            ' · <strong>Same verified .sb fixture:</strong> '+(result.sameFixture?'Hash matches':'Not verified')+
            ' · <strong>Same .url/.md fixture:</strong> '+(result.sameCaptureFixture?'Hash matches':'Not verified')+
            ' · <strong>Acceptance:</strong> Manual review required</p>'+
            '<table class="m0-evidence-table"><thead><tr><th>Case</th><th>Windows</th><th>Android</th></tr></thead><tbody>'+rows+'</tbody></table>'+
            (result.warnings.length?'<p>'+result.warnings.map(w=>escapeHTML(w)).join('<br>')+'</p>':
              '<p>Evidence is internally consistent for manual review. This is NOT physical-device acceptance.</p>');
        }catch(error){comparison.textContent='Report rejected: '+String(error?.message||'Invalid report').slice(0,180);}
      });
    }
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
    root.querySelector('[data-m0-portable-create]')?.addEventListener('click',async event=>{
      if(typeof env.confirm!=='function'||!env.confirm('Select an EMPTY disposable parent Folder only. Sourcebook will create a new .sb fixture with test metadata, leave it there for cross-device verification, and never delete it automatically. A failure may leave a partial Catalog. Continue?'))return;
      const button=event.currentTarget;button.disabled=true;
      try{
        const result=await createM0PortableCatalogFixture(typeof env.showDirectoryPicker==='function'?env.showDirectoryPicker.bind(env):null,{confirmed:true});
        lastFixtureName=result.fixtureName||'';
        record.portableCreateProbe=normalizePortableProbe(result);save();
        root.querySelector('[data-m0-portable-result]').textContent=portableSummary()+
          (lastFixtureName?' Fixture: '+lastFixtureName+'. Retain for re-open/Syncthing test; manually inspect any partial fixture.':'');
      }catch{toast('Portable fixture test failed. Inspect the disposable parent for a partial .sb Catalog.',true);}
      finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-portable-verify]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        record.portableVerifyProbe=normalizePortableProbe(await verifyM0PortableCatalogFixture(typeof env.showDirectoryPicker==='function'?env.showDirectoryPicker.bind(env):null));
        save();root.querySelector('[data-m0-portable-result]').textContent=portableSummary();
      }catch{toast('Portable fixture verification failed.',true);}
      finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-capture-create]')?.addEventListener('click',async event=>{
      if(typeof env.confirm!=='function'||!env.confirm('Select an EMPTY disposable parent Folder only. Sourcebook will create a new Folder containing one .url and one .md test file, verify both and leave them for manual restart/Syncthing inspection. A failure may leave partial files. Continue?'))return;
      const button=event.currentTarget;button.disabled=true;
      try{
        const result=await createM0CaptureFixture(typeof env.showDirectoryPicker==='function'?env.showDirectoryPicker.bind(env):null,{confirmed:true});
        lastCaptureFixtureName=result.fixtureName||'';
        record.captureCreateProbe=normalizeCaptureProbe(result);save();
        root.querySelector('[data-m0-capture-result]').textContent=captureSummary()+
          (lastCaptureFixtureName?' Fixture Folder: '+lastCaptureFixtureName+'. Retain and inspect manually.':'');
      }catch{toast('Capture provider fixture failed. Inspect the disposable parent for partial files.',true);}
      finally{button.disabled=false;}
    });
    root.querySelector('[data-m0-capture-verify]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{
        record.captureVerifyProbe=normalizeCaptureProbe(await verifyM0CaptureFixture(typeof env.showDirectoryPicker==='function'?env.showDirectoryPicker.bind(env):null));
        save();root.querySelector('[data-m0-capture-result]').textContent=captureSummary();
      }catch{toast('Read-only physical capture verification failed.',true);}
      finally{button.disabled=false;}
    });
    for(const [selector,action] of [['[data-m0-storage]',inspectShareStorage],['[data-m0-persist]',requestShareStoragePersistence]]){
      root.querySelector(selector)?.addEventListener('click',async event=>{
        const button=event.currentTarget;button.disabled=true;
        try{record.shareStorageProbe=normalizeShareStorageProbe(await action(env));save();
          root.querySelector('[data-m0-storage-result]').textContent=storageSummary();}
        finally{button.disabled=false;}
      });
    }
    root.querySelector('[data-m0-offline]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;
      try{record.offlineProbe=normalizeOfflineProbe(await inspectM0OfflineShell(env));save();
        root.querySelector('[data-m0-offline-result]').textContent=offlineSummary();}
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
      lastLeftoverName='';lastFixtureName='';lastCaptureFixtureName='';
      save();open();
    });
  };
  return {open};
}
