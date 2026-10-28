import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG_WRITE_LOCK,withCatalogWriteLock} from '../src/catalog-write-lock.mjs';
import {CATALOG_JOURNAL,commitCatalogTransaction,resumeCatalogTransaction} from '../src/catalog-transactions.mjs';

function queuedLocks(){
  let tail=Promise.resolve();
  const requests=[];
  return {requests,request(name,options,callback){
    requests.push({name,mode:options.mode});
    const previous=tail;
    let release;
    tail=new Promise(resolve=>{release=resolve;});
    return previous.then(async()=>{try{return await callback({name});}finally{release();}});
  }};
}
class CatalogDirectory{
  constructor(){
    this.files=new Map([['catalog.json',JSON.stringify({id:'catalog-lock-test',code:'ab',nextSequence:1})]]);
    this.writes=[];
  }
  async getFileHandle(name,{create=false}={}){
    if(!this.files.has(name)){
      if(!create)throw Object.assign(Error('Missing'),{name:'NotFoundError'});
      this.files.set(name,'');
    }
    return {getFile:async()=>({text:async()=>this.files.get(name)}),
      createWritable:async()=>{let content;return {
        write:async value=>{content=value;},
        close:async()=>{this.files.set(name,content);this.writes.push(name);},
        abort:async()=>{}
      };}};
  }
  async getDirectoryHandle(){
    throw Object.assign(Error('Missing'),{name:'NotFoundError'});
  }
  async *entries(){for(const name of this.files.keys())yield [name,{kind:'file'}];}
  async removeEntry(name){if(!this.files.delete(name))throw Object.assign(Error('Missing'),{name:'NotFoundError'});}
}
const change={path:'tags.json',before:null,after:[{id:'t1',name:'Timber',parentId:null}]};
const commit=(handle,locks)=>commitCatalogTransaction({
  handle,catalogId:'catalog-lock-test',changes:[change],transactionId:crypto.randomUUID(),locks
});

test('Catalog lock serializes queued work and releases after a rejected writer',async()=>{
  const locks=queuedLocks(),order=[];
  let unblock;
  const held=withCatalogWriteLock(async()=>{
    order.push('first start');
    await new Promise(resolve=>{unblock=resolve;});
    order.push('first end');
  },{locks});
  await Promise.resolve();await Promise.resolve();
  const next=withCatalogWriteLock(()=>{order.push('second');return 42;},{locks});
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(order,['first start']);
  unblock();
  assert.equal(await next,42);await held;
  assert.deepEqual(order,['first start','first end','second']);
  assert.deepEqual(locks.requests,[{name:CATALOG_WRITE_LOCK,mode:'exclusive'},{name:CATALOG_WRITE_LOCK,mode:'exclusive'}]);
});

test('two Catalog writers with stale snapshots serialize before journal creation',async()=>{
  const locks=queuedLocks(),handle=new CatalogDirectory();
  let unblock;
  const held=withCatalogWriteLock(()=>new Promise(resolve=>{unblock=resolve;}),{locks});
  await Promise.resolve();await Promise.resolve();
  const first=commit(handle,locks);
  const second=commit(handle,locks);
  await Promise.resolve();await Promise.resolve();
  assert.equal(handle.files.has(CATALOG_JOURNAL),false);
  assert.deepEqual(handle.writes,[]);
  unblock();await held;
  assert.equal(await first,1);
  await assert.rejects(second,/changed on disk/);
  assert.deepEqual(JSON.parse(handle.files.get('tags.json')),change.after);
  assert.equal(handle.files.has(CATALOG_JOURNAL),false);
  assert.deepEqual(handle.writes,[CATALOG_JOURNAL,'tags.json']);
});

test('explicit recovery also takes the same lock and clears the verified journal',async()=>{
  const locks=queuedLocks(),handle=new CatalogDirectory();
  const journal={formatVersion:1,id:'tx-recover',catalogId:'catalog-lock-test',
    createdAt:'2026-10-29T00:00:00Z',changes:[change]};
  handle.files.set(CATALOG_JOURNAL,JSON.stringify(journal));
  let unblock;
  const held=withCatalogWriteLock(()=>new Promise(resolve=>{unblock=resolve;}),{locks});
  await Promise.resolve();await Promise.resolve();
  const resumed=resumeCatalogTransaction(handle,'catalog-lock-test',{locks});
  await Promise.resolve();await Promise.resolve();
  assert.equal(handle.files.has('tags.json'),false);
  unblock();await held;
  assert.equal(await resumed,1);
  assert.deepEqual(JSON.parse(handle.files.get('tags.json')),change.after);
  assert.equal(handle.files.has(CATALOG_JOURNAL),false);
});

test('unsupported Web Locks retains journal guards; supported but denied locks fail closed',async()=>{
  const handle=new CatalogDirectory();
  assert.equal(await commit(handle,null),1);
  const denied=new CatalogDirectory();
  await assert.rejects(commit(denied,{request:async()=>{throw Error('Lock denied');}}),/Lock denied/);
  assert.deepEqual(denied.writes,[]);
  await assert.rejects(withCatalogWriteLock(null,{locks:null}),/required/);
  await assert.rejects(withCatalogWriteLock(()=>42,{locks:{request:async(_n,_o,fn)=>fn(null)}}),/not granted/);
});
