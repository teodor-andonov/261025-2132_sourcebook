import {parseFilename,CODE_PATTERN} from './identity.mjs';

// Plan IDs without touching source files. This is a single-editor allocator;
// independent offline editors require reconciliation before shared writes.
export function planResourceIdentity(catalog,records,filename,siblingNames=[]) {
  if(!catalog||!CODE_PATTERN.test(catalog.code))throw Error('Invalid catalog identity');
  const {code}=catalog;
  const own=parseFilename(filename).tokens.filter(t=>t.code===code);
  if(own.length>1)throw Error('Multiple identities from this catalog appear in the filename');
  const used=new Set();
  for(const record of records){
    if(typeof record.id!=='string')continue;
    if(record.id.startsWith(code)&&/^[1-9]\d*$/.test(record.id.slice(code.length)))used.add(Number(record.id.slice(code.length)));
  }
  const siblings=new Map();
  for(const name of siblingNames){
    for(const token of parseFilename(name).tokens.filter(t=>t.code===code)){
      if(siblings.has(token.number)&&siblings.get(token.number)!==name)throw Error('Duplicate filename identity in this folder: '+code+token.number);
      siblings.set(token.number,name);
      used.add(token.number);
    }
  }
  if(own.length){
    const n=own[0].number;
    if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid filename identity');
    if(used.has(n)&&(!siblings.has(n)||siblings.get(n)!==filename))throw Error('Identity collision: '+code+n);
    // Records may use the same ID at a different path. Never overwrite them.
    if(records.some(r=>r.id===code+n))throw Error('Identity already belongs to another resource: '+code+n);
    return {id:code+n,nextSequence:Math.max(catalog.nextSequence||1,n+1),fromFilename:true};
  }
  let n=Math.max(1,Number.isSafeInteger(catalog.nextSequence)?catalog.nextSequence:1);
  while(used.has(n))n++;
  if(!Number.isSafeInteger(n)||n>=Number.MAX_SAFE_INTEGER)throw Error('Catalog identity sequence exhausted');
  return {id:code+n,nextSequence:n+1,fromFilename:false};
}
