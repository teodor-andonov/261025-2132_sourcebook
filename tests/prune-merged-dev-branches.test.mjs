import test from 'node:test';
import assert from 'node:assert/strict';
import mod from '../scripts/prune-merged-dev-branches.cjs';
const repo='teodor-andonov/261025-2132_sourcebook';
function pr(number,branch,merged=true,sha='sha1',same=true){
  return {number,merged_at:merged?'2026-10-27T19:00:00Z':null,
    head:{ref:branch,sha,repo:{full_name:same?repo:'somebody/fork'}}};
}
function fixture(closed,open=[],shaByBranch={}){
  const deleted=[],logs=[],reads=[];
  const gh={paginate:async(_fn,args)=>args.state==='closed'?closed:open,
    rest:{pulls:{list(){}},git:{
      async getRef({ref}){reads.push(ref);const sha=shaByBranch[ref];
        if(!sha)throw Object.assign(new Error('Not found'),{status:404});
        return {data:{object:{type:'commit',sha}}};
      },
      async deleteRef({ref}){deleted.push(ref);}
    }}};
  const core={info:m=>logs.push(m)};
  return {gh,core,deleted,reads,logs};
}
test('prunes only a merged, unchanged, same-repo dev branch',async()=>{
  const f=fixture([pr(1,'dev/261027-work')],[],{'heads/dev/261027-work':'sha1'});
  assert.deepEqual(await mod.pruneMergedDevBranches({github:f.gh,core:f.core,owner:'teodor-andonov',repo:'261025-2132_sourcebook'}),{deleted:1,preserved:0});
  assert.deepEqual(f.deleted,['heads/dev/261027-work']);
});
test('never deletes main, unrelated names, forks, closed-unmerged, or open branches',async()=>{
  const f=fixture([pr(1,'main'),pr(2,'feature/live'),pr(3,'dev/open'),pr(4,'dev/unmerged',false),pr(5,'dev/fork',true,'sha1',false)],[
    pr(8,'dev/open',false)
  ],{'heads/dev/open':'sha1','heads/dev/unmerged':'sha1','heads/dev/fork':'sha1'});
  await mod.pruneMergedDevBranches({github:f.gh,core:f.core,owner:'teodor-andonov',repo:'261025-2132_sourcebook'});
  assert.deepEqual(f.deleted,[]);
});
test('preserves branches changed after merge and tolerates already-deleted branches',async()=>{
  const f=fixture([pr(1,'dev/changed'),pr(2,'dev/old')],[],{'heads/dev/changed':'pushed-later'});
  const r=await mod.pruneMergedDevBranches({github:f.gh,core:f.core,owner:'teodor-andonov',repo:'261025-2132_sourcebook'});
  assert.deepEqual(r,{deleted:0,preserved:1});
  assert.deepEqual(f.deleted,[]);
});
test('duplicate merged PR references delete only once',async()=>{
  const f=fixture([pr(2,'dev/a'),pr(1,'dev/a')],[],{'heads/dev/a':'sha1'});
  await mod.pruneMergedDevBranches({github:f.gh,core:f.core,owner:'teodor-andonov',repo:'261025-2132_sourcebook'});
  assert.deepEqual(f.deleted,['heads/dev/a']);
});
test('API permission errors abort cleanup instead of claiming success',async()=>{
  const f=fixture([pr(1,'dev/x')],[],{'heads/dev/x':'sha1'});
  f.gh.rest.git.deleteRef=async()=>{throw Object.assign(new Error('Forbidden'),{status:403})};
  await assert.rejects(()=>mod.pruneMergedDevBranches({github:f.gh,core:f.core,owner:'teodor-andonov',repo:'261025-2132_sourcebook'}),/Forbidden/);
});
