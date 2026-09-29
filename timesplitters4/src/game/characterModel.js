// Detailed PS2-style characters, fully procedural:
//  • sculpted head: deformed sphere with jaw, chin, cheekbones, brow ridge and eye sockets; 3D eyeballs with
//    irises, a modelled nose, lips and ears; hair shells cut to a hairstyle (short / long / bob / under-hat),
//    fringes and spikes, beards and moustaches as shells; painted skin/brows/lids/lips/stubble wrap texture
//  • body: lathed, muscle-shaped torso, pelvis, thighs, calves, upper arms and forearms with elbow/knee joints;
//    hands with curled fingers and thumbs; shoes with soles, heels, toe caps and laces
//  • clothing: wrap textures (collars, buttons, pockets, suits, uniforms…) plus modelled collars, buttons,
//    cuffs, belts with buckles, lapels, ties, glasses, hats, coats, capes, backpacks…
// Every body part is merged into ONE mesh per bone (multi-material groups) and the merged geometry is cached
// per character, so a detailed character costs ~25 draw calls and is instant to spawn after the first.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildWeaponModel } from './weaponModel.js';
import { headTexture, shirtTexture, fabricWrap, skinTexture, fabricTexture, isFeminine, shade, hash } from './characterTextures.js';

// ------------------------------------------------------------------ geometry primitives
function lathe(profile, seg = 14, sx = 1, sz = 1, phiStart = 0, phiLength = Math.PI * 2) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)), seg, phiStart, phiLength);
  if (sx !== 1 || sz !== 1) g.scale(sx, 1, sz);
  g.computeVertexNormals();
  return g;
}
const ellipsoid = (rx, ry, rz, ws = 9, hs = 6) => new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz);
function roundedBox(w, h, d, round = 0.45, seg = 2) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const P = g.attributes.position, N = g.attributes.normal;
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.set(P.getX(i) / hw, P.getY(i) / hh, P.getZ(i) / hd);
    v.lerp(v.clone().normalize().multiplyScalar(Math.SQRT2 * 0.82), round);
    v.set(v.x * hw, v.y * hh, v.z * hd);
    P.setXYZ(i, v.x, v.y, v.z);
    n.set(v.x / (hw * hw), v.y / (hh * hh), v.z / (hd * hd)).normalize();
    n.lerp(fn.set(N.getX(i), N.getY(i), N.getZ(i)), 0.25).normalize();
    N.setXYZ(i, n.x, n.y, n.z);
  }
  return g;
}
const ring = (r, tube, rs = 5, ts = 14, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, rs, ts, arc).rotateX(Math.PI / 2);
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ material tokens
// Parts reference tokens; at merge time tokens become material groups (solid/glow are vertex-coloured).
const T = {
  skin: { kind: 'skin' }, head: { kind: 'head' }, shirt: { kind: 'shirt' }, sleeve: { kind: 'sleeve' },
  pants: { kind: 'pants' }, team: { kind: 'team' },
};
const solid = (color) => ({ kind: 'solid', color });
const glow = (color) => ({ kind: 'glow', color });
const M = (color, isGlow = false) => (isGlow ? glow(color) : solid(color));

// ------------------------------------------------------------------ sculpted head
const HEAD_C = 0.155;
const HS = { x: 0.134, y: 0.16, z: 0.148 };

/** Maps a unit direction on the base sphere to head-local position (before the HEAD_C offset). */
function deform(x, y, z, fem) {
  const front = Math.max(0, -z);
  let X = x, Y = y, Z = z;
  if (z < 0) Z = z * (1 - 0.14 * front * front);                       // flatter face plane
  if (z > 0) { Z *= 1.1; Y += 0.06 * z * Math.max(0, y); }              // rounder, larger back of skull
  if (y < 0) {                                                          // jaw taper
    const k = -y;
    X *= 1 - (fem ? 0.36 : 0.28) * k * k - 0.1 * k * front;
    Z *= 1 - 0.14 * k * (1 - front);
  }
  Z -= (fem ? 0.06 : 0.1) * front * smooth(-y, 0.45, 0.92);              // chin
  X *= 1 + (fem ? 0.05 : 0.07) * Math.exp(-((y + 0.02) ** 2) / 0.02) * (0.5 + 0.5 * front); // cheekbones
  Z -= (fem ? 0.03 : 0.065) * front ** 3 * Math.exp(-((y - 0.3) ** 2) / 0.006);  // brow ridge
  for (const s of [-1, 1]) {                                            // eye sockets
    const d2 = (x - s * 0.36) ** 2 + (y - 0.14) ** 2;
    Z += 0.075 * Math.exp(-d2 / 0.011) * front;
  }
  Z -= 0.03 * front ** 4 * Math.exp(-((y + 0.08) ** 2) / 0.02) * Math.exp(-(x * x) / 0.02); // philtrum/mouth
  return [X * HS.x, Y * HS.y, Z * HS.z];
}
const dirFront = (x, y) => [x, y, -Math.sqrt(Math.max(0, 1 - x * x - y * y))];
function dirUV([x, y, z]) {
  let phi = Math.atan2(z, -x); if (phi < 0) phi += Math.PI * 2;
  return [phi / (Math.PI * 2), 1 - Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI];
}

/** Hair coverage 0..1 for a unit direction. style: short | long | bob | hat | none */
function hairAmount(style, x, y, z) {
  if (style === 'none') return 0;
  const t = (z + 1) / 2; // 0 front … 1 back
  let th;
  if (style === 'long') th = 0.43 * (1 - t) - 0.85 * t;
  else if (style === 'bob') th = 0.42 * (1 - t) - 0.55 * t;
  else th = 0.46 * (1 - t) - 0.3 * t;
  let a = (y - th) / 0.07;
  if (-z > 0.6 && y < 0.38) a = Math.min(a, (y - 0.38) / 0.05);      // keep the face clear
  if (style === 'short' && Math.abs(x) > 0.82 && z > -0.35 && z < 0.2 && y > -0.12 && y < 0.3) a = Math.max(a, 1); // sideburns
  if (style === 'hat') a = Math.min(a, (0.3 - y) / 0.05, (z + 0.25) / 0.12); // only below the hat, from the ears back
  return Math.max(0, Math.min(1, a));
}

// ------------------------------------------------------------------ build cache
const CACHE = new Map(); // character id -> { bones: {name: {geo, tokens}} }

export class CharacterModel {
  constructor(character, { teamColor = null } = {}) {
    this.character = character;
    const look = character.look;
    const build = look.build || {};
    this.fem = isFeminine(look);
    this.sw = build.w ?? 1; this.sh = build.h ?? 1;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this._skeleton();
    this._materials(teamColor);
    let cached = CACHE.get(character.id);
    if (!cached) {
      this.parts = new Map();
      this._buildBody(look);
      this._buildHead(look);
      this._buildHat(look);
      this._buildExtras(look);
      cached = this._merge();
      CACHE.set(character.id, cached);
    }
    for (const [name, { geo, tokens }] of Object.entries(cached)) {
      const mesh = new THREE.Mesh(geo, tokens.map((t) => this._mat(t)));
      this.bones[name].add(mesh);
    }
    this._specials(look);
    this.body.scale.set(this.sw, this.sh, this.sw);
    this.phase = Math.random() * 10;
    this.deadT = 0;
    this.flash = 0;
    this.weaponMesh = null;
    this.leftWeaponMesh = null;
    this.setTeamColor(teamColor);
  }

