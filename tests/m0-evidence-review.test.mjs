import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseM0EvidenceReport,compareM0EvidenceReports,M0_IDS,M0_REPORT_LIMIT} from '../src/m0-evidence-review.mjs';
import {exportM0Report,normalizeM0Record} from '../src/device-readiness.mjs';
const now='2026-10-28T07:30:00.000Z';
const make=(platform='Windows',status='Pass')=>{
  const record=normalizeM0Record(null,now);
  record.releaseCommit='2e3106b2ed9ea6697c445e0036b585e87cc7f00a';
  for(const id of M0_IDS)record.results[id]={status,note:'Actual device test',evidence:'https://github.com/example/evidence'};
  record.portableVerifyProbe={status:'ok',portableVerified:true,journalClear:true,fixtureProof:'a'.repeat(64)};
  record.writeProbe={status:'ok',writeVerified:true,cleanupVerified:true,cleanupRequired:false};
  record.probe={status:'ok',permission:'granted',entriesSampled:2,fileReadable:true,identityCheck:'same'};
  record.reopenProbe={status:'ok',permission:'granted',enumerated:true};
  record.offlineProbe={status:'cached',controllerActive:true,shellCached:true,appModuleCached:true};
  record.captureVerifyProbe={status:'ok',urlVerified:true,textVerified:true,fixtureProof:'c'.repeat(64)};
  return exportM0Report(record,{platform,chromeVersion:'130.0.0.0',standalone:true,features:[{label:'Directory picker',available:true}]},now);
};
const parsed=(platform,status)=>parseM0EvidenceReport(JSON.stringify(make(platform,status)));
test('normal exported reports parse without including user-entered notes or paths',()=>{
  const report=parsed('Windows');
  assert.equal(report.results['M0-01'].status,'Pass');
  assert.equal(report.results['M0-01'].hasNote,true);
  assert.equal(report.results['M0-01'].evidence,'https://github.com/example/evidence');
  assert.ok(!JSON.stringify(report).includes('Actual device test'));
});
test('two matching reports are only eligible for manual review, never accepted',()=>{
  const result=compareM0EvidenceReports(parsed('Windows'),parsed('Android'),now);
  assert.equal(result.sameFixture,true);
  assert.equal(result.sameCommit,true);
  assert.equal(result.readyForManualReview,true);
  assert.equal(result.accepted,false);
  assert.equal(result.rows.length,8);
});
test('blocked scenario, mismatched fixture, missing evidence and commit are flagged',()=>{
  const win=make('Windows'),android=make('Android','Blocked');
  android.portableCatalogVerifyProbe.fixtureProof='b'.repeat(64);
  android.releaseCommit='abcdef0';
  android.results['M0-05'].evidence='';
  const result=compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(win)),parseM0EvidenceReport(JSON.stringify(android)),now);
  assert.equal(result.readyForManualReview,false);
  assert.equal(result.sameFixture,false);
  assert.equal(result.sameCommit,false);
  assert.ok(result.warnings.length>=4);
});
test('a matching fixture hash without successful verification cannot count',()=>{
  const win=make('Windows'),android=make('Android');
  android.portableCatalogVerifyProbe.status='denied';
  const result=compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(win)),parseM0EvidenceReport(JSON.stringify(android)),now);
  assert.equal(result.sameFixture,false);
});
test('invalid JSON, schemas, platforms, status, timestamps and oversized reports fail closed',()=>{
  const valid=make();
  for(const value of ['{',JSON.stringify({}),JSON.stringify({...valid,schema:'other'}),
    JSON.stringify({...valid,exportedAt:'wrong'}),
    JSON.stringify({...valid,environment:{...valid.environment,platform:'Other'}}),
    JSON.stringify({...valid,results:{...valid.results,'M0-03':{status:'green',note:''}}}),
    'x'.repeat(M0_REPORT_LIMIT+1)]){
    assert.throws(()=>parseM0EvidenceReport(value));
  }
});
test('reports from same platform cannot be compared as cross-device evidence',()=>{
  assert.throws(()=>compareM0EvidenceReports(parsed('Android'),parsed('Android'),now));
});
test('future or stale reports and browser-tab runs are not ready',()=>{
  const a=make('Windows'),b=make('Android');
  a.environment.standalone=false;
  b.exportedAt='2026-08-01T00:00:00.000Z';
  const result=compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(a)),parseM0EvidenceReport(JSON.stringify(b)),now);
  assert.equal(result.readyForManualReview,false);
  assert.match(result.warnings.join(' '),/standalone/);
  assert.match(result.warnings.join(' '),/older than 30/);
});
test('UI and offline shell include review module without screenshot generation',async()=>{
  const ui=await readFile(new URL('../src/device-readiness.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(ui,/data-m0-report/);
  assert.match(ui,/compareM0EvidenceReports/);
  assert.match(sw,/\.\/src\/m0-evidence-review\.mjs/);
  assert.match(sw,/k\.startsWith\('sourcebook-shell-'\)/);
});

test('matching physical capture fixture proofs are supporting evidence only',()=>{
  const win=make('Windows'),android=make('Android');
  for(const report of [win,android]){
    report.physicalCaptureVerifyProbe={status:'ok',urlVerified:true,textVerified:true,fixtureProof:'c'.repeat(64)};
  }
  const result=compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(win)),
    parseM0EvidenceReport(JSON.stringify(android)),now);
  assert.equal(result.sameCaptureFixture,true);
  assert.equal(result.readyForManualReview,true);
  assert.equal(result.accepted,false);
});
test('mismatched or unverified physical capture fixtures are flagged without leaking data',()=>{
  const win=make('Windows'),android=make('Android');
  win.physicalCaptureVerifyProbe={status:'ok',urlVerified:true,textVerified:true,fixtureProof:'c'.repeat(64),privatePath:'/secret'};
  android.physicalCaptureVerifyProbe={status:'error',urlVerified:true,textVerified:false,fixtureProof:'d'.repeat(64)};
  const parsedWin=parseM0EvidenceReport(JSON.stringify(win));
  assert.ok(!JSON.stringify(parsedWin).includes('privatePath'));
  const result=compareM0EvidenceReports(parsedWin,parseM0EvidenceReport(JSON.stringify(android)),now);
  assert.equal(result.sameCaptureFixture,false);
  assert.match(result.warnings.join(' '),/Physical \.url\/\.md fixture/);
  assert.equal(result.readyForManualReview,false);
});

