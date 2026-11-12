import test from 'node:test';
import assert from 'node:assert/strict';
import { KDTree } from '../src/index.js';

test('insert and query nearest in 2D', () => {
  const tree = new KDTree(2);
  tree.insert([1, 2]);
  tree.insert([4, 5]);
  tree.insert([7, 8]);
  const best = tree.nearest([3, 4]);
  assert.deepEqual(best, [4, 5]);
});

test('nearest on empty tree returns null', () => {
  const tree = new KDTree(2);
  assert.equal(tree.nearest([0, 0]), null);
});

test('range returns inclusive boundary points', () => {
  const tree = new KDTree(2);
  tree.insert([0, 0]);
  tree.insert([3, 4]);
  tree.insert([10, 10]);
  const points = tree.range([0, 0], 5);
  assert.equal(points.length, 2);
  assert.ok(points.some((p) => p[0] === 0 && p[1] === 0));
  assert.ok(points.some((p) => p[0] === 3 && p[1] === 4));
});

test('range with zero radius finds exact point', () => {
  const tree = new KDTree(2);
  tree.insert([1, 1]);
  tree.insert([1, 2]);
  const points = tree.range([1, 1], 0);
  assert.equal(points.length, 1);
  assert.deepEqual(points[0], [1, 1]);
});

test('remove deletes one occurrence', () => {
  const tree = new KDTree(2);
  tree.insert([1, 1]);
  tree.insert([1, 1]);
  assert.equal(tree.length, 2);
  assert.equal(tree.remove([1, 1]), true);
  assert.equal(tree.length, 1);
  assert.equal(tree.remove([1, 1]), true);
  assert.equal(tree.length, 0);
  assert.equal(tree.remove([1, 1]), false);
});

test('clear empties the tree', () => {
  const tree = new KDTree(2);
  tree.insert([1, 2]);
  tree.clear();
  assert.equal(tree.length, 0);
  assert.equal(tree.nearest([0, 0]), null);
});

test('insert validates point shape', () => {
  const tree = new KDTree(3);
  assert.throws(() => tree.insert([1, 2]), TypeError);
  assert.throws(() => tree.insert([1, 2, 'x']), TypeError);
  assert.throws(() => tree.insert([1, 2, NaN]), TypeError);
});

test('nearest works in 3D', () => {
  const tree = new KDTree(3);
  tree.insert([1, 1, 1]);
  tree.insert([2, 2, 2]);
  tree.insert([10, 10, 10]);
  assert.deepEqual(tree.nearest([2, 2, 3]), [2, 2, 2]);
});

test('remove internal node keeps tree searchable', () => {
  const tree = new KDTree(2);
  const points = [[5, 5], [3, 3], [8, 8], [1, 1], [4, 4], [7, 7], [9, 9]];
  for (const p of points) tree.insert(p);
  assert.equal(tree.remove([5, 5]), true);
  assert.equal(tree.length, 6);
  assert.deepEqual(tree.nearest([5, 5]), [4, 4]);
  assert.deepEqual(tree.nearest([9, 9]), [9, 9]);
});

test('range on empty tree returns empty array', () => {
  const tree = new KDTree(2);
  assert.deepEqual(tree.range([0, 0], 10), []);
});

test('constructor rejects invalid dimensions', () => {
  assert.throws(() => new KDTree(0), RangeError);
  assert.throws(() => new KDTree(-1), RangeError);
  assert.throws(() => new KDTree(1.5), RangeError);
});
