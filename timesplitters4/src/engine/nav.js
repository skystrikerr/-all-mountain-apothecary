// Grid navigation for bots. The level is sampled into 2.5D cells (one walkable floor height per cell),
// connected 8-ways when the height difference is climbable. A* + line-of-walk smoothing.

export class NavGrid {
  /**
   * @param {import('./collision.js').CollisionWorld} world
   * @param {{minX:number,minZ:number,maxX:number,maxZ:number}} bounds
   */
  constructor(world, bounds, opts = {}) {
    this.world = world;
    this.cell = opts.cell ?? 1;
    this.agentRadius = opts.agentRadius ?? 0.45;
    this.agentHeight = opts.agentHeight ?? 1.7;
    this.maxFloor = opts.maxFloor ?? 0.6; // highest surface considered "floor"
    this.minFloor = opts.minFloor ?? -2;
    this.maxClimb = opts.maxClimb ?? 0.46;
    this.minX = bounds.minX; this.minZ = bounds.minZ;
    this.w = Math.ceil((bounds.maxX - bounds.minX) / this.cell);
    this.h = Math.ceil((bounds.maxZ - bounds.minZ) / this.cell);
    this.height = new Float32Array(this.w * this.h).fill(NaN);
    this.walk = new Uint8Array(this.w * this.h);
    this.blocked = opts.blocked ?? null; // optional fn(x,z) => bool (e.g. hazards)
    this._build();
    this._g = new Float32Array(this.w * this.h);
    this._f = new Float32Array(this.w * this.h);
    this._parent = new Int32Array(this.w * this.h);
    this._state = new Uint32Array(this.w * this.h); // search id stamp
    this._closed = new Uint32Array(this.w * this.h);
    this._search = 0;
  }

