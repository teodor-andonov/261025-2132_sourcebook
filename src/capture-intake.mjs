// Explicit, review-first clipboard/paste/drop text intake.
// This module never writes files, Catalog metadata, or device-local storage.
import {classifyPastedText} from './file-capture.mjs';
import {normalizeCaptureURL} from './link-capture.mjs';

export const MAX_DROPPED_URLS=20;
export function prepareCaptureIntake({text='',uriList='',source='paste'}={}){
  if(!['paste','drop','clipboard'].includes(source)||
    typeof text!=='string'||typeof uriList!=='string')
    throw Error('Invalid text capture source');
  if(source==='drop'&&uriList.trim()){
    if(uriList.length>1024*1024)throw Error('Dropped URL list exceeds 1 MiB');
    // RFC 2483 text/uri-list permits blank lines and # comments. A single
    // HTTP(S) URL becomes .url; multiple URLs become literal Markdown lines.
    const rows=uriList.replace(/\r\n?/g,'\n').split('\n')
      .map(row=>row.trim()).filter(row=>row&&!row.startsWith('#'));
    if(rows.length){
      if(rows.length>MAX_DROPPED_URLS)
        throw Error('Drop at most '+MAX_DROPPED_URLS+' URLs at once');
      // Reject mixed or unsupported schemes rather than silently capturing
      // file:, javascript:, or malformed links as seemingly valid shortcuts.
      const urls=rows.map(url=>normalizeCaptureURL(url));
      return {...classifyPastedText(urls.join('\n')),source};
    }
  }
  return {...classifyPastedText(text),source};
}