test('all-Pass reports without Folder, handle and cache diagnostics are not review-ready',()=>{
  const win=make('Windows'),android=make('Android');
  delete win.readOnlyFolderProbe;
  android.savedReadHandleProbe={status:'saved',permission:'granted',enumerated:false};
  android.offlineCacheProbe={status:'cached',controllerActive:false,shellCached:true,appModuleCached:true};
  const result=compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(win)),
    parseM0EvidenceReport(JSON.stringify(android)),now);
  assert.equal(result.readyForManualReview,false);
  assert.deepEqual(result.probeRows.map(row=>row.id),['M0-02','M0-04','M0-06']);
  assert.equal(result.probeRows[0].windows,false);
  assert.equal(result.probeRows[1].android,false);
  assert.equal(result.probeRows[2].android,false);
  assert.match(result.warnings.join(' '),/Windows M0-02/);
  assert.match(result.warnings.join(' '),/Android M0-04/);
  assert.match(result.warnings.join(' '),/Android M0-06/);
});
test('every claimed Pass needs external evidence, including large Folder and Android capture',()=>{
  const win=make('Windows'),android=make('Android');
  win.results['M0-07'].evidence='';
  android.results['M0-08'].evidence='';
  const result=compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(win)),
    parseM0EvidenceReport(JSON.stringify(android)),now);
  assert.equal(result.readyForManualReview,false);
  assert.match(result.warnings.join(' '),/Windows M0-07/);
  assert.match(result.warnings.join(' '),/Android M0-08/);
});
test('imported diagnostics retain booleans, never private paths or arbitrary properties',()=>{
  const win=make('Windows');
  win.readOnlyFolderProbe.privatePath='C:/secret/client';
  win.savedReadHandleProbe.filename='secret.pdf';
  win.offlineCacheProbe.privateValue='sensitive';
  const report=parseM0EvidenceReport(JSON.stringify(win));
  assert.deepEqual(report.probes,{folderRead:true,handleRecheck:true,cacheReady:true});
  assert.ok(!JSON.stringify(report).includes('secret'));
  assert.ok(!JSON.stringify(report).includes('sensitive'));
});
