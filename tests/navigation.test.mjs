import test from 'node:test';
import assert from 'node:assert/strict';
import {nextSelectionIndex as next} from '../src/navigation.mjs';
test('no items',()=>assert.equal(next(-1,'ArrowRight',0,4),-1));
test('first arrow selects first item',()=>assert.equal(next(-1,'ArrowRight',8,4),0));
test('horizontal movement clamps at edges',()=>{
  assert.equal(next(0,'ArrowLeft',8,4),0);
  assert.equal(next(7,'ArrowRight',8,4),7);
});
test('vertical movement follows gallery column count',()=>{
  assert.equal(next(2,'ArrowDown',12,4),6);
  assert.equal(next(7,'ArrowUp',12,4),3);
});
test('vertical movement clamps in incomplete last row',()=>assert.equal(next(8,'ArrowDown',10,4),9));
test('list view vertical movement is one',()=>assert.equal(next(3,'ArrowDown',10,1),4));
test('Home and End target visible bounds',()=>{
  assert.equal(next(6,'Home',10,3),0);
  assert.equal(next(1,'End',10,3),9);
});

import {selectionRangeIds} from '../src/navigation.mjs';
test('Shift selection uses only filtered visible items and falls back safely when anchor is hidden',()=>{
  const visible=[{id:'a'},{id:'c'},{id:'f'}];
  assert.deepEqual(selectionRangeIds(visible,'a','f'),['a','c','f']);
  assert.deepEqual(selectionRangeIds(visible,'f','a'),['a','c','f']);
  assert.deepEqual(selectionRangeIds(visible,'b','f'),['f']);
  assert.deepEqual(selectionRangeIds(visible,'a','hidden'),[]);
});
