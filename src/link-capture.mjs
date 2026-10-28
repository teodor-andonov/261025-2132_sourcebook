// Device-local link capture staging, independent of optional .sb Catalog metadata.
// This is NOT a synced Catalog URL resource or an Android share target.
export const LINK_CAPTURE_KEY='sourcebook-captured-links-v1';
export const LINK_CAPTURE_LIMIT=200;
export const LINK_PASTE_LIMIT=20;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function normalizeCaptureURL(input){
  if(typeof input!=='string')throw Error('Link must be text');
  const value=input.trim();
  if(!value||value.length>2048||/\s|[\u0000-\u001f\u007f]/u.test(value))throw Error('Use a single HTTP or HTTPS URL without spaces');
  let url;
  try{url=new URL(value);}catch{throw Error('Invalid link URL');}
  if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)
    throw Error('Only HTTP(S) links without embedded credentials are supported');
  return url.href;
}
export function normalizeCaptureStore(raw){
  if(raw===null||raw===undefined)return {version:1,links:[]};
  if(!raw||raw.version!==1||!Array.isArray(raw.links)||raw.links.length>LINK_CAPTURE_LIMIT)
    throw Error('Saved link data is incompatible; export or repair it before editing');
  const ids=new Set(),urls=new Set();
  const links=raw.links.map(item=>{
    if(!item||typeof item.id!=='string'||!item.id||item.id.length>128||
      typeof item.title!=='string'||item.title.length>120||
      typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt)))
      throw Error('Saved link data contains an invalid record');
    const url=normalizeCaptureURL(item.url);
    if(url!==item.url||ids.has(item.id)||urls.has(url))throw Error('Saved link data contains duplicate or noncanonical records');
    ids.add(item.id);urls.add(url);
    return {id:item.id,url,title:item.title,createdAt:item.createdAt};
  });
  return {version:1,links};
}
export function planCapturedLinks(store,text,{idFactory=()=>globalThis.crypto.randomUUID(),now=()=>new Date().toISOString()}={}){
  const current=normalizeCaptureStore(store);
  if(typeof text!=='string'||text.length>45000)throw Error('Paste is too large');
  const lines=text.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean);
  if(!lines.length)throw Error('Paste at least one URL');
  if(lines.length>LINK_PASTE_LIMIT)throw Error('Paste at most '+LINK_PASTE_LIMIT+' URLs at once');
  // Validate the entire paste before creating or saving any records.
  const urls=lines.map(normalizeCaptureURL),existing=new Set(current.links.map(x=>x.url));
  const added=[];
  for(const url of urls){
    if(existing.has(url))continue;
    existing.add(url);
    if(current.links.length+added.length>=LINK_CAPTURE_LIMIT)throw Error('Device link limit reached ('+LINK_CAPTURE_LIMIT+'); export or remove links first');
    const id=idFactory(),createdAt=now();
    if(typeof id!=='string'||!id||id.length>128||current.links.some(x=>x.id===id)||added.some(x=>x.id===id))
      throw Error('Could not allocate a unique link ID');
    if(!Number.isFinite(Date.parse(createdAt)))throw Error('Invalid capture timestamp');
    added.push({id,url,title:'',createdAt});
  }
  return {next:{version:1,links:[...added.reverse(),...current.links]},added:added.length,duplicates:urls.length-added.length};
}
export function planRemoveCapturedLink(store,id){
  const current=normalizeCaptureStore(store);
  if(!current.links.some(item=>item.id===id))throw Error('Link was already removed');
  return {version:1,links:current.links.filter(item=>item.id!==id)};
}
export function planRenameCapturedLink(store,id,title){
  const current=normalizeCaptureStore(store);
  if(typeof title!=='string'||title.trim().length>120||/[\u0000-\u001f\u007f]/u.test(title))throw Error('Invalid link title');
  if(!current.links.some(item=>item.id===id))throw Error('Link was already removed');
  return {version:1,links:current.links.map(item=>item.id===id?{...item,title:title.trim()}:item)};
}
// Optimistic device-local checks. IndexedDB get/put is not a cross-tab CAS.
// A verified readback detects many races, but cannot guarantee multi-tab isolation.
export async function updateCapturedLinks(getLocal,setLocal,planner){
  const before=await getLocal(LINK_CAPTURE_KEY);
  const next=planner(normalizeCaptureStore(before));
  normalizeCaptureStore(next);
  if(!equal(before,await getLocal(LINK_CAPTURE_KEY)))throw Error('Links changed in another tab; reopen Capture before retrying');
  if(equal(normalizeCaptureStore(before),next))return next;
  await setLocal(LINK_CAPTURE_KEY,next);
  if(!equal(normalizeCaptureStore(await getLocal(LINK_CAPTURE_KEY)),next))
    throw Error('Saved links changed during verification; reopen Capture');
  return next;
}
export function createLinkCaptureUI({openDialog,escapeHTML,toast,getLocal,setLocal,env=globalThis}){
  let busy=false;
  const $=selector=>env.document.querySelector(selector);
  const render=async()=>{
    const host=$('#captured-links-list');
    if(!host)return;
    try{
      const store=normalizeCaptureStore(await getLocal(LINK_CAPTURE_KEY));
      if(!$('#captured-links-list'))return;
      host.innerHTML=store.links.length?
        '<div class="capture-count">'+store.links.length+' staged on this device</div>'+
        store.links.map(item=>'<div class="capture-row"><div class="capture-link"><strong>'+escapeHTML(item.title||new URL(item.url).hostname)+'</strong><small title="'+escapeHTML(item.url)+'">'+escapeHTML(item.url)+'</small></div><a class="secondary" href="'+escapeHTML(item.url)+'" target="_blank" rel="noopener noreferrer" title="Open in new tab">Open</a><button class="secondary" type="button" data-capture="rename" data-link-id="'+escapeHTML(item.id)+'" title="Edit title">Title</button><button class="secondary" type="button" data-capture="copy" data-link-id="'+escapeHTML(item.id)+'" title="Copy URL">Copy</button><button class="secondary" type="button" data-capture="remove" data-link-id="'+escapeHTML(item.id)+'" title="Remove from this device">Remove</button></div>').join(''):
        '<p>No links captured on this device yet.</p>';
    }catch(error){host.textContent='Cannot read saved links: '+error.message+'. Nothing was changed.';}
  };
  const findLink=async id=>normalizeCaptureStore(await getLocal(LINK_CAPTURE_KEY)).links.find(item=>item.id===id);
  const mutate=async planner=>{
    if(busy)return;
    busy=true;
    try{const next=await updateCapturedLinks(getLocal,setLocal,planner);await render();return next;}
    catch(error){toast('Link capture: '+error.message,true);}
    finally{busy=false;}
  };
  const open=({prefill='',onSaved=null,notice=''}={})=>{
    openDialog('<h2>Capture links</h2><p>Paste HTTP(S) URLs, one per line, or read the clipboard. Links are only staged in this browser, not durable Resources or files. Use Save URL/text as file for durable .url captures. No page content is fetched.</p>'+(notice?'<p>'+escapeHTML(notice)+'</p>':'')+
      '<form id="capture-link-form"><label>URLs<textarea id="capture-link-input" rows="3" maxlength="45000" placeholder="https://example.org/reference"></textarea></label><div class="dialog-actions"><button type="button" class="secondary" data-capture="clipboard">Read clipboard</button><button type="submit" class="primary">Save links</button></div></form>'+
      '<div id="captured-links-list" class="capture-list" aria-live="polite">Loading…</div>'+
      '<div class="dialog-actions"><button type="button" class="secondary" data-capture="export">Export JSON</button><button type="button" class="secondary" data-action="dismiss">Done</button></div>');
    const dialog=$('#dialog');
    if(prefill)$('#capture-link-input').value=prefill;
    $('#capture-link-input')?.focus();
    void render();
    dialog.querySelector('#capture-link-form').addEventListener('submit',async event=>{
      event.preventDefault();
      const input=$('#capture-link-input');
      if(!input||busy)return;
      const text=input.value;
      const result=await mutate(store=>planCapturedLinks(store,text).next);
      if(result){input.value='';toast('Links staged locally. Create .url files for durable resources. Duplicates are skipped.');
        if(typeof onSaved==='function')try{await onSaved(result);}catch(error){toast('Link saved, but incoming share could not be cleared: '+error.message,true);}
      }
    });
    dialog.addEventListener('click',async event=>{
      const control=event.target.closest('[data-capture]');
      if(!control||busy)return;
      const action=control.dataset.capture,id=control.dataset.linkId;
      if(action==='clipboard'){
        try{
          if(typeof env.navigator?.clipboard?.readText!=='function')throw Error('Clipboard reading is unavailable. Paste manually.');
          const text=await env.navigator.clipboard.readText();
          const input=$('#capture-link-input');
          if(input){input.value=text.slice(0,45000);input.focus();}
        }catch(error){toast('Clipboard unavailable: paste into the URL field instead.',true);}
        return;
      }
      try{
        if(action==='export'){
          const store=normalizeCaptureStore(await getLocal(LINK_CAPTURE_KEY));
          if(!store.links.length)return toast('No saved links to export.');
          if(!env.confirm('Export '+store.links.length+' URLs to a JSON file? The file may contain private links.'))return;
          const blob=new Blob([JSON.stringify({schema:'sourcebook-device-links-v1',exportedAt:new Date().toISOString(),links:store.links},null,2)+'\n'],{type:'application/json'});
          const url=URL.createObjectURL(blob),a=env.document.createElement('a');
          a.href=url;a.download='sourcebook-links-'+new Date().toISOString().slice(0,10)+'.json';
          env.document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
          return;
        }
        const item=await findLink(id);
        if(!item)return toast('Link changed. Reopen Capture.',true);
        if(action==='rename'){
          const title=env.prompt('Link title (optional, up to 120 characters)',item.title);
          if(title!==null)await mutate(store=>planRenameCapturedLink(store,id,title));
        }else if(action==='copy'){
          if(typeof env.navigator?.clipboard?.writeText==='function')await env.navigator.clipboard.writeText(item.url);
          else {const input=$('#capture-link-input');if(input){input.value=item.url;input.focus();input.select();}toast('Select and copy the URL manually.');}
        }else if(action==='remove'&&env.confirm('Remove this link from this device?')){
          await mutate(store=>planRemoveCapturedLink(store,id));
        }
      }catch(error){toast('Link action failed: '+error.message,true);}
    });
  };
  return {open};
}
