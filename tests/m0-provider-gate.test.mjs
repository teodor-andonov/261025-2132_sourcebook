import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluateM0ProviderGate} from '../src/m0-provider-gate.mjs';
import {parseM0EvidenceReport,compareM0EvidenceReports} from '../src/m0-evidence-review.mjs';
import {normalizeM0Record,exportM0Report} from '../src/device-readiness.mjs';
const features=available=>[{label:'Directory picker',available}];
const write={status:'ok',writeVerified:true,cleanupVerified:true,cleanupRequired:false};
const capture={status:'ok',urlVerified:true,textVerified:true,fixtureProof:'a'.repeat(64)};
test('absent picker blocks even with old successful probes',()=>assert.equal(evaluateM0ProviderGate({features:features(false),writeProbe:write,captureVerifyProbe:capture}).state,'blocked'));
test('unknown legacy capability is never ready',()=>assert.equal(evaluateM0ProviderGate({writeProbe:write,captureVerifyProbe:capture}).state,'unverified'));
test('readback, cleanup and fixture verification all required',()=>{
  assert.equal(evaluateM0ProviderGate({features:features(true),writeProbe:write,captureVerifyProbe:capture}).state,'probe-ready');
  assert.equal(evaluateM0ProviderGate({features:features(true),writeProbe:{...write,cleanupVerified:false},captureVerifyProbe:capture}).state,'unverified');
  assert.equal(evaluateM0ProviderGate({features:features(true),writeProbe:write,captureVerifyProbe:{...capture,textVerified:false}}).state,'unverified');
});
test('denied, unsupported and partial probes cannot clear gate',()=>{
  assert.equal(evaluateM0ProviderGate({features:features(true),writeProbe:{status:'denied'}}).state,'failed');
  assert.equal(evaluateM0ProviderGate({features:features(true),writeProbe:{status:'unsupported'}}).state,'blocked');
  assert.equal(evaluateM0ProviderGate({features:features(true),writeProbe:{...write,cleanupRequired:true}}).state,'failed');
});
const make=platform=>{
  const record=normalizeM0Record(null,'2026-10-28T18:28:00.000Z');
  record.releaseCommit='adade6425b0df9c8ca013dba9539b7b4f931e323';
  record.writeProbe=write;record.captureVerifyProbe=capture;
  record.portableVerifyProbe={status:'ok',portableVerified:true,journalClear:true,fixtureProof:'b'.repeat(64)};
  for(const id of Object.keys(record.results))record.results[id]={status:'Pass',note:'manual observation',evidence:'https://github.com/example/evidence'};
  return exportM0Report(record,{platform,chromeVersion:'130',standalone:true,features:features(true)},'2026-10-28T18:28:00.000Z');
};
test('coarse provider gate exports without private fields',()=>{
  const report=make('Windows');
  assert.equal(report.providerGate.state,'probe-ready');
  assert.ok(!JSON.stringify(report.providerGate).includes('fixtureProof'));
});
test('report comparison recomputes gate and rejects all-Pass unsupported Android',()=>{
  const win=make('Windows'),android=make('Android');
  android.capabilities=features(false);android.providerGate={state:'probe-ready'};
  const result=compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(win)),parseM0EvidenceReport(JSON.stringify(android)),'2026-10-28T18:28:00.000Z');
  assert.equal(result.readyForManualReview,false);assert.match(result.warnings.join(' '),/Android filesystem provider gate is blocked/);assert.equal(result.accepted,false);
});
test('legacy report without capability metadata remains parseable but not review-ready',()=>{
  const win=make('Windows'),android=make('Android');delete android.capabilities;delete android.providerGate;
  const parsed=parseM0EvidenceReport(JSON.stringify(android));assert.equal(parsed.providerGate.state,'unverified');
  assert.equal(compareM0EvidenceReports(parseM0EvidenceReport(JSON.stringify(win)),parsed,'2026-10-28T18:28:00.000Z').readyForManualReview,false);
});
test('UI and offline shell wire provider gate without screenshots',async()=>{
  const ui=await readFile(new URL('../src/device-readiness.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(ui,/data-m0-provider-gate/);assert.match(ui,/refreshProviderGate/);assert.match(sw,/\.\/src\/m0-provider-gate\.mjs/);
});
