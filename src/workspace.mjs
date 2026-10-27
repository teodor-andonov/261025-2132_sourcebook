// Standalone browsing has no catalog, identities or metadata-writing privileges.
export const PLAIN_ROOT_ID='plain-root';
export function plainRoot(handle){
  if(!handle||handle.kind!=='directory'||typeof handle.entries!=='function')throw TypeError('A readable directory is required');
  return {id:PLAIN_ROOT_ID,name:String(handle.name||'Folder')};
}
