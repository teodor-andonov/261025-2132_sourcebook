import {catalogFileType} from './catalog-search.mjs';
export const TABLE_COLUMNS=[
  {key:'name',label:'Name'},{key:'type',label:'Type'},{key:'source',label:'Source'},
  {key:'location',label:'Location'},{key:'tags',label:'Tags'},
  {key:'notes',label:'Notes'},{key:'status',label:'Status'},{key:'id',label:'ID'}
];
export const DEFAULT_TABLE_COLUMNS=['name','type','location','tags','status'];
export function normalizeTableColumns(columns=DEFAULT_TABLE_COLUMNS){
  if(!Array.isArray(columns)||!columns.includes('name')||columns.length>TABLE_COLUMNS.length||new Set(columns).size!==columns.length||columns.some(key=>!TABLE_COLUMNS.some(column=>column.key===key)))throw Error('Invalid View table columns');
  return TABLE_COLUMNS.filter(col=>columns.includes(col.key)).map(col=>col.key);
}

// Pure presentation grouping. Never alters catalog records or source files.
export const VIEW_GROUPS=['none','source','folder','type'];
export function groupViewItems(items,groupBy='none'){
  if(!VIEW_GROUPS.includes(groupBy))throw Error('Invalid View grouping');
  if(!Array.isArray(items))throw Error('Invalid View items');
  if(groupBy==='none')return [{key:'all',label:'',items:[...items]}];
  const groups=new Map();
  for(const item of items){
    const sourceName=String(item?.sourceName||'Current folder');
    const folder=item?.parts?.length?item.parts.join(' / '):'';
    let key,label;
    if(groupBy==='source'){key='source:'+(item?.sourceId||'local');label=sourceName;}
    else if(groupBy==='folder'){key='folder:'+(item?.sourceId||'local')+'/'+(item?.parts||[]).join('/');label=sourceName+(folder?' / '+folder:'');}
    else{
      const kind=item?.kind==='directory'?'Folders':(/\.[^.]+$/.test(item?.name||'')?'.'+item.name.split('.').at(-1).toLocaleLowerCase():'Other files');
      key='type:'+kind;label=kind;
    }
    if(!groups.has(key))groups.set(key,{key,label,items:[]});
    groups.get(key).items.push(item);
  }
  const cmp=(a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true,sensitivity:'base'})||a.key.localeCompare(b.key);
  return [...groups.values()].sort(cmp);
}

export function viewTableMetadata(item,paths=[]){
  const type=catalogFileType(item);
  const ext=type==='other'&&String(item?.name||'').includes('.')?'.'+item.name.split('.').at(-1).toLowerCase():'';
  const label={folder:'Folder',image:'Image',pdf:'PDF',video:'Video'}[type]||ext||'File';
  const location=item?.location||'—';
  const tags=[...paths].map(x=>String(x).split(' / ').at(-1)).filter(Boolean);
  const status=item?.changedKind?'Type changed':item?.missing?'Missing':item?.staleIndex?'Cached · refresh':item?.unobjectified?'Not cataloged':'';
  return {type:label,location,tags,status,source:String(item?.sourceName||'—'),notes:String(item?.record?.notes||''),id:String(item?.record?.id||'')};
}
