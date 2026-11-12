const DEFAULT_DIMENSIONS = 2;

/**
 * A KD-tree for multidimensional points.
 *
 * The tree stores points as arrays of numbers. The dimensionality is fixed
 * at construction time. Points are partitioned by alternating axes, which
 * gives O(log n) nearest-neighbour and range queries for well-distributed
 * data. We deliberately keep the implementation simple: no rebalancing, no
 * bulk loading, and no deletion. That keeps the code small and predictable.
 *
 * One awkward edge: points are compared and stored by reference identity
 * for equality checks in `remove`, but the tree never deduplicates points.
 * If you insert the same array twice it will appear twice; removing it once
 * removes only one occurrence.
 */
export class KDTree {
  /**
   * @param {number} [dimensions=2] Number of dimensions for every point.
   */
  constructor(dimensions = DEFAULT_DIMENSIONS) {
    if (!Number.isInteger(dimensions) || dimensions <= 0) {
      throw new RangeError('dimensions must be a positive integer');
    }
    this.dimensions = dimensions;
    this.root = null;
    this.size = 0;
  }

  /**
   * Insert a point into the tree.
   *
   * @param {number[]} point An array of exactly `dimensions` finite numbers.
   * @returns {boolean} True if the point was inserted.
   */
  insert(point) {
    this.#validatePoint(point);
    const node = { point, left: null, right: null };
    if (this.root === null) {
      this.root = node;
    } else {
      this.#insertNode(this.root, node, 0);
    }
    this.size += 1;
    return true;
  }

  /**
   * Find the nearest point to a target.
   *
   * @param {number[]} target The query point.
   * @returns {number[] | null} The closest stored point, or null if empty.
   */
  nearest(target) {
    this.#validatePoint(target);
    if (this.root === null) return null;
    let best = null;
    let bestDist = Infinity;
    const visit = (node, depth) => {
      if (node === null) return;
      const d = squaredDistance(node.point, target);
      if (d < bestDist) {
        bestDist = d;
        best = node.point;
      }
      const axis = depth % this.dimensions;
      const diff = target[axis] - node.point[axis];
      const near = diff < 0 ? node.left : node.right;
      const far = diff < 0 ? node.right : node.left;
      visit(near, depth + 1);
      // Only visit the far side if the splitting plane is closer than the
      // current best. This is the pruning step that makes the search fast.
      if (diff * diff < bestDist) {
        visit(far, depth + 1);
      }
    };
    visit(this.root, 0);
    return best;
  }

  /**
   * Return all points within a Euclidean radius of a target.
   *
   * The radius is inclusive: a point exactly `radius` away is returned.
   *
   * @param {number[]} target The query point.
   * @param {number} radius A non-negative finite number.
   * @returns {number[][]} Points inside the radius, in no particular order.
   */
  range(target, radius) {
    this.#validatePoint(target);
    if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0) {
      throw new RangeError('radius must be a non-negative finite number');
    }
    const result = [];
    if (this.root === null) return result;
    const r2 = radius * radius;
    const visit = (node, depth) => {
      if (node === null) return;
      const d = squaredDistance(node.point, target);
      if (d <= r2) {
        result.push(node.point);
      }
      const axis = depth % this.dimensions;
      const diff = target[axis] - node.point[axis];
      if (diff <= 0) {
        visit(node.left, depth + 1);
      }
      if (diff >= 0) {
        visit(node.right, depth + 1);
      }
      // When |diff| < radius the splitting plane is inside the search
      // ball, so both sides must be checked. The two conditions above
      // already cover that case without an extra branch.
    };
    visit(this.root, 0);
    return result;
  }

  /**
   * Remove one occurrence of a point from the tree.
   *
   * Equality is by value: every coordinate must match exactly. If the same
   * point was inserted multiple times, only one occurrence is removed.
   *
   * @param {number[]} point The point to remove.
   * @returns {boolean} True if a point was removed.
   */
  remove(point) {
    this.#validatePoint(point);
    const before = this.size;
    this.root = this.#removeNode(this.root, point, 0);
    return this.size < before;
  }

  /**
   * Remove every point from the tree.
   */
  clear() {
    this.root = null;
    this.size = 0;
  }

  /**
   * Number of points currently stored.
   *
   * @returns {number}
   */
  get length() {
    return this.size;
  }

  #validatePoint(point) {
    if (!Array.isArray(point) || point.length !== this.dimensions) {
      throw new TypeError(`point must be an array of length ${this.dimensions}`);
    }
    for (const v of point) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new TypeError('point coordinates must be finite numbers');
      }
    }
  }

  #insertNode(current, node, depth) {
    const axis = depth % this.dimensions;
    if (node.point[axis] < current.point[axis]) {
      if (current.left === null) {
        current.left = node;
      } else {
        this.#insertNode(current.left, node, depth + 1);
      }
    } else {
      if (current.right === null) {
        current.right = node;
      } else {
        this.#insertNode(current.right, node, depth + 1);
      }
    }
  }

  #removeNode(node, point, depth) {
    if (node === null) return null;
    if (pointsEqual(node.point, point)) {
      this.size -= 1;
      if (node.left === null && node.right === null) {
        return null;
      }
      if (node.left === null) {
        return node.right;
      }
      if (node.right === null) {
        return node.left;
      }
      // Replace with the smallest node on the right subtree along the
      // current axis. That preserves the ordering invariant for the
      // remaining left subtree.
      const axis = depth % this.dimensions;
      const successor = this.#findMin(node.right, axis, depth + 1);
      node.point = successor.point;
      node.right = this.#removeNode(node.right, successor.point, depth + 1);
      this.size += 1; // the recursive removal decremented for the successor
      return node;
    }
    const axis = depth % this.dimensions;
    if (point[axis] < node.point[axis]) {
      node.left = this.#removeNode(node.left, point, depth + 1);
    } else {
      node.right = this.#removeNode(node.right, point, depth + 1);
    }
    return node;
  }

  #findMin(node, axis, depth) {
    if (node.left === null && node.right === null) return node;
    const currentAxis = depth % this.dimensions;
    if (currentAxis === axis) {
      if (node.left === null) return node;
      return this.#findMin(node.left, axis, depth + 1);
    }
    let best = node;
    if (node.left !== null) {
      const leftBest = this.#findMin(node.left, axis, depth + 1);
      if (leftBest.point[axis] < best.point[axis]) best = leftBest;
    }
    if (node.right !== null) {
      const rightBest = this.#findMin(node.right, axis, depth + 1);
      if (rightBest.point[axis] < best.point[axis]) best = rightBest;
    }
    return best;
  }
}

function squaredDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

function pointsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
