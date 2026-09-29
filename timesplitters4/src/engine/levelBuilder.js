// LevelBuilder: a tiny DSL for blocking out levels from boxes.
// Every box can be solid (added to the CollisionWorld) and/or visible (merged into one mesh per material
// with world-space UVs so textures tile consistently). Levels also register lights, spawns, pickups,
// enemies, triggers and scripted objects which the game layer consumes.
import * as THREE from 'three';
import { CollisionWorld } from './collision.js';
import { bakedMaterial, radialTexture } from './textures.js';
import { bakeVertexColors } from './lightBaker.js';

const TRIM = { tex: 'wood', opts: { base: '#3a2414' }, scale: 1 };

export class LevelBuilder {
  constructor(meta = {}) {
    this.meta = meta;
    this.world = new CollisionWorld(4);
    this.group = new THREE.Group();
    this.batches = new Map(); // spec key -> {spec, pos:[], nrm:[], uv:[], idx:[]}
    this.bakeGrid = meta.bakeGrid ?? 1.0; // tessellation size (m) for vertex light baking
    this.lights = [];
    this.spawns = [];      // {x,y,z,yaw,team}
    this.pickups = [];     // {type, id, x,y,z, respawn}
    this.enemies = [];     // {x,z,yaw, weapon, character, group, patrol, boss, ...}
    this.triggers = [];    // {name, minX..maxZ}
    this.markers = {};     // named points
    this.bases = [];       // capture-the-bag bases {team, x,y,z}
    this.animated = [];    // objects with update(dt, t)
    this.bounds = { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity };
  }

  _grow(x1, z1, x2, z2) {
    const b = this.bounds;
    b.minX = Math.min(b.minX, x1); b.minZ = Math.min(b.minZ, z1);
    b.maxX = Math.max(b.maxX, x2); b.maxZ = Math.max(b.maxZ, z2);
  }

  /** Axis-aligned box from min to max corners. */
  box(x1, y1, z1, x2, y2, z2, mat, opts = {}) {
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
    let solid = null;
    if (opts.solid !== false) {
      solid = this.world.add(minX, minY, minZ, maxX, maxY, maxZ, opts.tag ? { tag: opts.tag } : null);
      this._grow(minX, minZ, maxX, maxZ);
    }
    if (opts.visible !== false && mat) this._addBoxGeometry(minX, minY, minZ, maxX, maxY, maxZ, mat, opts);
    return solid;
  }

  /** Box centred on (cx, cz) with its bottom at y. */
  boxC(cx, y, cz, w, h, d, mat, opts) {
    return this.box(cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2, mat, opts);
  }

  floor(x1, z1, x2, z2, mat, y = 0, thick = 0.5, opts = {}) {
    return this.box(x1, y - thick, z1, x2, y, z2, mat, { skip: ['ny'], ...opts });
  }

  ceiling(x1, z1, x2, z2, y, mat, thick = 0.3) {
    return this.box(x1, y, z1, x2, y + thick, z2, mat, { skip: ['py'] });
  }

