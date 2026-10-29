import test from 'node:test';
import assert from 'node:assert/strict';
import {RESOURCE_PAGE_SIZE,pageWindow,pageForIndex} from '../src/resource-paging.mjs';
test('empty and single-page lists remain bounded',()=>{
  assert.equal(RESOURCE_PAGE_SIZE,150);
  assert.deepEqual(pageWindow(0),{start:0,end:0,page:1,pages:1,total:0,hasPrevious:false,hasNext:false});
  assert.deepEqual(pageWindow(25,500),{start:0,end:25,page:1,pages:1,total:25,hasPrevious:false,hasNext:false});
});
test('large listings render only one page, including the final partial page',()=>{
  const first=pageWindow(20000);
  assert.equal(first.end-first.start,150);assert.equal(first.pages,134);assert.equal(first.hasNext,true);
  const middle=pageWindow(325,150);
  assert.equal(middle.start,150);assert.equal(middle.end,300);assert.equal(middle.page,2);
  const last=pageWindow(325,300);
  assert.equal(last.start,300);assert.equal(last.end,325);assert.equal(last.page,3);
  assert.equal(last.hasNext,false);assert.equal(last.hasPrevious,true);
  assert.equal(pageWindow(325,999999).start,300);
});
test('keyboard index targets its own page without rendering preceding pages',()=>{
  assert.equal(pageForIndex(325,0).start,0);
  assert.equal(pageForIndex(325,150).start,150);
  assert.equal(pageForIndex(325,324).start,300);
  assert.throws(()=>pageForIndex(325,325),/outside listing/);
  assert.throws(()=>pageForIndex(0,0),/outside listing/);
});
test('invalid counts, offsets and sizes fail closed',()=>{
  for(const args of [[-1],[NaN],[1,-1],[1,0,0],[1,0,1001],[1,0,1.5]])
    assert.throws(()=>pageWindow(...args),/Invalid resource page/);
});
