// Small semantic file symbols adapted from Fold's useful extension-first design.
// Color belongs only to the icon, not the surrounding Sourcebook interface.
const hues={
  url:210,pdf:355,doc:211,docx:211,xls:145,xlsx:145,csv:160,ppt:23,pptx:23,
  md:155,txt:205,json:278,js:44,mjs:47,jsx:36,ts:212,tsx:214,py:194,
  html:12,htm:14,css:227,scss:310,svg:330,xml:20,yaml:85,yml:85,toml:85,
  jpg:326,jpeg:326,png:315,webp:300,gif:288,bmp:280,avif:290,
  mp4:270,mov:261,webm:263,mkv:265,mp3:195,wav:193,flac:183,m4a:195,
  zip:26,rar:31,'7z':36,blend:29,'3dm':203,ifc:161,glb:200,gltf:202,
  obj:205,stl:207,fbx:199,dwg:207,dxf:205,rvt:161,rfa:156,skp:199,
  rs:22,go:184,java:28,cpp:222,cs:261,sql:152,sh:124,bat:110,ps1:215
};
const abbreviations={jpeg:'JPG',docx:'DOC',xlsx:'XLS',pptx:'PPT',typescript:'TS',javascript:'JS'};
export function describeFileSymbol(item){
  if(item?.kind==='directory')return {folder:true,ext:'',label:'',hue:null,glyph:'folder'};
  const name=String(item?.name||''),match=/\.([a-z0-9]+)$/i.exec(name);
  const ext=match?match[1].toLowerCase():'';
  const known=Object.prototype.hasOwnProperty.call(hues,ext);
  const hue=known?hues[ext]:215; // Unrecognized file types stay muted, not random neon.
  const label=abbreviations[ext]||ext.toUpperCase().slice(0,4)||'FILE';
  const glyph=['png','jpg','jpeg','webp','gif','avif','bmp','svg'].includes(ext)?'image':
    ['mp4','mov','mkv','webm'].includes(ext)?'video':
    ['pdf'].includes(ext)?'file':
    ['mp3','wav','flac','m4a'].includes(ext)?'file':
    ['zip','rar','7z'].includes(ext)?'file':'file';
  return {folder:false,ext,label,hue,glyph,known};
}
export function sidePreviewKind(item,bytes){
  if(item?.kind==='directory')return 'folder';
  const ext=describeFileSymbol(item).ext;
  if(['png','jpg','jpeg','webp','gif','avif','bmp','svg'].includes(ext))return 'image';
  if(ext==='pdf')return 'pdf';
  if(ext==='url')return 'shortcut';
  if(['mp4','mov','webm'].includes(ext))return 'video';
  if(['mp3','wav','flac','m4a','ogg'].includes(ext))return 'audio';
  if(['txt','md','json','js','jsx','mjs','ts','tsx','css','html','htm','py','xml','yaml','yml','csv','svg','sh','sql'].includes(ext))return bytes<=1024*1024?'text':'large-text';
  return 'other';
}