  /**
   * Wall running along X at depth z, from x1 to x2, with optional door gaps [{at, w, h}].
   */
  wallX(z, x1, x2, { h = 4, t = 0.4, mat, doors = [], y = 0, trim = TRIM } = {}) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    const gaps = doors.map((d) => ({ s: d.at - d.w / 2, e: d.at + d.w / 2, h: d.h ?? 2.8 })).sort((p, q) => p.s - q.s);
    let cur = a;
    const seg = (s0, s1) => {
      this.box(s0, y, z - t / 2, s1, y + h, z + t / 2, mat);
      if (trim) this.box(s0, y, z - t / 2 - 0.035, s1, y + 0.16, z + t / 2 + 0.035, trim, { solid: false });
    };
    for (const g of gaps) {
      if (g.s > cur) seg(cur, g.s);
      if (g.h < h) this.box(g.s, y + g.h, z - t / 2, g.e, y + h, z + t / 2, mat);
      if (trim) this._doorFrame('x', z, t, g, y);
      cur = g.e;
    }
    if (cur < b) seg(cur, b);
  }

  wallZ(x, z1, z2, { h = 4, t = 0.4, mat, doors = [], y = 0, trim = TRIM } = {}) {
    const a = Math.min(z1, z2), b = Math.max(z1, z2);
    const gaps = doors.map((d) => ({ s: d.at - d.w / 2, e: d.at + d.w / 2, h: d.h ?? 2.8 })).sort((p, q) => p.s - q.s);
    let cur = a;
    const seg = (s0, s1) => {
      this.box(x - t / 2, y, s0, x + t / 2, y + h, s1, mat);
      if (trim) this.box(x - t / 2 - 0.035, y, s0, x + t / 2 + 0.035, y + 0.16, s1, trim, { solid: false });
    };
    for (const g of gaps) {
      if (g.s > cur) seg(cur, g.s);
      if (g.h < h) this.box(x - t / 2, y + g.h, g.s, x + t / 2, y + h, g.e, mat);
      if (trim) this._doorFrame('z', x, t, g, y);
      cur = g.e;
    }
    if (cur < b) seg(cur, b);
  }

  /** Door casing (two jambs + lintel) around a wall gap, both sides, decorative only. */
  _doorFrame(axis, c, t, g, y) {
    const w = 0.13, p = 0.05, hh = g.h;
    const half = t / 2 + p;
    if (axis === 'x') {
      this.box(g.s - w, y, c - half, g.s, y + hh + w, c + half, TRIM, { solid: false });
      this.box(g.e, y, c - half, g.e + w, y + hh + w, c + half, TRIM, { solid: false });
      this.box(g.s, y + hh, c - half, g.e, y + hh + w, c + half, TRIM, { solid: false });
    } else {
      this.box(c - half, y, g.s - w, c + half, y + hh + w, g.s, TRIM, { solid: false });
      this.box(c - half, y, g.e, c + half, y + hh + w, g.e + w, TRIM, { solid: false });
      this.box(c - half, y + hh, g.s, c + half, y + hh + w, g.e, TRIM, { solid: false });
    }
  }

  /** Stairs rising along +dir ('x+','x-','z+','z-'), starting at (x,z) edge, width across. */
  stairs(x, z, dir, width, steps, stepH, stepD, mat, y = 0) {
    for (let i = 0; i < steps; i++) {
      const top = y + stepH * (i + 1);
      const o = i * stepD;
      switch (dir) {
        case 'x+': this.box(x + o, y, z - width / 2, x + o + stepD, top, z + width / 2, mat); break;
        case 'x-': this.box(x - o - stepD, y, z - width / 2, x - o, top, z + width / 2, mat); break;
        case 'z+': this.box(x - width / 2, y, z + o, x + width / 2, top, z + o + stepD, mat); break;
        case 'z-': this.box(x - width / 2, y, z - o - stepD, x + width / 2, top, z - o, mat); break;
      }
    }
  }

  /** Cylinder rendered round (merged into the baked level mesh) but colliding as its bounding box. */
  cylinder(cx, y, cz, r, h, mat, { solid = true, segments = 12, rTop } = {}) {
    const geo = new THREE.CylinderGeometry(rTop ?? r, r, h, segments, Math.max(1, Math.round(h / this.bakeGrid)));
    geo.translate(cx, y + h / 2, cz);
    const b = this._batch(mat);
    const sc = mat.scale ?? 0.5;
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
    const base = b.pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      b.pos.push(P.getX(i), P.getY(i), P.getZ(i));
      b.nrm.push(N.getX(i), N.getY(i), N.getZ(i));
      b.uv.push(U.getX(i) * r * 6.28 * sc, U.getY(i) * h * sc);
    }
    const idx = geo.index.array;
    for (let i = 0; i < idx.length; i++) b.idx.push(base + idx[i]);
    geo.dispose();
    if (solid) this.box(cx - r, y, cz - r, cx + r, y + h, cz + r, null, { visible: false });
  }

  /** Add an arbitrary decorative Object3D. */
  prop(obj) { this.group.add(obj); return obj; }

  light({ type = 'point', x = 0, y = 3, z = 0, color = 0xffffff, intensity = 1, distance = 14, decay = 1, flicker = 0, glow = true } = {}) {
    let l;
    if (type === 'point') l = new THREE.PointLight(color, intensity, distance, decay);
    else if (type === 'spot') { l = new THREE.SpotLight(color, intensity, distance, Math.PI / 4, 0.5, decay); l.target.position.set(x, 0, z); this.group.add(l.target); }
    l.position.set(x, y, z);
    l.userData.baseIntensity = intensity;
    l.userData.flicker = flicker;
    if (glow) {
      // PS2-style light halo
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)', 64, 'rgba(255,255,255,0.25)'),
        color: new THREE.Color(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55,
      }));
      sp.position.set(x, y, z);
      sp.scale.setScalar(Math.min(3.2, 0.6 + intensity * 0.14));
      this.group.add(sp);
      l.userData.glow = sp;
    }
    this.group.add(l);
    this.lights.push(l);
    return l;
  }

  spawn(x, y, z, yaw = 0, team = -1) { this.spawns.push({ x, y, z, yaw, team }); }
  pickup(type, id, x, y, z, respawn = 20) { this.pickups.push({ type, id, x, y, z, respawn }); }
  enemy(e) { this.enemies.push(e); }
  trigger(name, x1, z1, x2, z2, y1 = -5, y2 = 10) {
    this.triggers.push({ name, minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2), minY: y1, maxY: y2 });
  }
  marker(name, x, y, z, extra = {}) { this.markers[name] = { x, y, z, ...extra }; }
  base(team, x, y, z) { this.bases.push({ team, x, y, z }); }

  _batch(spec) {
    const key = JSON.stringify(spec);
    let b = this.batches.get(key);
    if (!b) { b = { spec, pos: [], nrm: [], uv: [], idx: [] }; this.batches.set(key, b); }
    return b;
  }

  _addBoxGeometry(minX, minY, minZ, maxX, maxY, maxZ, matSpec, opts) {
    const b = this._batch(matSpec);
    const s = (opts.uvScale ?? matSpec.scale ?? 0.5);
    const skip = opts.skip || [];
    const grid = this.bakeGrid;
    const faces = [
      // name, normal, 4 corners (counter-clockwise from outside), uv axes
      ['px', [1, 0, 0], [[maxX, minY, maxZ], [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ]], (p) => [-p[2], p[1]]],
      ['nx', [-1, 0, 0], [[minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ]], (p) => [p[2], p[1]]],
      ['py', [0, 1, 0], [[minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ], [minX, maxY, minZ]], (p) => [p[0], -p[2]]],
      ['ny', [0, -1, 0], [[minX, minY, minZ], [maxX, minY, minZ], [maxX, minY, maxZ], [minX, minY, maxZ]], (p) => [p[0], p[2]]],
      ['pz', [0, 0, 1], [[minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ]], (p) => [p[0], p[1]]],
      ['nz', [0, 0, -1], [[maxX, minY, minZ], [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ]], (p) => [-p[0], p[1]]],
    ];
    for (const [name, n, c, uvf] of faces) {
      if (skip.includes(name)) continue;
      // Tessellate big faces into ~grid-sized quads so baked vertex lighting has resolution.
      const lu = Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1], c[1][2] - c[0][2]);
      const lv = Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1], c[3][2] - c[0][2]);
      const nu = Math.min(64, Math.max(1, Math.round(lu / grid)));
      const nv = Math.min(64, Math.max(1, Math.round(lv / grid)));
      const base = b.pos.length / 3;
      for (let j = 0; j <= nv; j++) {
        const fv = j / nv;
        for (let i = 0; i <= nu; i++) {
          const fu = i / nu;
          const p = [0, 1, 2].map((k) => c[0][k] + (c[1][k] - c[0][k]) * fu + (c[3][k] - c[0][k]) * fv);
          b.pos.push(p[0], p[1], p[2]);
          b.nrm.push(n[0], n[1], n[2]);
          const [u, v] = uvf(p);
          b.uv.push(u * s, v * s);
        }
      }
      for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
          const a0 = base + j * (nu + 1) + i, a1 = a0 + 1, a3 = a0 + nu + 1, a2 = a3 + 1;
          b.idx.push(a0, a1, a2, a0, a2, a3);
        }
      }
    }
  }

  /**
   * Finalise into a level object consumed by the game.
   * With `env` the static lighting is baked into vertex colours (PS2-style); without it (tests) surfaces are
   * left full-bright.
   */
  finish({ env = null } = {}) {
    for (const b of this.batches.values()) {
      const mat = bakedMaterial(b.spec);
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(b.pos);
      const nrm = new Float32Array(b.nrm);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      let colors;
      if (env && !mat.userData.emissive) colors = bakeVertexColors(this.world, pos, nrm, { lights: this.lights, env });
      else colors = new Float32Array(pos.length).fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setIndex(b.idx);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    this.batches.clear();
    const pad = 2;
    this.bounds.minX -= pad; this.bounds.minZ -= pad; this.bounds.maxX += pad; this.bounds.maxZ += pad;
    return this;
  }
}