  _skeleton() {
    const g = (parent, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };
    this.hips = g(this.body, 0, 0.92, 0);
    this.legL = g(this.hips, -0.1, -0.06, 0);
    this.legR = g(this.hips, 0.1, -0.06, 0);
    this.knees = [g(this.legL, 0, -0.42, 0), g(this.legR, 0, -0.42, 0)];
    this.torso = g(this.body, 0, 0.92, 0);
    this.armL = g(this.torso, -0.29, 0.52, 0);
    this.armR = g(this.torso, 0.29, 0.52, 0);
    this.elbows = [g(this.armL, 0, -0.29, 0), g(this.armR, 0, -0.29, 0)];
    this.handL = g(this.elbows[0], 0, -0.3, -0.02);
    this.handR = g(this.elbows[1], 0, -0.3, -0.02);
    this.head = g(this.torso, 0, 0.62, 0);
    this.bones = {
      hips: this.hips, legL: this.legL, legR: this.legR, kneeL: this.knees[0], kneeR: this.knees[1], torso: this.torso,
      armL: this.armL, armR: this.armR, elbowL: this.elbows[0], elbowR: this.elbows[1], head: this.head,
    };
    this._boneName = new Map(Object.entries(this.bones).map(([k, v]) => [v, k]));
  }

  _materials(teamColor) {
    const look = this.character.look;
    const c = this.character;
    const lam = (p) => new THREE.MeshLambertMaterial(p);
    const phong = (p) => new THREE.MeshPhongMaterial({ shininess: 14, specular: new THREE.Color('#161616'), ...p });
    this.mats = {
      skin: lam({ color: look.skin || '#e0b090', map: skinTexture() }),
      head: lam({ color: '#ffffff' }), // map assigned after the head is sculpted (needs feature UVs)
      shirt: lam({ map: shirtTexture(c) }),
      sleeve: lam({ map: fabricWrap(look.top || '#555', 'sleeve') }),
      pants: lam({ map: fabricWrap(look.bottom || '#333', 'pants', { fly: true, stripes: (c.era || '').includes('1997') && (hash(c.id) % 2 === 0) }) }),
      solid: phong({ vertexColors: true, map: fabricTexture(), side: THREE.DoubleSide }), // open shells (hoods, capes) show their inside
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
      team: new THREE.MeshBasicMaterial({ color: new THREE.Color(teamColor || '#ffffff').multiplyScalar(1.6) }),
    };
    this.mats.face = this.mats.head; // API compatibility
    const tex = CACHE.get(c.id + ':headtex');
    if (tex) this.mats.head.map = tex;
  }

  _mat(tok) {
    return this.mats[tok.kind] || this.mats.solid;
  }

  // ---------------------------------------------------------------- part collection
  _add(bone, geo, tok) {
    const o = new THREE.Object3D();
    o.userData.geo = geo; o.userData.tok = tok;
    const name = typeof bone === 'string' ? bone : this._boneName.get(bone);
    if (!this.parts.has(name)) this.parts.set(name, []);
    this.parts.get(name).push(o);
    return o;
  }
  B(bone, w, h, d, x, y, z, tok) { const o = this._add(bone, new THREE.BoxGeometry(w, h, d), tok); o.position.set(x, y, z); return o; }
  RB(bone, w, h, d, x, y, z, tok, round = 0.5) { const o = this._add(bone, roundedBox(w, h, d, round), tok); o.position.set(x, y, z); return o; }
  E(bone, rx, ry, rz, x, y, z, tok, ws, hs) { const o = this._add(bone, ellipsoid(rx, ry, rz, ws, hs), tok); o.position.set(x, y, z); return o; }
  L(bone, profile, tok, seg = 14, sx = 1, sz = 1) { return this._add(bone, lathe(profile, seg, sx, sz), tok); }
  R(bone, r, tube, x, y, z, tok, sx = 1, sz = 1) { const o = this._add(bone, ring(r, tube), tok); o.position.set(x, y, z); o.scale.set(sx, 1, sz); return o; }
  /** Cylinder/cone between two points. */
  S(bone, a, b, r0, r1, tok, seg = 8) {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
    const d = Bv.clone().sub(A), len = d.length();
    const o = this._add(bone, new THREE.CylinderGeometry(r1, r0, len, seg), tok);
    o.position.copy(A).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return o;
  }

  _merge() {
    const out = {};
    const order = ['skin', 'head', 'shirt', 'sleeve', 'pants', 'solid', 'glow', 'team'];
    for (const [name, list] of this.parts) {
      const buckets = new Map();
      for (const o of list) {
        o.updateMatrix();
        let g = o.userData.geo.clone().applyMatrix4(o.matrix);
        if (!g.index) g = g; // all primitives are indexed
        const tok = o.userData.tok;
        const n = g.attributes.position.count;
        const col = new Float32Array(n * 3);
        const c = new THREE.Color(tok.kind === 'solid' || tok.kind === 'glow' ? tok.color : '#ffffff');
        if (tok.kind === 'glow') c.multiplyScalar(1.8);
        for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
        if (!buckets.has(tok.kind)) buckets.set(tok.kind, []);
        buckets.get(tok.kind).push(g);
      }
      const kinds = order.filter((k) => buckets.has(k));
      const merged = kinds.map((k) => mergeGeometries(buckets.get(k), false));
      const geo = mergeGeometries(merged, true);
      geo.computeBoundingSphere();
      out[name] = { geo, tokens: kinds.map((k) => ({ kind: k })) };
    }
    return out;
  }

