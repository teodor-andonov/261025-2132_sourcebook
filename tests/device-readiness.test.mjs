import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {M0_CASES,M0_STATUSES,M0_STORAGE_KEY,normalizeM0Record,inspectDeviceCapabilities,probeReadOnlyFolder,exportM0Report} from '../src/device-readiness.mjs';

test('eight M0 scenarios start unverified and never automatically pass',()=>{
  assert.equal(M0_CASES.length,8);
  assert.deepEqual(M0_STATUSES,['Not tested','Pass','Fail','Blocked']);
  assert.ok(M0_STORAGE_KEY.includes('m0'));
  assert.ok(Object.values(normalizeM0Record(null).results).every(item=>item.status==='Not tested'));
});
test('corrupt stored outcomes cannot imply passing acceptance',()=>{
  const r=normalizeM0Record({results:{'M0-01':{status:'passed',note:'x'.repeat(600),evidence:'javascript:alert(1)'},'M0-02':{status:'Pass',evidence:'https://github.com/example/repo/issues/1'}},releaseCommit:'main'});
  assert.equal(r.results['M0-01'].status,'Not tested');
  assert.equal(r.results['M0-01'].note.length,400);
  assert.equal(r.results['M0-01'].evidence,'');
  assert.equal(r.results['M0-02'].status,'Pass');
  assert.equal(r.results['M0-02'].evidence,'https://github.com/example/repo/issues/1');
  assert.equal(r.releaseCommit,'');
});
test('probe snapshots are bounded and exclude unrecognized private fields',()=>{
  const r=normalizeM0Record({probe:{status:'ok',permission:'granted',entriesSampled:999,fileReadable:1,privatePath:'/secret'}});
  assert.equal(r.probe.entriesSampled,10);
  assert.equal(r.probe.fileReadable,false);
  assert.ok(!JSON.stringify(r).includes('privatePath'));
});
test('Android capability report distinguishes API availability from acceptance',()=>{
  const result=inspectDeviceCapabilities({isSecureContext:true,navigator:{userAgent:'Mozilla/5.0 (Linux; Android 16) Chrome/153.0.0.0',serviceWorker:{controller:null},clipboard:{readText(){}}},matchMedia:()=>({matches:false})});
  assert.equal(result.platform,'Android');
  assert.equal(result.chromeVersion,'153.0.0.0');
  assert.equal(result.standalone,false);
  assert.equal(result.features.find(f=>f.label==='Directory picker').available,false);
  assert.equal(result.features.find(f=>f.label==='Clipboard readText').available,true);
});
test('standalone display does not imply directory access',()=>{
  const r=inspectDeviceCapabilities({matchMedia:()=>({matches:true}),navigator:{userAgent:'Windows Chrome/154.0'}});
  assert.equal(r.standalone,true);
  assert.equal(r.features.find(f=>f.label==='Directory picker').available,false);
});
test('missing picker, cancellation and denial are reported without prompting again',async()=>{
  assert.equal((await probeReadOnlyFolder(null)).status,'unsupported');
  const cancelled=await probeReadOnlyFolder(async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});});
  const denied=await probeReadOnlyFolder(async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});});
  assert.equal(cancelled.status,'cancelled');
  assert.equal(denied.status,'denied');
});
test('read-only probe samples at most ten entries and reads file metadata only',async()=>{
  const pickerModes=[],permissionModes=[],readCalls=[];
  const entries=Array.from({length:12},(_,i)=>({kind:'file',getFile:async()=>{readCalls.push(i);return {size:42,name:'private-file-name'};}}));
  const handle={queryPermission:async options=>{permissionModes.push(options.mode);return 'granted';},isSameEntry:async other=>other===handle,async *values(){yield* entries;}};
  const result=await probeReadOnlyFolder(async options=>{pickerModes.push(options.mode);return handle;});
  assert.deepEqual(pickerModes,['read']);
  assert.deepEqual(permissionModes,['read']);
  assert.equal(result.status,'ok');
  assert.equal(result.entriesSampled,10);
  assert.equal(result.fileReadable,true);
  assert.equal(result.identityCheck,'same');
  assert.deepEqual(readCalls,[0]);
  assert.ok(!JSON.stringify(result).includes('private-file-name'));
});
test('permission denial prevents directory enumeration',async()=>{
  let enumerated=false;
  const result=await probeReadOnlyFolder(async()=>({queryPermission:async()=> 'denied',async *values(){enumerated=true;yield {kind:'file'};}}));
  assert.equal(result.status,'denied');
  assert.equal(enumerated,false);
});
test('enumeration errors are sanitized without leaking provider messages',async()=>{
  const result=await probeReadOnlyFolder(async()=>({async *values(){throw Error('private/path/secret');}}));
  assert.equal(result.status,'error');
  assert.ok(!JSON.stringify(result).includes('secret'));
});
test('export excludes raw user-agent and filesystem information',()=>{
  const caps=inspectDeviceCapabilities({navigator:{userAgent:'Chrome/153.0 private-device-id'}});
  const report=exportM0Report({results:{'M0-01':{status:'Fail',note:'Repro needed'}}},caps,'2026-10-28T00:00:00.000Z');
  assert.equal(report.results['M0-01'].status,'Fail');
  assert.equal(report.results['M0-02'].status,'Not tested');
  assert.equal(report.schema,'sourcebook-m0-device-report-v1');
  assert.ok(!JSON.stringify(report).includes('private-device-id'));
  assert.match(report.caveat,/not physical-device acceptance/);
});
test('launcher, Settings and offline shell wire up device checks',async()=>{
  const app=await readFile(new URL('../src/app.mjs',import.meta.url),'utf8');
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(app,/createDeviceReadinessUI/);
  assert.match(app,/case 'device-checks':deviceReadiness\.open\(\)/);
  assert.ok((app.match(/data-action="device-checks"/g)||[]).length>=2);
  assert.match(sw,/\.\/src\/device-readiness\.mjs/);
});
