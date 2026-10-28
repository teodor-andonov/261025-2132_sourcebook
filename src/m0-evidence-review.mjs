// Read-only, device-local review of two manually exported M0 reports.
import {evaluateM0ProviderGate} from './m0-provider-gate.mjs';
// Neither imported JSON nor a matching synthetic fixture fingerprint establishes acceptance.
export const M0_REPORT_SCHEMA='sourcebook-m0-device-report-v1';
export const M0_REPORT_LIMIT=128*1024;
export const M0_IDS=Array.from({length:8},(_,i)=>'M0-'+String(i+1).padStart(2,'0'));
const STATUSES=new Set(['Not tested','Pass','Fail','Blocked']);
const PROOF=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{7,40}$/i;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
const validEvidence=value=>{
  if(typeof value!=='string'||value.length>300)return '';
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';
  }catch{return '';}
};
export function parseM0EvidenceReport(json){
  if(typeof json!=='string'||json.length>M0_REPORT_LIMIT)throw Error('M0 report exceeds the 128 KiB text limit.');
  let input;
  try{input=JSON.parse(json);}catch{throw Error('M0 report is not valid JSON.');}
  if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!==M0_REPORT_SCHEMA)
    throw Error('Unsupported M0 report schema.');
  if(!timestamp(input.exportedAt))throw Error('M0 report has no valid export timestamp.');
  const env=input.environment;
  if(!env||!['Windows','Android'].includes(env.platform)||typeof env.standalone!=='boolean')
    throw Error('M0 report must identify a Windows or Android environment.');
  if(typeof env.chromeVersion!=='string'||env.chromeVersion.length>40)
    throw Error('M0 report has invalid Chrome version metadata.');
  if(!input.results||typeof input.results!=='object'||Array.isArray(input.results))
    throw Error('M0 report is missing scenario results.');
  const results={};
  for(const id of M0_IDS){
    const item=input.results[id];
    if(!item||typeof item!=='object'||!STATUSES.has(item.status))
      throw Error('M0 report has an invalid '+id+' result.');
    if(typeof item.note!=='string'||item.note.length>400)
      throw Error('M0 report has an oversized '+id+' note.');
    results[id]={status:item.status,evidence:validEvidence(item.evidence),hasNote:item.note.trim().length>0};
  }
  const p=input.portableCatalogVerifyProbe||{};
  const fixtureProof=typeof p.fixtureProof==='string'&&PROOF.test(p.fixtureProof)?p.fixtureProof:'';
  const capture=input.physicalCaptureVerifyProbe||{};
  const captureProof=typeof capture.fixtureProof==='string'&&PROOF.test(capture.fixtureProof)?capture.fixtureProof:'';
  // Recompute from original fields: a claimed providerGate in imported JSON is not trusted.
  const providerGate=evaluateM0ProviderGate({features:input.capabilities,writeProbe:input.disposableWriteProbe,captureVerifyProbe:input.physicalCaptureVerifyProbe});
  return Object.freeze({
    providerGate,
    platform:env.platform,chromeVersion:env.chromeVersion,standalone:env.standalone,
    exportedAt:input.exportedAt,releaseCommit:COMMIT.test(input.releaseCommit||'')?input.releaseCommit.toLowerCase():'',
    results,portableVerified:p.status==='ok'&&p.portableVerified===true&&p.journalClear===true,
    fixtureProof,
    captureVerified:capture.status==='ok'&&capture.urlVerified===true&&capture.textVerified===true,
    captureProof
  });
}
export function compareM0EvidenceReports(windows,android,now=new Date().toISOString()){
  if(windows?.platform!=='Windows'||android?.platform!=='Android')
    throw Error('Select one Windows report and one Android report.');
  const rows=M0_IDS.map(id=>({id,windows:windows.results[id].status,android:android.results[id].status,
    windowsEvidence:!!windows.results[id].evidence,androidEvidence:!!android.results[id].evidence}));
  const warnings=[];
  for(const report of [windows,android])if(report.providerGate?.state!=='probe-ready')warnings.push(report.platform+' filesystem provider gate is '+(report.providerGate?.state||'unverified')+'. '+(report.providerGate?.nextAction||'Re-export device evidence.'));

  const sameCommit=!!windows.releaseCommit&&!!android.releaseCommit&&
    (windows.releaseCommit===android.releaseCommit||
      (windows.releaseCommit.startsWith(android.releaseCommit)||android.releaseCommit.startsWith(windows.releaseCommit)));
  if(!sameCommit)warnings.push('Published commits differ or are missing. Compare results against the same deployed release.');
  if(!windows.standalone||!android.standalone)warnings.push('At least one report was exported outside standalone PWA mode.');
  const ageDays=r=>(Date.parse(now)-Date.parse(r.exportedAt))/86400000;
  if([windows,android].some(r=>ageDays(r)>30||ageDays(r)<-1))
    warnings.push('At least one report is older than 30 days or has a future timestamp.');
  const sameFixture=!!windows.portableVerified&&!!android.portableVerified&&
    !!windows.fixtureProof&&windows.fixtureProof===android.fixtureProof;
  if(!sameFixture)warnings.push('No matching verified disposable .sb fixture proof across devices. Reverify the SAME synced fixture on both devices and export again.');
  const sameCaptureFixture=!!windows.captureVerified&&!!android.captureVerified&&
    !!windows.captureProof&&windows.captureProof===android.captureProof;
  if(!sameCaptureFixture)
    warnings.push('Physical .url/.md fixture evidence is incomplete or mismatched. Verify the SAME disposable Folder on both devices.');
  const blockers=rows.filter(r=>r.windows!=='Pass'||r.android!=='Pass');
  if(blockers.length)warnings.push(blockers.length+' M0 scenarios are not marked Pass on both devices.');
  if(!rows.find(r=>r.id==='M0-05')?.windowsEvidence||!rows.find(r=>r.id==='M0-05')?.androidEvidence)
    warnings.push('M0-05 needs explicit external evidence links on both devices; matching fixture fingerprints alone do not prove Syncthing transfer.');
  return {rows,warnings,sameCommit,sameFixture,sameCaptureFixture,
    readyForManualReview:warnings.length===0,
    accepted:false, // Never infer device acceptance from self-reported JSON.
    windowsExportedAt:windows.exportedAt,androidExportedAt:android.exportedAt};
}
