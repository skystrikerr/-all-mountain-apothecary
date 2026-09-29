// Axis-aligned box collision world.
// Everything solid in a level is an AABB. Bodies are upright boxes (feet position + radius + height).
// A uniform XZ grid is used as a broadphase for both overlap queries and ray casts (2D DDA).

const EPS = 1e-4;

export class CollisionWorld {
  constructor(cellSize = 4) {
    this.cellSize = cellSize;
    this.solids = [];
    this.cells = new Map();
    this._stamp = 0;
  }

  static key(ix, iz) {
    return ix * 73856093 ^ iz * 19349663;
  }

  /** Add a solid. Returns the solid record. */
  add(minX, minY, minZ, maxX, maxY, maxZ, data = null) {
    const s = { minX, minY, minZ, maxX, maxY, maxZ, data, id: this.solids.length, stamp: 0, enabled: true };
    this.solids.push(s);
    const cs = this.cellSize;
    const x0 = Math.floor(minX / cs), x1 = Math.floor(maxX / cs);
    const z0 = Math.floor(minZ / cs), z1 = Math.floor(maxZ / cs);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = CollisionWorld.key(ix, iz);
        let list = this.cells.get(k);
        if (!list) { list = []; this.cells.set(k, list); }
        list.push(s);
      }
    }
    return s;
  }

  /** Collect enabled solids overlapping the given box (strict overlap). */
  query(minX, minY, minZ, maxX, maxY, maxZ, out = []) {
    out.length = 0;
    const stamp = ++this._stamp;
    const cs = this.cellSize;
    const x0 = Math.floor(minX / cs), x1 = Math.floor(maxX / cs);
    const z0 = Math.floor(minZ / cs), z1 = Math.floor(maxZ / cs);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const list = this.cells.get(CollisionWorld.key(ix, iz));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const s = list[i];
          if (s.stamp === stamp || !s.enabled) continue;
          s.stamp = stamp;
          if (s.maxX > minX && s.minX < maxX && s.maxY > minY && s.minY < maxY && s.maxZ > minZ && s.minZ < maxZ) {
            out.push(s);
          }
        }
      }
    }
    return out;
  }

  boxFree(minX, minY, minZ, maxX, maxY, maxZ) {
    return this.query(minX, minY, minZ, maxX, maxY, maxZ, _tmp).length === 0;
  }

  /**
   * Move an upright body through the world with axis-separated slide response and step-up.
   * body: { x, y, z, radius, height, onGround, stepHeight }
   * Returns flags of which axes collided.
   */
  moveBody(body, dx, dy, dz) {
    const r = body.radius;
    const maxStep = Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dy));
    const steps = Math.max(1, Math.ceil(maxStep / (r * 0.8)));
    const res = { hitX: false, hitY: false, hitZ: false, landed: false, ceiling: false };
    const sx = dx / steps, sy = dy / steps, sz = dz / steps;
    const wasGround = body.onGround;
    this.depenetrate(body);
    body.onGround = false;
    for (let i = 0; i < steps; i++) {
      if (sx !== 0) this._axis(body, 0, sx, res, wasGround);
      if (sz !== 0) this._axis(body, 2, sz, res, wasGround);
      this._axis(body, 1, sy, res, wasGround);
    }
    return res;
  }

  /** Push a body out of any solid it starts inside (smallest horizontal push, or up onto low solids). */
  depenetrate(body) {
    const r = body.radius, h = body.height;
    for (let iter = 0; iter < 4; iter++) {
      const hits = this.query(body.x - r, body.y, body.z - r, body.x + r, body.y + h, body.z + r, _hits);
      if (hits.length === 0) return;
      const s = hits[0];
      const opts = [
        [s.maxY - body.y, 1, 1],                 // up
        [body.x + r - s.minX, 0, -1],             // -x
        [s.maxX - (body.x - r), 0, 1],            // +x
        [body.z + r - s.minZ, 2, -1],             // -z
        [s.maxZ - (body.z - r), 2, 1],            // +z
      ];
      let best = null;
      for (const o of opts) {
        if (o[1] === 1 && o[0] > (body.stepHeight ?? 0.45) + 0.15) continue;
        if (!best || o[0] < best[0]) best = o;
      }
      if (!best) return;
      const d = (best[0] + EPS * 2) * best[2];
      if (best[1] === 0) body.x += d; else if (best[1] === 1) { body.y += d; body.onGround = true; } else body.z += d;
    }
  }

  _axis(body, axis, d, res, wasGround) {
    const r = body.radius, h = body.height;
    const old = axis === 0 ? body.x : axis === 1 ? body.y : body.z;
    if (axis === 0) body.x += d; else if (axis === 1) body.y += d; else body.z += d;
    const hits = this.query(body.x - r, body.y, body.z - r, body.x + r, body.y + h, body.z + r, _hits);
    if (hits.length === 0) return;
    const TOL = 0.02;
    if (axis === 1) {
      if (d <= 0) {
        let top = -Infinity;
        for (const s of hits) if (s.maxY <= old + TOL && s.maxY > top) top = s.maxY;
        if (top > -Infinity) { body.y = top + EPS; body.onGround = true; res.hitY = true; res.landed = true; }
      } else {
        let bottom = Infinity;
        for (const s of hits) if (s.minY >= old + h - TOL && s.minY < bottom) bottom = s.minY;
        if (bottom < Infinity) { body.y = bottom - h - EPS; res.hitY = true; res.ceiling = true; }
      }
      return;
    }
    // Horizontal: try stepping up onto low obstacles.
    const step = body.stepHeight ?? 0.45;
    if (wasGround || body.onGround) {
      let top = -Infinity;
      for (const s of hits) top = Math.max(top, s.maxY);
      const rise = top - body.y;
      if (rise > 0 && rise <= step &&
        this.boxFree(body.x - r, top + EPS, body.z - r, body.x + r, top + EPS + h, body.z + r)) {
        body.y = top + EPS;
        body.onGround = true;
        return;
      }
    }
    // Only solids that are ahead of where we were block us (never teleport through something we're already inside).
    if (axis === 0) {
      if (d > 0) { let m = Infinity; for (const s of hits) if (s.minX >= old + r - TOL) m = Math.min(m, s.minX); if (m < Infinity) { body.x = m - r - EPS; res.hitX = true; } }
      else { let m = -Infinity; for (const s of hits) if (s.maxX <= old - r + TOL) m = Math.max(m, s.maxX); if (m > -Infinity) { body.x = m + r + EPS; res.hitX = true; } }
    } else {
      if (d > 0) { let m = Infinity; for (const s of hits) if (s.minZ >= old + r - TOL) m = Math.min(m, s.minZ); if (m < Infinity) { body.z = m - r - EPS; res.hitZ = true; } }
      else { let m = -Infinity; for (const s of hits) if (s.maxZ <= old - r + TOL) m = Math.max(m, s.maxZ); if (m > -Infinity) { body.z = m + r + EPS; res.hitZ = true; } }
    }
  }

  /**
   * Ray cast against solids. dir must be normalized.
   * Returns { t, nx, ny, nz, solid } or null.
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    const cs = this.cellSize;
    let ix = Math.floor(ox / cs), iz = Math.floor(oz / cs);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(cs / dx) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(cs / dz) : Infinity;
    let tMaxX = dx !== 0 ? ((dx > 0 ? (ix + 1) * cs - ox : ox - ix * cs) / Math.abs(dx)) : Infinity;
    let tMaxZ = dz !== 0 ? ((dz > 0 ? (iz + 1) * cs - oz : oz - iz * cs) / Math.abs(dz)) : Infinity;
    const stamp = ++this._stamp;
    let best = null;
    let bestT = maxDist;
    let tCell = 0;
    const invX = 1 / dx, invY = 1 / dy, invZ = 1 / dz;
    for (let guard = 0; guard < 4096; guard++) {
      const list = this.cells.get(CollisionWorld.key(ix, iz));
      if (list) {
        for (let i = 0; i < list.length; i++) {
          const s = list[i];
          if (s.stamp === stamp || !s.enabled) continue;
          s.stamp = stamp;
          const hit = rayBox(ox, oy, oz, invX, invY, invZ, s, bestT);
          if (hit) { bestT = hit.t; best = { t: hit.t, nx: hit.nx, ny: hit.ny, nz: hit.nz, solid: s }; }
        }
      }
      const tNext = Math.min(tMaxX, tMaxZ);
      if (best && best.t <= tNext) break;
      tCell = tNext;
      if (tCell > bestT) break;
      if (tMaxX < tMaxZ) { ix += stepX; tMaxX += tDeltaX; } else { iz += stepZ; tMaxZ += tDeltaZ; }
    }
    return best;
  }

  /** True if the segment between two points is unobstructed. */
  lineOfSight(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return true;
    return this.raycast(ax, ay, az, dx / len, dy / len, dz / len, len) === null;
  }

  /** Highest solid top at (x,z) that is at or below maxY. */
  groundHeight(x, z, maxY = 100, radius = 0) {
    const hits = this.query(x - radius - EPS, -1000, z - radius - EPS, x + radius + EPS, maxY, z + radius + EPS, _hits);
    let top = -Infinity;
    for (const s of hits) if (s.maxY <= maxY + EPS && s.maxY > top) top = s.maxY;
    return top;
  }
}