  _build() {
    const { world, cell } = this;
    const r = this.agentRadius;
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = this.minX + (i + 0.5) * cell;
        const z = this.minZ + (j + 0.5) * cell;
        const top = world.groundHeight(x, z, this.maxFloor, 0.05);
        if (!Number.isFinite(top) || top < this.minFloor) continue;
        // Clearance starts above step height: low obstacles next to a cell can be stepped onto, so they don't block it.
        if (!world.boxFree(x - r, top + this.maxClimb + 0.01, z - r, x + r, top + this.agentHeight, z + r)) continue;
        if (this.blocked && this.blocked(x, z)) continue;
        const idx = j * this.w + i;
        this.height[idx] = top;
        this.walk[idx] = 1;
      }
    }
  }

  idx(i, j) { return j * this.w + i; }
  inBounds(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h; }
  cellOf(x, z) { return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)]; }
  center(i, j) {
    const idx = this.idx(i, j);
    return { x: this.minX + (i + 0.5) * this.cell, y: this.height[idx], z: this.minZ + (j + 0.5) * this.cell };
  }
  isWalkable(i, j) { return this.inBounds(i, j) && this.walk[this.idx(i, j)] === 1; }

  /** Nearest walkable cell to a world position (BFS in rings). */
  nearest(x, z, maxRing = 12) {
    const [ci, cj] = this.cellOf(x, z);
    if (this.isWalkable(ci, cj)) return [ci, cj];
    for (let r = 1; r <= maxRing; r++) {
      let best = null, bestD = Infinity;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = ci + di, j = cj + dj;
          if (!this.isWalkable(i, j)) continue;
          const d = di * di + dj * dj;
          if (d < bestD) { bestD = d; best = [i, j]; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  randomWalkable(rng = Math.random) {
    for (let tries = 0; tries < 400; tries++) {
      const i = Math.floor(rng() * this.w), j = Math.floor(rng() * this.h);
      if (this.isWalkable(i, j)) return this.center(i, j);
    }
    return null;
  }

  _canStep(a, b) {
    return Math.abs(this.height[a] - this.height[b]) <= this.maxClimb;
  }

  /** A* from world pos to world pos. Returns array of {x,y,z} waypoints (smoothed) or null. */
  findPath(sx, sz, tx, tz, maxIter = 6000) {
    const s = this.nearest(sx, sz);
    const t = this.nearest(tx, tz);
    if (!s || !t) return null;
    const start = this.idx(s[0], s[1]), goal = this.idx(t[0], t[1]);
    const w = this.w;
    const id = ++this._search;
    const g = this._g, f = this._f, parent = this._parent, state = this._state, closed = this._closed;
    const heap = new MinHeap();
    g[start] = 0;
    f[start] = octile(s[0], s[1], t[0], t[1]);
    parent[start] = -1;
    state[start] = id;
    heap.push(start, f[start]);
    let found = false;
    let iter = 0;
    while (heap.size > 0 && iter++ < maxIter) {
      const cur = heap.pop();
      if (closed[cur] === id) continue;
      closed[cur] = id;
      if (cur === goal) { found = true; break; }
      const ci = cur % w, cj = (cur / w) | 0;
      for (let k = 0; k < 8; k++) {
        const di = DIRS[k * 2], dj = DIRS[k * 2 + 1];
        const ni = ci + di, nj = cj + dj;
        if (!this.isWalkable(ni, nj)) continue;
        const n = nj * w + ni;
        if (closed[n] === id) continue;
        if (!this._canStep(cur, n)) continue;
        if (di !== 0 && dj !== 0) {
          // no corner cutting
          if (!this.isWalkable(ci + di, cj) || !this.isWalkable(ci, cj + dj)) continue;
        }
        const cost = g[cur] + (di !== 0 && dj !== 0 ? 1.4142 : 1);
        if (state[n] !== id || cost < g[n]) {
          state[n] = id;
          g[n] = cost;
          parent[n] = cur;
          f[n] = cost + octile(ni, nj, t[0], t[1]);
          heap.push(n, f[n]);
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c !== -1; c = parent[c]) cells.push(c);
    cells.reverse();
    return this._smooth(cells, tx, tz);
  }

  _smooth(cells, tx, tz) {
    const w = this.w;
    const out = [];
    let anchor = 0;
    while (anchor < cells.length - 1) {
      let next = anchor + 1;
      for (let k = cells.length - 1; k > anchor + 1; k--) {
        if (this.walkLine(cells[anchor], cells[k])) { next = k; break; }
      }
      const c = cells[next];
      out.push(this.center(c % w, (c / w) | 0));
      anchor = next;
    }
    if (out.length === 0 && cells.length) {
      const c = cells[0];
      out.push(this.center(c % w, (c / w) | 0));
    }
    // Replace the last waypoint with the exact target when it's in the same cell.
    const last = out[out.length - 1];
    const [ti, tj] = this.cellOf(tx, tz);
    const lc = cells[cells.length - 1];
    if (lc % w === ti && ((lc / w) | 0) === tj) { last.x = tx; last.z = tz; }
    return out;
  }

  /** Grid supercover line test between two cell indices; all cells must be walkable & climbable. */
  walkLine(a, b) {
    const w = this.w;
    let x0 = a % w, y0 = (a / w) | 0;
    const x1 = b % w, y1 = (b / w) | 0;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let prev = a;
    for (let guard = 0; guard < 512; guard++) {
      const idx = y0 * w + x0;
      if (!this.walk[idx] || !this._canStep(prev, idx)) return false;
      // widen the check: neighbours must be walkable to keep the agent clear of walls
      if (!this.isWalkable(x0 + 1, y0) || !this.isWalkable(x0 - 1, y0) || !this.isWalkable(x0, y0 + 1) || !this.isWalkable(x0, y0 - 1)) {
        if (idx !== a && idx !== b) return false;
      }
      prev = idx;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = 2 * err;
      if (e2 > -dy && e2 < dx) {
        // diagonal step: require both side cells (supercover)
        if (!this.isWalkable(x0 + sx, y0) || !this.isWalkable(x0, y0 + sy)) return false;
      }
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return false;
  }
}

const DIRS = [1, 0, -1, 0, 0, 1, 0, -1, 1, 1, 1, -1, -1, 1, -1, -1];

function octile(ai, aj, bi, bj) {
  const dx = Math.abs(ai - bi), dy = Math.abs(aj - bj);
  return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy);
}

class MinHeap {
  // Stores (node, key) pairs so later key updates in the f-array can't break heap order.
  constructor() { this.n = []; this.k = []; }
  get size() { return this.n.length; }
  push(node, key) {
    const n = this.n, k = this.k;
    n.push(node); k.push(key);
    let i = n.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [n[p], n[i]] = [n[i], n[p]]; [k[p], k[i]] = [k[i], k[p]];
      i = p;
    }
  }
  pop() {
    const n = this.n, k = this.k;
    const top = n[0];
    const ln = n.pop(), lk = k.pop();
    if (n.length > 0) {
      n[0] = ln; k[0] = lk;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < n.length && k[l] < k[m]) m = l;
        if (r < n.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [n[m], n[i]] = [n[i], n[m]]; [k[m], k[i]] = [k[i], k[m]];
        i = m;
      }
    }
    return top;
  }
}
