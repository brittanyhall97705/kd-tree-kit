# kd-tree-kit

A dependency-free KD-tree for multidimensional points, with nearest-neighbour and radius search.

```js
import { KDTree } from './src/index.js';

const tree = new KDTree(2); // two-dimensional points
tree.insert([1, 2]);
tree.insert([4, 5]);
tree.insert([7, 8]);

tree.nearest([3, 4]);   // [4, 5]
tree.range([0, 0], 5);  // [[1, 2], [4, 5]]
tree.remove([4, 5]);    // true
tree.length;            // 2
```

## Why this exists

A KD-tree is the standard way to answer nearest-neighbour and range queries
without scanning every point. This library keeps the implementation small
enough to read in one sitting: no rebalancing, no bulk loading, no deletion
by index. The trade-off is that a pathologically unbalanced insertion order
can degrade queries to linear time. For the common case of reasonably
distributed points it is fast and the code stays honest.

## The awkward edge

Points are stored by reference. `remove` compares by value, but if you insert
the same array twice it counts twice and one `remove` call removes only one
occurrence. Mutating a point after insertion will corrupt the tree's ordering
invariants; treat stored arrays as immutable.

## API

- `new KDTree(dimensions = 2)` — dimensions must be a positive integer.
- `insert(point)` — point is an array of `dimensions` finite numbers.
- `nearest(target)` — returns the closest stored point, or `null` if empty.
- `range(target, radius)` — returns points within `radius` (inclusive).
- `remove(point)` — removes one value-equal point, returns `true` if removed.
- `clear()` — removes all points.
- `length` — number of stored points.