const _tmp = [];
const _hits = [];

/** Slab test. Returns {t, nx, ny, nz} for the entry point, or null. */
export function rayBox(ox, oy, oz, invX, invY, invZ, b, maxT) {
  let tmin = 0, tmax = maxT;
  let nx = 0, ny = 0, nz = 0;
  // X
  let t1 = (b.minX - ox) * invX, t2 = (b.maxX - ox) * invX;
  let n = -1;
  if (t1 > t2) { const t = t1; t1 = t2; t2 = t; n = 1; }
  if (Number.isNaN(t1)) { t1 = -Infinity; t2 = Infinity; }
  if (t1 > tmin) { tmin = t1; nx = n; ny = 0; nz = 0; }
  if (t2 < tmax) tmax = t2;
  if (tmin > tmax) return null;
  // Y
  t1 = (b.minY - oy) * invY; t2 = (b.maxY - oy) * invY; n = -1;
  if (t1 > t2) { const t = t1; t1 = t2; t2 = t; n = 1; }
  if (Number.isNaN(t1)) { t1 = -Infinity; t2 = Infinity; }
  if (t1 > tmin) { tmin = t1; nx = 0; ny = n; nz = 0; }
  if (t2 < tmax) tmax = t2;
  if (tmin > tmax) return null;
  // Z
  t1 = (b.minZ - oz) * invZ; t2 = (b.maxZ - oz) * invZ; n = -1;
  if (t1 > t2) { const t = t1; t1 = t2; t2 = t; n = 1; }
  if (Number.isNaN(t1)) { t1 = -Infinity; t2 = Infinity; }
  if (t1 > tmin) { tmin = t1; nx = 0; ny = 0; nz = n; }
  if (t2 < tmax) tmax = t2;
  if (tmin > tmax) return null;
  if (tmin === 0 && nx === 0 && ny === 0 && nz === 0) {
    // Origin inside the box.
    return { t: 0, nx: 0, ny: 1, nz: 0 };
  }
  return { t: tmin, nx, ny, nz };
}
