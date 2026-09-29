// LevelBuilder: a tiny DSL for blocking out levels from boxes.
// Every box can be solid (added to the CollisionWorld) and/or visible (merged into one mesh per material
// with world-space UVs so textures tile consistently). Levels also register lights, spawns, pickups,
// enemies, triggers and scripted objects which the game layer consumes.
import * as THREE from 'three';
import { CollisionWorld } from './collision.js';
import { material } from './textures.js';

export class LevelBuilder {
  constructor(meta = {}) {
    this.meta = meta;
    this.world = new CollisionWorld(4);
    this.group = new THREE.Group();
    this.batches = new Map(); // material -> {pos:[], nrm:[], uv:[], idx:[]}
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
  wallX(z, x1, x2, { h = 4, t = 0.4, mat, doors = [], y = 0 } = {}) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    const gaps = doors.map((d) => ({ s: d.at - d.w / 2, e: d.at + d.w / 2, h: d.h ?? 2.8 })).sort((p, q) => p.s - q.s);
    let cur = a;
    for (const g of gaps) {
      if (g.s > cur) this.box(cur, y, z - t / 2, g.s, y + h, z + t / 2, mat);
      if (g.h < h) this.box(g.s, y + g.h, z - t / 2, g.e, y + h, z + t / 2, mat);
      cur = g.e;
    }
    if (cur < b) this.box(cur, y, z - t / 2, b, y + h, z + t / 2, mat);
  }

  wallZ(x, z1, z2, { h = 4, t = 0.4, mat, doors = [], y = 0 } = {}) {
    const a = Math.min(z1, z2), b = Math.max(z1, z2);
    const gaps = doors.map((d) => ({ s: d.at - d.w / 2, e: d.at + d.w / 2, h: d.h ?? 2.8 })).sort((p, q) => p.s - q.s);
    let cur = a;
    for (const g of gaps) {
      if (g.s > cur) this.box(x - t / 2, y, cur, x + t / 2, y + h, g.s, mat);
      if (g.h < h) this.box(x - t / 2, y + g.h, g.s, x + t / 2, y + h, g.e, mat);
      cur = g.e;
    }
    if (cur < b) this.box(x - t / 2, y, cur, x + t / 2, y + h, b, mat);
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

  /** Cylinder rendered round but colliding as its bounding box. */
  cylinder(cx, y, cz, r, h, mat, { solid = true, segments = 10, rTop } = {}) {
    const m = material(mat);
    const geo = new THREE.CylinderGeometry(rTop ?? r, r, h, segments);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 6.28 * m.userData.scale, uv.getY(i) * h * m.userData.scale);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(cx, y + h / 2, cz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    if (solid) this.box(cx - r, y, cz - r, cx + r, y + h, cz + r, null, { visible: false });
    return mesh;
  }

  /** Add an arbitrary decorative Object3D. */
  prop(obj) { this.group.add(obj); return obj; }

  light({ type = 'point', x = 0, y = 3, z = 0, color = 0xffffff, intensity = 1, distance = 14, decay = 1, flicker = 0 } = {}) {
    let l;
    if (type === 'point') l = new THREE.PointLight(color, intensity, distance, decay);
    else if (type === 'spot') { l = new THREE.SpotLight(color, intensity, distance, Math.PI / 4, 0.5, decay); l.target.position.set(x, 0, z); this.group.add(l.target); }
    l.position.set(x, y, z);
    l.userData.baseIntensity = intensity;
    l.userData.flicker = flicker;
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

  _addBoxGeometry(minX, minY, minZ, maxX, maxY, maxZ, matSpec, opts) {
    const mat = material(matSpec);
    let b = this.batches.get(mat);
    if (!b) { b = { pos: [], nrm: [], uv: [], idx: [], shadows: opts.castShadow !== false }; this.batches.set(mat, b); }
    const s = (opts.uvScale ?? mat.userData.scale);
    const skip = opts.skip || [];
    const faces = [
      // name, normal, 4 corners (counter-clockwise from outside), uv axes
      ['px', [1, 0, 0], [[maxX, minY, maxZ], [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ]], (p) => [-p[2], p[1]]],
      ['nx', [-1, 0, 0], [[minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ]], (p) => [p[2], p[1]]],
      ['py', [0, 1, 0], [[minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ], [minX, maxY, minZ]], (p) => [p[0], -p[2]]],
      ['ny', [0, -1, 0], [[minX, minY, minZ], [maxX, minY, minZ], [maxX, minY, maxZ], [minX, minY, maxZ]], (p) => [p[0], p[2]]],
      ['pz', [0, 0, 1], [[minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ]], (p) => [p[0], p[1]]],
      ['nz', [0, 0, -1], [[maxX, minY, minZ], [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ]], (p) => [-p[0], p[1]]],
    ];
    for (const [name, n, corners, uvf] of faces) {
      if (skip.includes(name)) continue;
      const base = b.pos.length / 3;
      for (const c of corners) {
        b.pos.push(c[0], c[1], c[2]);
        b.nrm.push(n[0], n[1], n[2]);
        const [u, v] = uvf(c);
        b.uv.push(u * s, v * s);
      }
      b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  /** Finalise into a level object consumed by the game. */
  finish() {
    for (const [mat, b] of this.batches) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setIndex(b.idx);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = b.shadows && !mat.transparent;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    this.batches.clear();
    const pad = 2;
    this.bounds.minX -= pad; this.bounds.minZ -= pad; this.bounds.maxX += pad; this.bounds.maxZ += pad;
    return this;
  }
}