  // ---------------------------------------------------------------- body
  _buildBody(look) {
    const fem = this.fem;
    const top = look.top || '#555', bottom = look.bottom || '#333';
    const era = this.character.era || '';
    const sneakers = era.includes('1997') || era.includes('2145');
    const shoe = look.shoes || (sneakers ? '#e8e8e4' : ['#1d1a18', '#3a2414', '#18181c'][hash(this.character.id) % 3]);
    const sole = sneakers ? '#f4f4f0' : '#0e0c0a';
    const ex = look.extras || [];
    const suit = ex.includes('tie');
    // --- pelvis, belt
    this.L('hips', [[0.1, -0.17], [0.15, -0.14], [0.176, -0.08], [0.182, -0.01], [0.176, 0.06]], T.pants, 16, fem ? 1.06 : 1, 0.66);
    this.E('hips', 0.11, 0.06, 0.09, 0, -0.15, 0, T.pants);
    this.R('hips', 0.178, 0.02, 0, 0.035, 0, solid(shade(bottom, -0.35)), 1, 0.68);
    this.RB('hips', 0.055, 0.042, 0.016, 0, 0.035, -0.128, solid('#c8a040'), 0.35);
    this.RB('hips', 0.032, 0.022, 0.018, 0, 0.035, -0.132, solid(shade(bottom, -0.35)), 0.3);
    for (const x of [-0.12, 0.12]) this.B('hips', 0.012, 0.045, 0.01, x, 0.035, -0.118, solid(shade(bottom, -0.2)));
    // --- legs
    for (const [leg, knee, s] of [['legL', 'kneeL', -1], ['legR', 'kneeR', 1]]) {
      this.L(leg, [[0.07, -0.44], [0.076, -0.4], [0.09, -0.3], [0.102, -0.17], [0.108, -0.07], [0.1, 0.03]], T.pants, 10);
      this.E(leg, 0.05, 0.058, 0.036, 0, -0.415, -0.04, T.pants);                        // knee cap
      this.RB(leg, 0.008, 0.08, 0.075, s * 0.098, -0.2, -0.01, solid(shade(bottom, -0.12)), 0.3); // side pocket seam
      this.L(knee, [[0.056, -0.4], [0.058, -0.36], [0.066, -0.27], [0.079, -0.15], [0.077, -0.06], [0.072, 0.03]], T.pants, 10).position.z = 0.006;
      this.R(knee, 0.063, 0.011, 0, -0.37, 0.004, solid(shade(bottom, -0.1)));           // trouser hem
      // shoe
      this.E(knee, 0.056, 0.048, 0.11, 0, -0.43, -0.035, solid(shoe));
      this.E(knee, 0.052, 0.04, 0.062, 0, -0.448, -0.115, solid(shade(shoe, sneakers ? -0.05 : 0.05)));
      this.RB(knee, 0.118, 0.024, 0.27, 0, -0.474, -0.05, solid(sole), 0.4);
      this.RB(knee, 0.098, 0.034, 0.07, 0, -0.462, 0.045, solid(sole), 0.35);
      for (let i = 0; i < 3; i++) this.B(knee, 0.05, 0.006, 0.01, 0, -0.395 - i * 0.009, -0.07 - i * 0.022, solid(sneakers ? '#ddd' : '#2a2420'));
      if (sneakers) this.B(knee, 0.004, 0.02, 0.09, s * 0.056, -0.44, -0.05, solid(hash(this.character.id) % 2 ? '#d02040' : '#2050d0'));
    }
    // --- torso (wrap-textured shirt)
    const w = fem ? 0.92 : 1;
    const prof = fem
      ? [[0.168, -0.02], [0.155, 0.08], [0.16, 0.18], [0.188, 0.3], [0.2, 0.39], [0.196, 0.47], [0.178, 0.54], [0.13, 0.585], [0.075, 0.6]]
      : [[0.174, -0.02], [0.168, 0.07], [0.176, 0.17], [0.198, 0.29], [0.214, 0.4], [0.212, 0.48], [0.19, 0.54], [0.14, 0.585], [0.08, 0.6]];
    this.L('torso', prof, T.shirt, 16, w, 0.6);
    const rAt = (y) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return prof[prof.length - 1][0]; };
    const zf = (y) => -rAt(y) * 0.6;
    if (fem) for (const s of [-1, 1]) this.E('torso', 0.066, 0.058, 0.04, s * 0.072, 0.37, zf(0.37) + 0.028, solid(shade(top, 0.02)), 14, 10);
    // neck & collar
    this.L('torso', [[0.058, 0.55], [0.054, 0.62], [0.056, 0.67], [0.05, 0.71]], T.skin, 12);
    const collarCol = suit ? '#f2f2ee' : shade(top, 0.08);
    this.R('torso', 0.07, 0.015, 0, 0.592, 0.004, solid(collarCol), 1, 0.92);
    for (const s of [-1, 1]) { const o = this.RB('torso', 0.05, 0.034, 0.01, s * 0.034, 0.57, zf(0.57) - 0.004, solid(collarCol), 0.3); o.rotation.z = s * 0.55; }
    // shoulders (deltoids)
    for (const s of [-1, 1]) this.E('torso', 0.085, 0.072, 0.082, s * 0.215 * w, 0.515, 0, solid(shade(top, 0.02)), 14, 10);
    // buttons / lapels
    const robot = ['robot', 'android', 'dome', 'visor'].includes(look.head) || look.head === 'skull';
    if (!robot) {
      if (suit) {
        for (const s of [-1, 1]) { const o = this.RB('torso', 0.05, 0.2, 0.012, s * 0.055, 0.45, zf(0.45) - 0.006, solid(shade(top, -0.08)), 0.3); o.rotation.z = -s * 0.28; o.rotation.y = s * 0.2; }
        for (const y of [0.2, 0.28]) this._button('torso', 0.02, y, zf(y), shade(top, 0.3));
      } else {
        for (const y of [0.16, 0.26, 0.36, 0.46]) this._button('torso', 0, y, zf(y), shade(top, 0.35));
      }
    }
    // --- arms
    for (const [arm, elbow, s] of [['armL', 'elbowL', -1], ['armR', 'elbowR', 1]]) {
      this.L(arm, [[0.052, -0.29], [0.056, -0.25], [0.065, -0.16], [0.07, -0.08], [0.068, 0], [0.058, 0.04]], T.sleeve, 10, 1, 0.95);
      this.R(arm, 0.069, 0.011, 0, -0.06, 0, T.team);
      this.E(elbow, 0.053, 0.055, 0.053, 0, 0, 0, T.sleeve);
      this.L(elbow, [[0.042, -0.25], [0.045, -0.22], [0.055, -0.14], [0.06, -0.06], [0.056, 0.02]], T.sleeve, 10, 1.05, 0.92);
      this.R(elbow, 0.046, 0.01, 0, -0.232, 0, solid(suit ? '#f2f2ee' : shade(top, -0.12)));
      this.L(elbow, [[0.034, -0.275], [0.036, -0.245]], T.skin, 10);
      this._hand(elbow, s);
    }
  }

  _button(bone, x, y, z, color) {
    const o = this._add(bone, new THREE.CylinderGeometry(0.008, 0.008, 0.006, 8), solid(color));
    o.position.set(x, y, z - 0.003); o.rotation.x = Math.PI / 2;
  }

  /** Hand gripping (fingers curl around a grip running along +Z). */
  _hand(bone, s) {
    const y0 = -0.3;
    this.RB(bone, 0.034, 0.075, 0.07, s * 0.004, y0, -0.005, T.skin, 0.55);                     // palm
    for (let i = 0; i < 4; i++) {
      const z = -0.03 + i * 0.019, r = i === 3 ? 0.0075 : 0.0085;
      const o = this._add(bone, new THREE.TorusGeometry(0.02, r, 4, 5, Math.PI * 1.15), T.skin);   // curled finger
      o.position.set(-s * 0.004, y0 - 0.034, z); o.rotation.set(0, 0, s > 0 ? Math.PI * 0.95 : -Math.PI * 0.1);
      this.E(bone, 0.011, 0.01, 0.009, -s * 0.02, y0 - 0.03, z, T.skin, 5, 4);                     // knuckle
    }
    this.S(bone, [s * 0.012, y0 - 0.01, -0.035], [-s * 0.012, y0 - 0.05, -0.05], 0.011, 0.009, T.skin); // thumb
  }

  // ---------------------------------------------------------------- head
  _hairStyle(look) {
    if (!look.hair || look.hair === 'none') return 'none';
    const covering = ['knight', 'hood', 'plague', 'spacehelm', 'hotdog', 'helmet', 'nemes'];
    if (covering.includes(look.hat)) return 'none';
    if (look.hat === 'bob') return 'bob';
    if (['ponytail', 'pigtails'].includes(look.hair2) || look.long) return 'long';
    if (['fedora', 'stetson', 'tophat', 'flatcap', 'cap', 'cap_back', 'beanie', 'police', 'chef', 'ushanka', 'captain', 'jester', 'tonsure'].includes(look.hat)) return 'hat';
    return 'short';
  }

  _buildHead(look) {
    const m = this;
    const h = 'head';
    const skinTok = T.skin, dark = solid('#111'), glw = glow(look.glow || '#fff');
    const eyes = (y = 0.14, tok = dark, gap = 0.07, s = 0.045) => {
      m.RB(h, s, s, 0.02, -gap, y, -0.14, tok, 0.4); m.RB(h, s, s, 0.02, gap, y, -0.14, tok, 0.4);
    };
    switch (look.head) {
      case 'skull':
        m.RB(h, 0.26, 0.3, 0.28, 0, 0.16, 0, skinTok, 0.7);
        m.RB(h, 0.2, 0.1, 0.2, 0, 0.03, -0.03, skinTok, 0.5);
        eyes(0.17, dark, 0.06, 0.065);
        m.B(h, 0.04, 0.04, 0.02, 0, 0.1, -0.155, dark);
        for (let i = -2; i <= 2; i++) m.B(h, 0.022, 0.03, 0.01, i * 0.026, 0.035, -0.13, solid('#f4f0e0'));
        return;
      case 'bear':
        m.E(h, 0.17, 0.16, 0.16, 0, 0.15, 0, skinTok, 16, 12);
        m.E(h, 0.08, 0.06, 0.07, 0, 0.09, -0.15, solid('#c8a070'));
        m.E(h, 0.03, 0.022, 0.018, 0, 0.12, -0.215, dark);
        m.E(h, 0.045, 0.045, 0.03, -0.12, 0.3, 0, skinTok); m.E(h, 0.045, 0.045, 0.03, 0.12, 0.3, 0, skinTok);
        m.E(h, 0.022, 0.024, 0.01, -0.06, 0.19, -0.145, dark); m.E(h, 0.022, 0.024, 0.01, 0.06, 0.19, -0.145, dark);
        return;
      case 'robot': case 'dome':
        m.RB(h, 0.3, 0.3, 0.3, 0, 0.15, 0, skinTok, 0.35);
        m.RB(h, 0.25, 0.07, 0.03, 0, 0.17, -0.15, glw, 0.4);
        m.RB(h, 0.26, 0.05, 0.02, 0, 0.05, -0.155, dark, 0.3);
        m.S(h, [-0.19, 0.15, 0], [-0.15, 0.15, 0], 0.05, 0.05, dark, 10); m.S(h, [0.15, 0.15, 0], [0.19, 0.15, 0], 0.05, 0.05, dark, 10);
        for (const x of [-0.1, 0, 0.1]) m.E(h, 0.012, 0.012, 0.008, x, 0.27, -0.15, solid('#999'), 6, 5);
        return;
      case 'visor':
        m.E(h, 0.15, 0.165, 0.155, 0, 0.155, 0, dark, 18, 14);
        m.RB(h, 0.27, 0.065, 0.06, 0, 0.17, -0.125, glw, 0.5);
        m.R(h, 0.15, 0.01, 0, 0.06, 0, solid('#333'));
        return;
      case 'android':
        m.E(h, 0.13, 0.16, 0.145, 0, 0.155, 0, skinTok, 18, 14);
        m.E(h, 0.022, 0.012, 0.01, -0.05, 0.17, -0.135, glw); m.E(h, 0.022, 0.012, 0.01, 0.05, 0.17, -0.135, glw);
        m.R(h, 0.13, 0.008, 0, 0.29, 0, glw);
        m.S(h, [0, 0.07, -0.14], [0, 0.29, -0.1], 0.003, 0.003, glw, 4);
        return;
      case 'alien': {
        const hd = m.E(h, 0.17, 0.2, 0.15, 0, 0.23, 0, skinTok, 18, 14);
        void hd;
        m.E(h, 0.07, 0.07, 0.1, 0, 0.07, -0.03, skinTok);
        const le = m.E(h, 0.055, 0.032, 0.02, -0.065, 0.2, -0.135, dark); le.rotation.z = -0.45;
        const re = m.E(h, 0.055, 0.032, 0.02, 0.065, 0.2, -0.135, dark); re.rotation.z = 0.45;
        return;
      }
      case 'xeno': {
        m.E(h, 0.12, 0.13, 0.17, 0, 0.13, -0.02, skinTok, 16, 12);
        const back = m.E(h, 0.09, 0.09, 0.24, 0, 0.26, 0.2, skinTok); back.rotation.x = 0.5;
        for (let i = 0; i < 5; i++) m.E(h, 0.012, 0.03, 0.01, -0.04 + i * 0.02, 0.05, -0.17, solid('#dde'), 6, 5);
        m.RB(h, 0.16, 0.035, 0.02, 0, 0.13, -0.175, glw, 0.4);
        return;
      }
      case 'octo':
        m.E(h, 0.18, 0.17, 0.17, 0, 0.18, 0, skinTok, 18, 14);
        m.E(h, 0.035, 0.035, 0.02, -0.08, 0.2, -0.15, solid('#fff')); m.E(h, 0.035, 0.035, 0.02, 0.08, 0.2, -0.15, solid('#fff'));
        m.E(h, 0.016, 0.02, 0.01, -0.08, 0.2, -0.168, dark); m.E(h, 0.016, 0.02, 0.01, 0.08, 0.2, -0.168, dark);
        for (let i = -2; i <= 2; i++) m.S(h, [i * 0.05, 0.04, -0.12], [i * 0.07, -0.1, -0.16], 0.025, 0.01, skinTok);
        return;
      case 'duck':
        m.E(h, 0.15, 0.15, 0.15, 0, 0.16, 0, skinTok, 16, 12);
        m.E(h, 0.08, 0.025, 0.08, 0, 0.1, -0.17, solid('#f80')); m.E(h, 0.075, 0.018, 0.075, 0, 0.075, -0.165, solid('#e70'));
        m.E(h, 0.022, 0.026, 0.012, -0.06, 0.2, -0.13, dark); m.E(h, 0.022, 0.026, 0.012, 0.06, 0.2, -0.13, dark);
        return;
      case 'monkey':
        m.E(h, 0.15, 0.15, 0.15, 0, 0.16, 0, skinTok, 16, 12);
        m.E(h, 0.11, 0.09, 0.05, 0, 0.12, -0.12, solid('#d8b090'));
        m.E(h, 0.04, 0.05, 0.02, -0.15, 0.17, 0, solid('#d8b090')); m.E(h, 0.04, 0.05, 0.02, 0.15, 0.17, 0, solid('#d8b090'));
        m.E(h, 0.018, 0.02, 0.01, -0.045, 0.19, -0.14, dark); m.E(h, 0.018, 0.02, 0.01, 0.045, 0.19, -0.14, dark);
        return;
      case 'round':
        m.E(h, 0.18, 0.18, 0.18, 0, 0.16, 0, skinTok, 18, 14);
        m.E(h, 0.02, 0.02, 0.01, -0.06, 0.2, -0.17, dark); m.E(h, 0.02, 0.02, 0.01, 0.06, 0.2, -0.17, dark);
        m.S(h, [0, 0.15, -0.17], [0, 0.13, -0.26], 0.022, 0.004, solid('#f80'));
        return;
      case 'rift':
        m.E(h, 0.15, 0.17, 0.15, 0, 0.16, 0, skinTok, 16, 12);
        m.E(h, 0.03, 0.016, 0.01, -0.065, 0.18, -0.14, glw); m.E(h, 0.03, 0.016, 0.01, 0.065, 0.18, -0.14, glw);
        for (const s of [-1, 1]) m.S(h, [s * 0.1, 0.28, 0], [s * 0.2, 0.42, 0.04], 0.025, 0.004, solid('#402'));
        return;
      default:
        this._sculptedHead(look);
    }
  }

  _sculptedHead(look) {
    const fem = this.fem;
    const zombie = look.head === 'zombie';
    const skin = look.skin || '#e0b090';
    // --- skull / face mesh
    const base = new THREE.SphereGeometry(1, 32, 24);
    const P = base.attributes.position;
    const unit = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      unit[i * 3] = x; unit[i * 3 + 1] = y; unit[i * 3 + 2] = z;
      const [X, Y, Z] = deform(x, y, z, fem);
      P.setXYZ(i, X, Y + HEAD_C, Z);
    }
    base.computeVertexNormals();
    const at = (x, y, push = 0) => { const d = dirFront(x, y); const [X, Y, Z] = deform(d[0], d[1], d[2], fem); return [X, Y + HEAD_C, Z - push]; };
    const style = this._hairStyle(look);
    // --- paint the wrap texture with features at their exact UVs
    const f = {
      eyeL: dirUV(dirFront(-0.36, 0.14)), eyeR: dirUV(dirFront(0.36, 0.14)),
      browL: dirUV(dirFront(-0.36, 0.33)), browR: dirUV(dirFront(0.36, 0.33)),
      nose: dirUV(dirFront(0, -0.1)), mouth: dirUV(dirFront(0, -0.43)), chin: dirUV(dirFront(0, -0.72)),
      cheekL: dirUV(dirFront(-0.5, -0.12)), cheekR: dirUV(dirFront(0.5, -0.12)),
    };
    const hairAt = (u, v) => {
      const phi = u * Math.PI * 2, th = (1 - v) * Math.PI;
      return hairAmount(style === 'none' ? 'none' : style, -Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)) * 0.9;
    };
    const tex = headTexture(this.character, f, look.hair ? hairAt : null);
    this.mats.head.map = tex;
    CACHE.set(this.character.id + ':headtex', tex);
    this._add('head', base, T.head);
    // --- eyes: white, iris, pupil, highlight, set into the sockets
    const iris = zombie ? '#e8f040' : ['#4a2e1a', '#2a5a9a', '#3a7a3a', '#5a4a2a', '#222'][(hash(this.character.id) >> 5) % 5];
    for (const s of [-1, 1]) {
      const [x, y, z] = at(s * 0.36, 0.14, -0.012);
      this.E('head', 0.021, 0.016, 0.014, x, y, z, solid(zombie ? '#e8f0a0' : '#f4f0ea'), 10, 8);
      const ir = this._add('head', new THREE.CircleGeometry(0.0095, 12).rotateY(Math.PI), zombie ? glow(iris) : solid(iris));
      ir.position.set(x + s * 0.001, y, z - 0.0142);
      if (!zombie) {
        const pu = this._add('head', new THREE.CircleGeometry(0.0045, 10).rotateY(Math.PI), solid('#050505'));
        pu.position.set(x + s * 0.001, y, z - 0.0146);
        const hl = this._add('head', new THREE.CircleGeometry(0.0022, 6).rotateY(Math.PI), glow('#ffffff'));
        hl.position.set(x - 0.003, y + 0.003, z - 0.015);
      }
      // upper eyelid
      const lid = this.E('head', 0.023, 0.009, 0.013, x, y + 0.012, z - 0.002, T.skin, 10, 6);
      lid.rotation.z = -s * 0.1;
    }
    // --- nose
    const root = at(0, 0.12, 0), tip = at(0, -0.1, 0.034);
    this.S('head', root, tip, 0.012, 0.019, T.skin, 8);
    this.E('head', 0.019, 0.017, 0.018, tip[0], tip[1], tip[2] + 0.004, T.skin, 10, 8);
    for (const s of [-1, 1]) this.E('head', 0.012, 0.011, 0.012, s * 0.016, tip[1] - 0.004, tip[2] + 0.012, T.skin, 8, 6);
    // --- lips
    const mo = at(0, -0.43, 0.004);
    const lipCol = zombie ? '#4a3038' : fem ? '#b83248' : shade(skin, -0.14);
    this.E('head', fem ? 0.027 : 0.03, 0.007, 0.011, mo[0], mo[1] + 0.006, mo[2], solid(lipCol), 10, 6);
    this.E('head', fem ? 0.025 : 0.028, 0.008, 0.012, mo[0], mo[1] - 0.007, mo[2], solid(shade(lipCol, 0.04)), 10, 6);
    // --- ears
    for (const s of [-1, 1]) {
      const d = [s * 0.99, 0.05, 0.12]; const [x, y, z] = deform(d[0], d[1], d[2], fem);
      const e = this.E('head', 0.014, 0.036, 0.026, x + s * 0.008, y + HEAD_C, z, T.skin, 10, 8); e.rotation.y = s * 0.35;
      const inner = this.E('head', 0.006, 0.024, 0.016, x + s * 0.014, y + HEAD_C, z - 0.002, solid(shade(skin, -0.18)), 8, 6); inner.rotation.y = s * 0.35;
    }
    // --- hair shell
    if (style !== 'none') this._hairShell(base, unit, style, look);
    if (look.hair2 === 'ponytail') {
      this.E('head', 0.035, 0.03, 0.03, 0, 0.21, 0.155, solid(look.hair));
      this.L('head', [[0.004, -0.16], [0.03, -0.1], [0.04, 0], [0.03, 0.05]], solid(shade(look.hair, 0.03)), 10).position.set(0, 0.2, 0.19);
    }
    if (look.hair2 === 'pigtails') for (const s of [-1, 1]) {
      this.E('head', 0.03, 0.03, 0.03, s * 0.135, 0.22, 0.05, solid(look.hair));
      const p = this.L('head', [[0.004, -0.18], [0.034, -0.1], [0.04, -0.02], [0.028, 0.03]], solid(shade(look.hair, 0.03)), 10);
      p.position.set(s * 0.17, 0.2, 0.06); p.rotation.z = s * 0.35;
    }
  }

  _hairShell(base, unit, style, look) {
    const P = base.attributes.position, idx = base.index.array;
    const pos = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const uy = unit[i * 3 + 1];
      const k = 1.055 + Math.max(0, uy) * 0.04 + (style === 'long' || style === 'bob' ? Math.max(0, -uy) * 0.05 : 0);
      pos[i * 3] = P.getX(i) * k;
      pos[i * 3 + 1] = HEAD_C + (P.getY(i) - HEAD_C) * k;
      pos[i * 3 + 2] = P.getZ(i) * k;
    }
    const keep = [];
    for (let t = 0; t < idx.length; t += 3) {
      let a = 0;
      for (let k = 0; k < 3; k++) { const v = idx[t + k]; a += hairAmount(style, unit[v * 3], unit[v * 3 + 1], unit[v * 3 + 2]); }
      if (a / 3 > 0.45) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    if (!keep.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', base.attributes.uv.clone());
    g.setIndex(keep);
    g.computeVertexNormals();
    this._add('head', g, solid(look.hair));
    // fringe / spikes for some short cuts
    const r = hash(this.character.id);
    if (style === 'short' && r % 3 === 0) {
      for (let i = 0; i < 7; i++) {
        const a = -0.6 + i * 0.2;
        const d = [Math.sin(a) * 0.8, 0.55, -Math.cos(a) * 0.8];
        const [x, y, z] = deform(d[0], d[1], d[2], this.fem);
        this.S('head', [x * 1.05, y + HEAD_C, z * 1.05], [x * 1.3, y + HEAD_C + 0.06, z * 1.25], 0.02, 0.003, solid(shade(look.hair, 0.04)), 5);
      }
    } else if (style === 'short' || style === 'long' || style === 'bob') {
      for (let i = 0; i < 5; i++) {
        const x = -0.28 + i * 0.14;
        const [X, Y, Z] = deform(...dirFront(x, 0.5), this.fem);
        this.S('head', [X * 1.06, Y + HEAD_C + 0.01, Z * 1.08], [X * 1.1, Y + HEAD_C - 0.035, Z * 1.13], 0.022, 0.006, solid(look.hair), 5);
      }
    }
  }

  // ---------------------------------------------------------------- hats
  _buildHat(look) {
    const h = 'head';
    const hat = solid(look.hatColor || '#333'), dark = solid('#151515'), band = solid(shade(look.hatColor || '#333', -0.3));
    const m = this;
    const brim = (r, y, curl = 0.012, tok = hat, sz = 1.05) => m.L(h, [[0.12, y], [r * 0.7, y - 0.002], [r, y + curl], [r * 0.99, y + curl + 0.008], [r * 0.7, y + 0.008], [0.12, y + 0.012]], tok, 22, 1, sz);
    switch (look.hat) {
      case 'fedora':
        brim(0.225, 0.29, 0.014);
        m.L(h, [[0.142, 0.29], [0.144, 0.34], [0.135, 0.4], [0.11, 0.425], [0.05, 0.415], [0.001, 0.4]], hat, 18, 1, 1.12);
        m.R(h, 0.143, 0.013, 0, 0.312, 0, band, 1, 1.12);
        m.RB(h, 0.1, 0.02, 0.03, 0, 0.41, -0.07, solid(shade(look.hatColor || '#333', -0.12)), 0.5); // front pinch
        break;
      case 'stetson':
        m.L(h, [[0.12, 0.29], [0.2, 0.29], [0.27, 0.32], [0.265, 0.33], [0.2, 0.3], [0.12, 0.302]], hat, 22, 1, 0.95);
        m.L(h, [[0.145, 0.29], [0.148, 0.35], [0.13, 0.43], [0.06, 0.44], [0.001, 0.415]], hat, 18, 1, 1.1);
        m.R(h, 0.146, 0.012, 0, 0.31, 0, band, 1, 1.1);
        break;
      case 'tophat':
        brim(0.2, 0.29, 0.02);
        m.L(h, [[0.13, 0.29], [0.128, 0.4], [0.138, 0.56], [0.001, 0.56]], hat, 18, 1, 1.08);
        m.R(h, 0.13, 0.015, 0, 0.32, 0, solid('#6a1818'), 1, 1.08);
        break;
      case 'flatcap': {
        const c = m.E(h, 0.16, 0.05, 0.18, 0, 0.3, -0.015, hat, 16, 10); void c;
        const b = m.RB(h, 0.2, 0.015, 0.09, 0, 0.28, -0.17, hat, 0.6); b.rotation.x = 0.2;
        m.E(h, 0.012, 0.008, 0.012, 0, 0.35, -0.02, band);
        break;
      }
      case 'cap': case 'cap_back': {
        const back = look.hat === 'cap_back' ? 1 : -1;
        m.L(h, [[0.152, 0.26], [0.152, 0.3], [0.135, 0.355], [0.08, 0.39], [0.001, 0.398]], hat, 16, 1, 1.07);
        const b = m.RB(h, 0.19, 0.012, 0.13, 0, 0.268, back * 0.185, solid(shade(look.hatColor || '#333', -0.08)), 0.7); b.rotation.x = -back * 0.12;
        m.E(h, 0.014, 0.008, 0.014, 0, 0.398, 0, band);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; m.S(h, [Math.sin(a) * 0.15, 0.3, Math.cos(a) * 0.16], [0, 0.395, 0], 0.002, 0.002, band, 3); }
        break;
      }
      case 'beret': { const b = m.E(h, 0.165, 0.045, 0.16, 0.03, 0.32, 0, hat, 18, 10); b.rotation.z = -0.22; m.R(h, 0.14, 0.012, 0, 0.29, 0, band, 1, 1.05); m.S(h, [0.02, 0.35, 0], [0.02, 0.38, 0], 0.006, 0.003, hat, 5); break; }
      case 'beanie':
        m.L(h, [[0.155, 0.23], [0.156, 0.3], [0.14, 0.37], [0.08, 0.41], [0.001, 0.415]], hat, 16, 1, 1.07);
        m.R(h, 0.155, 0.022, 0, 0.245, 0, solid(shade(look.hatColor || '#333', 0.05)), 1, 1.07);
        break;
      case 'police': case 'captain':
        m.L(h, [[0.15, 0.27], [0.15, 0.33], [0.175, 0.39], [0.17, 0.4], [0.001, 0.4]], hat, 18, 1, 1.05);
        m.R(h, 0.151, 0.018, 0, 0.29, 0, look.hat === 'captain' ? solid('#c8a040') : dark, 1, 1.05);
        { const v = m.RB(h, 0.2, 0.012, 0.1, 0, 0.278, -0.19, dark, 0.7); v.rotation.x = 0.25; }
        m.RB(h, 0.045, 0.05, 0.012, 0, 0.345, -0.172, solid('#e0b840'), 0.5);
        break;
      case 'bellhop':
        m.L(h, [[0.09, 0.3], [0.092, 0.39], [0.001, 0.39]], hat, 16);
        m.R(h, 0.092, 0.01, 0, 0.32, 0, solid('#d4a93a'));
        m.S(h, [-0.1, 0.3, 0], [-0.12, 0.1, 0.02], 0.004, 0.004, dark, 4);
        break;
      case 'chef':
        m.L(h, [[0.148, 0.27], [0.15, 0.36], [0.001, 0.36]], hat, 16, 1, 1.05);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; m.E(h, 0.09, 0.09, 0.09, Math.sin(a) * 0.09, 0.45, Math.cos(a) * 0.09, hat, 10, 8); }
        m.E(h, 0.1, 0.1, 0.1, 0, 0.48, 0, hat, 10, 8);
        break;
      case 'knight':
        m.L(h, [[0.16, -0.02], [0.165, 0.1], [0.168, 0.25], [0.15, 0.34], [0.09, 0.39], [0.001, 0.4]], hat, 18, 1, 1.05);
        m.RB(h, 0.25, 0.022, 0.03, 0, 0.18, -0.165, dark, 0.3);
        m.RB(h, 0.022, 0.12, 0.03, 0, 0.1, -0.167, hat, 0.3);
        for (let i = 0; i < 5; i++) m.E(h, 0.005, 0.005, 0.005, -0.06 + i * 0.03, 0.06, -0.168, dark, 5, 4);
        m.R(h, 0.168, 0.01, 0, 0.26, 0, solid(shade(look.hatColor || '#999', 0.15)), 1, 1.05);
        for (let i = 0; i < 6; i++) m.E(h, 0.025, 0.07, 0.035, 0, 0.44 + i * 0.012, 0.01 + i * 0.03, solid('#b22'), 8, 6);
        break;
      case 'hood':
        // hood with an open face: lathe that skips the front arc, plus a thick rim around the opening
        m._add(h, lathe([[0.2, -0.06], [0.19, 0.05], [0.185, 0.2], [0.17, 0.3], [0.12, 0.38], [0.001, 0.41]], 20, 1, 1.1, Math.PI + 0.75, Math.PI * 2 - 1.5), hat).position.z = 0.02;
        m._add(h, lathe([[0.001, 0.41], [0.12, 0.38], [0.17, 0.3]], 12, 1, 1.1, Math.PI - 0.75, 1.5), hat).position.z = 0.02;
        for (const s of [-1, 1]) m.S(h, [s * 0.13, -0.04, -0.14], [s * 0.12, 0.3, -0.12], 0.02, 0.018, solid(shade(look.hatColor || '#333', -0.1)), 6);
        break;
      case 'plague':
        m.L(h, [[0.17, -0.04], [0.172, 0.15], [0.16, 0.3], [0.001, 0.33]], hat, 18, 1, 1.05);
        m.S(h, [0, 0.12, -0.15], [0, 0.02, -0.38], 0.05, 0.008, solid('#e8dcc0'), 10);
        for (const s of [-1, 1]) { m.R(h, 0.025, 0.006, s * 0.06, 0.18, -0.17, solid('#654'), 1, 1).rotation.x = 0; m.E(h, 0.024, 0.024, 0.008, s * 0.06, 0.18, -0.172, glow('#a33'), 10, 6); }
        brim(0.23, 0.31, 0.01);
        m.L(h, [[0.14, 0.31], [0.14, 0.43], [0.001, 0.43]], hat, 16);
        break;
      case 'jester':
        m.R(h, 0.15, 0.03, 0, 0.29, 0, solid('#fc3'), 1, 1.05);
        for (const s of [-1, 1]) {
          m.S(h, [s * 0.05, 0.3, 0], [s * 0.3, 0.52, 0.02], 0.07, 0.015, s < 0 ? hat : solid('#fc3'), 8);
          m.E(h, 0.035, 0.035, 0.035, s * 0.31, 0.53, 0.02, solid(s < 0 ? '#fc3' : '#d33'), 8, 6);
        }
        break;
      case 'crown':
        m.L(h, [[0.14, 0.28], [0.145, 0.36], [0.14, 0.36], [0.135, 0.29]], hat, 18, 1, 1.05);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; m.S(h, [Math.sin(a) * 0.14, 0.355, Math.cos(a) * 0.145], [Math.sin(a) * 0.14, 0.42, Math.cos(a) * 0.145], 0.02, 0.003, hat, 4); m.E(h, 0.009, 0.009, 0.009, Math.sin(a) * 0.14, 0.43, Math.cos(a) * 0.145, hat, 6, 4); }
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; m.E(h, 0.014, 0.014, 0.01, Math.sin(a) * 0.15, 0.32, Math.cos(a) * 0.155, glow(['#e22', '#2a6', '#26f', '#e22'][i]), 8, 6); }
        break;
      case 'tonsure': break; // hair shell handles it
      case 'bun': m.E(h, 0.055, 0.05, 0.055, 0, 0.33, 0.1, solid(look.hatColor || look.hair)); break;
      case 'bob': break; // hairstyle
      case 'ushanka':
        m.L(h, [[0.165, 0.26], [0.168, 0.33], [0.15, 0.39], [0.001, 0.41]], hat, 16, 1, 1.07);
        m.RB(h, 0.3, 0.07, 0.05, 0, 0.3, -0.165, hat, 0.6);
        for (const s of [-1, 1]) { const f = m.RB(h, 0.05, 0.16, 0.14, s * 0.165, 0.2, 0, hat, 0.6); f.rotation.z = s * 0.08; }
        m.E(h, 0.022, 0.022, 0.01, 0, 0.31, -0.192, solid('#c33'), 8, 6);
        break;
      case 'spacehelm':
        m.R(h, 0.2, 0.04, 0, -0.04, 0, hat, 1, 1.02);
        m.RB(h, 0.08, 0.05, 0.04, 0.2, 0.06, 0.02, solid('#888'), 0.5);
        break;
      case 'helmet':
        m.L(h, [[0.17, 0.24], [0.175, 0.28], [0.16, 0.36], [0.1, 0.41], [0.001, 0.42]], hat, 18, 1, 1.07);
        m.R(h, 0.175, 0.012, 0, 0.245, 0, band, 1, 1.07);
        m.S(h, [-0.15, 0.25, 0], [-0.1, 0.02, -0.08], 0.004, 0.004, dark, 4); m.S(h, [0.15, 0.25, 0], [0.1, 0.02, -0.08], 0.004, 0.004, dark, 4);
        break;
      case 'antenna':
        m.S(h, [0, 0.3, 0], [0, 0.5, 0], 0.008, 0.004, dark, 6);
        m.E(h, 0.03, 0.03, 0.03, 0, 0.52, 0, glow(look.hatColor || '#c33'), 10, 8);
        break;
      case 'headset':
        m.L(h, [[0.16, 0.25], [0.165, 0.3], [0.1, 0.345], [0.001, 0.35]], dark, 14);
        for (const s of [-1, 1]) m.S(h, [s * 0.15, 0.15, 0], [s * 0.185, 0.15, 0], 0.045, 0.045, hat, 12);
        m.S(h, [-0.16, 0.12, -0.02], [-0.06, 0.06, -0.16], 0.005, 0.005, dark, 4);
        m.E(h, 0.012, 0.012, 0.012, -0.06, 0.06, -0.16, glow('#0cf'), 6, 5);
        break;
      case 'hotdog':
        m.E(h, 0.19, 0.28, 0.19, 0, 0.2, 0.02, solid('#e8b870'), 16, 12);
        m.S(h, [0, -0.05, -0.14], [0, 0.52, -0.1], 0.1, 0.09, hat, 12);
        m.E(h, 0.1, 0.06, 0.02, 0, 0.14, -0.2, T.skin);
        m.S(h, [-0.06, 0.35, -0.2], [0.06, 0.3, -0.2], 0.012, 0.012, solid('#ee2'), 6);
        break;
      case 'nemes':
        m.L(h, [[0.2, 0.0], [0.17, 0.15], [0.16, 0.3], [0.08, 0.37], [0.001, 0.375]], hat, 16, 1.1, 1);
        for (let i = 0; i < 6; i++) m.R(h, 0.18 - i * 0.004, 0.006, 0, 0.05 + i * 0.05, 0, solid('#2a3a8a'), 1.1, 1);
        m.E(h, 0.022, 0.035, 0.02, 0, 0.35, -0.17, solid('#2a6'));
        break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- extras
  _buildExtras(look) {
    const m = this, t = 'torso', h = 'head';
    for (const e of look.extras || []) {
      switch (e) {
        case 'vest': {
          const col = solid('#3a3a2a');
          m.L(t, [[0.185, 0.1], [0.19, 0.2], [0.21, 0.3], [0.225, 0.4], [0.22, 0.48], [0.2, 0.53]], col, 20, 1, 0.64);
          for (const y of [0.22, 0.3, 0.38]) for (const s of [-1, 1]) m.RB(t, 0.06, 0.05, 0.02, s * 0.08, y, -0.145, solid('#2e2e20'), 0.4);
          break;
        }
        case 'tie':
          m.E(t, 0.018, 0.016, 0.01, 0, 0.555, -0.075, solid('#a22'), 8, 6);
          { const tie = m.S(t, [0, 0.54, -0.078], [0, 0.3, -0.13], 0.016, 0.03, solid('#a22'), 4); tie.scale.set(1, 1, 0.3); }
          break;
        case 'labcoat': {
          const col = solid('#f4f4f4');
          m.L(t, [[0.22, -0.32], [0.2, -0.1], [0.19, 0.08], [0.2, 0.2], [0.222, 0.32], [0.23, 0.42], [0.225, 0.5], [0.2, 0.55]], col, 22, 1, 0.66);
          for (const s of [-1, 1]) { const o = m.RB(t, 0.055, 0.2, 0.012, s * 0.06, 0.44, -0.145, solid('#e4e4e4'), 0.3); o.rotation.z = -s * 0.25; }
          m.RB(t, 0.06, 0.06, 0.01, 0.1, 0.36, -0.143, solid('#e8e8e8'), 0.3);
          m.S(t, [0.09, 0.4, -0.145], [0.09, 0.34, -0.15], 0.004, 0.004, solid('#23a'), 4);
          break;
        }
        case 'tabard':
          m.RB(t, 0.3, 0.72, 0.02, 0, 0.2, -0.132, solid(look.tabard || '#b22'), 0.3);
          m.RB(t, 0.3, 0.72, 0.02, 0, 0.2, 0.132, solid(look.tabard || '#b22'), 0.3);
          m.RB(t, 0.09, 0.09, 0.01, 0, 0.36, -0.145, solid('#fc3'), 0.4);
          break;
        case 'cape': {
          const g = new THREE.CylinderGeometry(0.2, 0.34, 1.0, 12, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
          const o = m._add(t, g, solid(look.cape || '#a22')); o.position.set(0, 0.05, 0.02); o.rotation.y = 0;
          m.R(t, 0.12, 0.012, 0, 0.57, 0, solid('#d4a93a'));
          break;
        }
        case 'backpack':
          m.RB(t, 0.3, 0.38, 0.14, 0, 0.32, 0.18, solid('#445'), 0.5);
          m.RB(t, 0.24, 0.12, 0.06, 0, 0.18, 0.26, solid('#3a3a4a'), 0.5);
          for (const s of [-1, 1]) { m.S(t, [s * 0.11, 0.5, 0.14], [s * 0.12, 0.575, 0.0], 0.016, 0.016, solid('#333'), 6); m.S(t, [s * 0.12, 0.575, 0.0], [s * 0.12, 0.54, -0.1], 0.016, 0.016, solid('#333'), 6); m.S(t, [s * 0.12, 0.54, -0.1], [s * 0.11, 0.28, -0.125], 0.016, 0.016, solid('#333'), 6); }
          break;
        case 'quiver': { const q = m.S(t, [0.02, 0.1, 0.18], [0.2, 0.62, 0.2], 0.05, 0.055, solid('#6b4a2a'), 10); void q; for (let i = 0; i < 4; i++) m.S(t, [0.18 + i * 0.01, 0.6, 0.19], [0.21 + i * 0.012, 0.7, 0.2], 0.004, 0.004, solid('#ddd'), 3); break; }
        case 'badge': m.S(t, [-0.1, 0.44, -0.12], [-0.1, 0.44, -0.132], 0.022, 0.022, solid('#e8c040'), 5).rotation.x = Math.PI / 2; break;
        case 'pearls': for (let i = 0; i < 14; i++) { const a = (i / 13 - 0.5) * 2.2; m.E(t, 0.011, 0.011, 0.011, Math.sin(a) * 0.08, 0.55 - Math.cos(a) * 0.03, -Math.cos(a) * 0.07 - 0.01, solid('#f8f4ec'), 6, 5); } break;
        case 'rope': m.R(t, 0.19, 0.016, 0, 0.08, 0, solid('#d8c080'), 1, 0.66); m.S(t, [0.05, 0.08, -0.13], [0.07, -0.2, -0.14], 0.012, 0.01, solid('#d8c080'), 5); break;
        case 'ribs': break; // painted
        case 'scarf': m.R(t, 0.085, 0.035, 0, 0.6, 0, solid(look.scarf || '#c22')); m.RB(t, 0.07, 0.3, 0.03, 0.08, 0.44, -0.14, solid(look.scarf || '#c22'), 0.4); break;
        case 'icing': for (const y of [0.15, 0.35]) m.R(t, 0.2, 0.012, 0, y, 0, solid('#fff'), 1, 0.62); break;
        case 'tail': { const tl = m.S('hips', [0, -0.08, 0.12], [0, -0.35, 0.6], 0.05, 0.015, solid(look.skin || '#333'), 8); void tl; break; }
        case 'glasses': {
          const lensCol = look.glow || ['none', 'cap_back', 'police'].includes(look.hat) ? '#101014' : '#2a3040';
          for (const s of [-1, 1]) {
            const [x, y, z] = deform(...dirFront(s * 0.36, 0.14), this.fem);
            const frame = m._add(h, new THREE.TorusGeometry(0.025, 0.0042, 5, 16), solid('#111'));
            frame.position.set(x, y + HEAD_C, z - 0.03);
            const lens = m._add(h, new THREE.CircleGeometry(0.025, 14).rotateY(Math.PI), solid(lensCol));
            lens.position.set(x, y + HEAD_C, z - 0.029);
            m.S(h, [x + s * 0.025, y + HEAD_C, z - 0.03], [s * 0.138, y + HEAD_C + 0.012, 0.02], 0.003, 0.003, solid('#111'), 4);
          }
          m.S(h, [-0.024, 0.182, -0.158], [0.024, 0.182, -0.158], 0.003, 0.003, solid('#111'), 4);
          break;
        }
        case 'beard': this._beard(look); break;
        case 'moustache': {
          const [x, y, z] = deform(...dirFront(0, -0.3), this.fem);
          for (const s of [-1, 1]) { const o = m.E(h, 0.03, 0.01, 0.014, s * 0.024, y + HEAD_C, z - 0.006, solid(look.hair || '#222'), 8, 6); o.rotation.z = s * 0.3; }
          void x;
          break;
        }
        case 'cigar': m.S(h, [0.03, 0.09, -0.14], [0.07, 0.07, -0.25], 0.009, 0.009, solid('#6b4a2a'), 6); m.E(h, 0.01, 0.01, 0.01, 0.072, 0.069, -0.255, glow('#f60'), 6, 5); break;
        default: break;
      }
    }
  }

  _beard(look) {
    // Shell over the lower face, leaving the mouth free.
    const base = new THREE.SphereGeometry(1, 30, 22);
    const P = base.attributes.position, idx = base.index.array;
    const unit = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      unit.push([x, y, z]);
      const [X, Y, Z] = deform(x, y, z, false);
      P.setXYZ(i, X * 1.045, Y * 1.045 + HEAD_C, Z * 1.06);
    }
    const inBeard = ([x, y, z]) => y < -0.2 && z < 0.25 && !((x / 0.3) ** 2 + ((y + 0.43) / 0.12) ** 2 < 1 && z < -0.5);
    const keep = [];
    for (let t = 0; t < idx.length; t += 3) if ([0, 1, 2].every((k) => inBeard(unit[idx[t + k]]))) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    base.setIndex(keep);
    base.computeVertexNormals();
    this._add('head', base, solid(look.hair || '#3a2a1a'));
  }

  // ---------------------------------------------------------------- non-merged (transparent) parts
  _specials(look) {
    if (look.head === 'dome') {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhongMaterial({ color: '#aef', transparent: true, opacity: 0.45, shininess: 90, specular: '#fff' }));
      d.position.y = 0.3; this.head.add(d);
    }
    if (look.hat === 'spacehelm') {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), new THREE.MeshPhongMaterial({ color: '#bde', transparent: true, opacity: 0.3, shininess: 100, specular: '#fff', depthWrite: false }));
      s.position.y = 0.16; this.head.add(s);
    }
  }

  // ---------------------------------------------------------------- API
  setTeamColor(color) {
    this.mats.team.color.set(color || '#ffffff').multiplyScalar(color ? 1.6 : 1);
    this.mats.team.visible = !!color;
  }

  /** Recolour skin for infection mode. */
  setInfected(on) {
    if (on) {
      if (!this._origSkin) this._origSkin = this.mats.skin.color.clone();
      this.mats.skin.color.set('#6f9a4a');
      this.mats.skin.emissive = new THREE.Color('#1a3310');
      this.mats.head.color.set('#9fd070');
    } else if (this._origSkin) {
      this.mats.skin.color.copy(this._origSkin);
      this.mats.skin.emissive = new THREE.Color('#000');
      this.mats.head.color.set('#ffffff');
    }
  }

  setWeapon(weapon, dual) {
    if (this.weaponMesh) this.handR.remove(this.weaponMesh);
    if (this.leftWeaponMesh) this.handL.remove(this.leftWeaponMesh);
    this.weaponMesh = null; this.leftWeaponMesh = null;
    if (!weapon) return;
    this.weaponMesh = buildWeaponModel(weapon);
    this.weaponMesh.rotation.x = -Math.PI / 2;
    this.weaponMesh.position.set(0, -0.04, 0);
    this.handR.add(this.weaponMesh);
    this.dual = !!dual;
    if (dual) {
      this.leftWeaponMesh = buildWeaponModel(weapon);
      this.leftWeaponMesh.rotation.x = -Math.PI / 2;
      this.leftWeaponMesh.position.set(0, -0.04, 0);
      this.handL.add(this.leftWeaponMesh);
    }
    if (this._layer != null) this.setLayer(this._layer);
  }

  setLayer(layer) {
    this._layer = layer;
    this.root.traverse((o) => o.layers.set(layer));
  }

  /**
   * @param {number} dt
   * @param {{speed:number, crouch:boolean, pitch:number, alive:boolean, airborne:boolean}} s
   */
  animate(dt, s) {
    if (!s.alive) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.45);
      this.body.rotation.x = -k * Math.PI / 2 * (this.deathDir || 1);
      this.body.position.y = k * 0.15 - Math.max(0, this.deadT - 2.5) * 0.4;
      this.armL.rotation.x = k * 2.5; this.armR.rotation.x = k * 2.8;
      this.knees[0].rotation.x = this.knees[1].rotation.x = -k * 0.3;
      return;
    }
    this.deadT = 0;
    this.body.rotation.x = 0;
    this.body.position.y = 0;
    const moving = s.speed > 0.5;
    this.phase += dt * (moving ? s.speed * 1.6 : 0);
    const amp = Math.min(0.85, s.speed * 0.11);
    const swing = moving && !s.airborne ? Math.sin(this.phase) * amp : 0;
    const kneeL = moving && !s.airborne ? Math.max(0, Math.sin(this.phase - 1.4)) * amp * 1.6 : 0;
    const kneeR = moving && !s.airborne ? Math.max(0, Math.sin(this.phase - 1.4 + Math.PI)) * amp * 1.6 : 0;
    const crouchK = s.crouch ? 1 : 0;
    this.legL.rotation.x = s.airborne ? 0.7 : swing + crouchK * 1.15;
    this.legR.rotation.x = s.airborne ? 0.2 : -swing + crouchK * 1.15;
    this.knees[0].rotation.x = -(s.airborne ? 1.1 : kneeL) - crouchK * 1.7;
    this.knees[1].rotation.x = -(s.airborne ? 0.4 : kneeR) - crouchK * 1.7;
    this.hips.position.y = 0.92 - crouchK * 0.4;
    this.torso.position.y = 0.92 - crouchK * 0.42;
    this.torso.rotation.x = moving ? -0.05 * Math.min(1, s.speed / 7) : 0;
    this.torso.rotation.y = swing * 0.12;
    this.body.position.y = moving && !s.airborne ? Math.abs(Math.cos(this.phase)) * 0.045 : Math.sin(performance.now() * 0.002 + this.phase) * 0.004; // breathing
    // Arms aim along pitch, holding the weapon two-handed unless dual-wielding.
    const aim = Math.PI / 2 + s.pitch;
    const recoil = this.flash > 0 ? 0.15 : 0;
    this.armR.rotation.x = aim + recoil;
    this.armR.rotation.z = this.dual ? 0 : -0.12;
    this.armL.rotation.x = this.dual ? aim + recoil : aim - 0.25;
    this.armL.rotation.z = this.dual ? 0 : 0.62;
    this.elbows[1].rotation.x = 0.12;
    this.elbows[0].rotation.x = this.dual ? 0.12 : 0.55;
    this.head.rotation.x = s.pitch * 0.6;
    this.flash = Math.max(0, this.flash - dt);
  }
}
