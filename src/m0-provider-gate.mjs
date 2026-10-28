// Conservative M0 filesystem-provider triage; never equate a synthetic probe with device acceptance.
const BAD=new Set(['error','denied','invalid','collision','not-empty']);
export function evaluateM0ProviderGate({features,writeProbe,captureVerifyProbe}={}){
  const picker=Array.isArray(features)?features.find(f=>f?.label==='Directory picker'):null;
  const directoryPicker=typeof picker?.available==='boolean'?(picker.available?'present':'absent'):'unknown';
  const writeVerified=writeProbe?.status==='ok'&&writeProbe.writeVerified===true&&writeProbe.cleanupVerified===true&&writeProbe.cleanupRequired!==true;
  const captureVerified=captureVerifyProbe?.status==='ok'&&captureVerifyProbe.urlVerified===true&&captureVerifyProbe.textVerified===true;
  const writeStatus=typeof writeProbe?.status==='string'?writeProbe.status:'not-run';
  const captureStatus=typeof captureVerifyProbe?.status==='string'?captureVerifyProbe.status:'not-run';
  let state='unverified',nextAction='Run a disposable write/read/remove probe and independently reopen the physical .url/.md fixture.';
  if(directoryPicker==='absent'){
    state='blocked';nextAction='Directory picker unavailable. Record Folder access as Blocked. A browser Download is not a verified Folder write.';
  }else if(directoryPicker==='unknown'){
    nextAction='Re-export from Device checks; older reports cannot establish directory-picker support.';
  }else if(writeStatus==='unsupported'||captureStatus==='unsupported'){
    state='blocked';nextAction='Filesystem provider unsupported. Record actual failure and provider; Download cannot clear the gate.';
  }else if(BAD.has(writeStatus)||BAD.has(captureStatus)||writeProbe?.cleanupRequired===true){
    state='failed';nextAction='Inspect synthetic leftovers and record the failure; retry only in a new empty disposable Folder.';
  }else if(writeVerified&&captureVerified){
    state='probe-ready';nextAction='Synthetic Folder operations succeeded. Real restart, Catalog, Syncthing and Android sharing remain unverified; M0 is NOT accepted.';
  }
  return {state,directoryPicker,writeVerified,captureVerified,writeStatus,captureStatus,nextAction};
}
