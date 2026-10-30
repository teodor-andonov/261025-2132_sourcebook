export const CODE_PATTERN = /^[a-z]{1,4}$/;
export function splitFilename(name) {
  const dot=name.lastIndexOf('.');
  if(dot<=0) return {stem:name,ext:''};
  return {stem:name.slice(0,dot),ext:name.slice(dot)};
}
export function parseFilename(name) {
  const {stem,ext}=splitFilename(name);
  let base=stem;
  const tokens=[];
  for(;;) {
    const m=base.match(/\[([a-z]{1,4})([0-9]+)\]$/);
    if(!m) break;
    tokens.unshift({code:m[1],number:Number(m[2]),raw:m[0]});
    base=base.slice(0,-m[0].length);
  }
  return {base,ext,tokens,displayName:base+ext};
}
export function appendToken(name,code,number) {
  if(!CODE_PATTERN.test(code)||!Number.isSafeInteger(number)||number<1) throw Error('Invalid catalog ID');
  const p=parseFilename(name);
  if(p.tokens.some(t=>t.code===code)) throw Error('File already belongs to this catalog');
  return p.base+p.tokens.map(t=>t.raw).join('')+'['+code+number+']'+p.ext;
}
export function ownedToken(name,code){return parseFilename(name).tokens.find(t=>t.code===code)||null;}
export function validName(s){return !!s&&s.length<=90&&!/[<>:"/\\|?*\x00-\x1f]/.test(s);}
