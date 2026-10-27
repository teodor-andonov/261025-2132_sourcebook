'use strict';
// GitHub Actions ref hygiene: branch refs are disposable; main history is not.
// This function NEVER deletes a branch because of its name alone.
async function pruneMergedDevBranches({github,core,owner,repo}){
  const canonicalRepo=owner+'/'+repo;
  const closed=await github.paginate(github.rest.pulls.list,{
    owner,repo,state:'closed',base:'main',per_page:100
  });
  // Protect a branch if ANY open PR uses it, regardless of its target branch.
  const open=await github.paginate(github.rest.pulls.list,{
    owner,repo,state:'open',per_page:100
  });
  const protectedHeads=new Set(open
    .filter(pr=>pr.head.repo?.full_name===canonicalRepo)
    .map(pr=>pr.head.ref));
  const reviewed=new Set();
  let deleted=0,preserved=0;
  for(const pr of closed){
    const branch=pr.head?.ref;
    if(!pr.merged_at||typeof branch!=='string'||!branch.startsWith('dev/')||
      pr.head.repo?.full_name!==canonicalRepo||
      protectedHeads.has(branch)||reviewed.has(branch))continue;
    reviewed.add(branch);
    let actual;
    try{
      actual=await github.rest.git.getRef({owner,repo,ref:'heads/'+branch});
    }catch(error){
      if(error.status===404)continue;
      throw error;
    }
    if(actual.data.object.type!=='commit'||actual.data.object.sha!==pr.head.sha){
      core.info('Preserved changed branch '+branch+' (different from merged PR #'+pr.number+')');
      preserved++;continue;
    }
    // GitHub's deleteRef API has no atomic expected-SHA compare. A last-second
    // concurrent push may still race the guard; branch rulesets add protection.
    await github.rest.git.deleteRef({owner,repo,ref:'heads/'+branch});
    core.info('Deleted merged development branch '+branch+' (PR #'+pr.number+')');
    deleted++;
  }
  if(core.summary)await core.summary.addHeading('Merged development branch cleanup')
    .addRaw('Deleted: '+deleted+' · changed branches preserved: '+preserved).write();
  return {deleted,preserved};
}
module.exports={pruneMergedDevBranches};
