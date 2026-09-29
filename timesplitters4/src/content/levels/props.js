// Reusable prop builders on top of LevelBuilder. Solid parts collide; decorative parts don't.
import * as THREE from 'three';
import { textTexture } from '../../engine/textures.js';

export const MAT = {
  asphalt: { tex: 'asphalt', scale: 0.25 },
  sidewalk: { tex: 'concrete', opts: { base: '#8f8a80' }, scale: 0.5 },
  concrete: { tex: 'concrete', scale: 0.4 },
  brick: { tex: 'brick', opts: { base: '#7a3325' }, scale: 0.5 },
  brickDark: { tex: 'brick', opts: { base: '#4a2a22', mortar: '#6a5a4a' }, scale: 0.5 },
  marble: { tex: 'tiles', opts: { a: '#e8e2d0', b: '#2b2b2b', n: 4 }, scale: 0.5 },
  carpet: { tex: 'carpet', opts: { base: '#7a1020', accent: '#d4a93a' }, scale: 0.5 },
  carpetBlue: { tex: 'carpet', opts: { base: '#1a2a6a', accent: '#c9b37a' }, scale: 0.5 },
  wallGreen: { tex: 'wallpaper', opts: { base: '#3d5a3a', accent: '#c9b37a' }, scale: 0.5 },
  wallRed: { tex: 'wallpaper', opts: { base: '#6a1e22', accent: '#d4a93a' }, scale: 0.5 },
  wallCream: { tex: 'wallpaper', opts: { base: '#b8a67a', accent: '#8a6a3a' }, scale: 0.5 },
  woodFloor: { tex: 'wood', opts: { base: '#6b3e1e' }, scale: 0.5 },
  darkWood: { tex: 'wood', opts: { base: '#4a2a14' }, scale: 1 },
  lightWood: { tex: 'wood', opts: { base: '#a8743a' }, scale: 1 },
  kitchenTile: { tex: 'tiles', opts: { a: '#f4f4f4', b: '#3a6ea5', n: 8 }, scale: 0.5 },
  whiteTile: { tex: 'tiles', opts: { a: '#f0f0ee', b: '#d8d8d4', n: 8 }, scale: 0.5 },
  plaster: { tex: 'plaster', opts: { base: '#d8cba8' }, scale: 0.4 },
  ceilingDark: { tex: 'plaster', opts: { base: '#3a3028' }, scale: 0.4 },
  metal: { tex: 'metal', scale: 0.5 },
  metalDark: { tex: 'metal', opts: { base: '#3a4048' }, scale: 0.5 },
  grate: { tex: 'grate', scale: 0.5 },
  gold: { tex: 'flat', opts: { base: '#d4a93a' }, scale: 1 },
  black: { tex: 'flat', opts: { base: '#141414' }, scale: 1 },
  white: { tex: 'flat', opts: { base: '#eeeeea' }, scale: 1 },
  felt: { tex: 'flat', opts: { base: '#1f6a34' }, scale: 1 },
  redCloth: { tex: 'flat', opts: { base: '#8a1420' }, scale: 1 },
  stone: { tex: 'stone', scale: 0.4 },
  stoneDark: { tex: 'stone', opts: { base: '#5a554c' }, scale: 0.4 },
  grass: { tex: 'concrete', opts: { base: '#4a6b2a' }, scale: 0.4 },
  dirt: { tex: 'concrete', opts: { base: '#6b5335' }, scale: 0.3 },
  hay: { tex: 'wood', opts: { base: '#c9a646' }, scale: 1 },
  hazard: { tex: 'hazard', scale: 1 },
  panel: { tex: 'panel', scale: 0.5 },
  glowYellow: { tex: 'flat', opts: { base: '#ffd070' }, emissive: '#ffc050', emissiveIntensity: 1 },
  glowBlue: { tex: 'flat', opts: { base: '#80d0ff' }, emissive: '#60c0ff', emissiveIntensity: 1 },
  glowPink: { tex: 'flat', opts: { base: '#ff60d0' }, emissive: '#ff40c0', emissiveIntensity: 1 },
  glowGreen: { tex: 'flat', opts: { base: '#80ff80' }, emissive: '#40ff60', emissiveIntensity: 1 },
  glowRed: { tex: 'flat', opts: { base: '#ff5040' }, emissive: '#ff3020', emissiveIntensity: 1 },
  glowWhite: { tex: 'flat', opts: { base: '#ffffff' }, emissive: '#ffffff', emissiveIntensity: 1 },
  mallFloor: { tex: 'tiles', opts: { a: '#e6ded0', b: '#c05a8a', n: 4 }, scale: 0.35 },
  mallWall: { tex: 'panel', opts: { base: '#e8e0f0', accent: '#8a6ab0' }, scale: 0.4 },
  neonWall: { tex: 'neon', opts: { base: '#15122a', accent: '#29f0ff' }, scale: 0.5 },
  neonWallPink: { tex: 'neon', opts: { base: '#1a0f22', accent: '#ff2bd6' }, scale: 0.5 },
  glass: { tex: 'glass', transparent: true, opacity: 0.35, scale: 0.5 },
  water: { tex: 'glass', opts: { base: '#3a8acf' }, transparent: true, opacity: 0.7, scale: 0.4 },
  leaves: { tex: 'concrete', opts: { base: '#2f6b2a' }, scale: 1 },
  bark: { tex: 'wood', opts: { base: '#5a3a1e' }, scale: 1 },
};

export function roundTable(L, x, z, { r = 0.7, h = 0.78, top = MAT.white, leg = MAT.darkWood } = {}) {
  L.cylinder(x, 0, z, 0.08, h - 0.05, leg, { solid: false, segments: 6 });
  L.cylinder(x, h - 0.05, z, r, 0.05, top, { solid: false, segments: 12 });
  L.box(x - r * 0.75, 0, z - r * 0.75, x + r * 0.75, h, z + r * 0.75, null, { visible: false });
}

export function chair(L, x, z, mat = MAT.darkWood, rot = 0) {
  L.boxC(x, 0.42, z, 0.45, 0.06, 0.45, mat, { solid: false });
  const bx = x + Math.sin(rot) * 0.2, bz = z + Math.cos(rot) * 0.2;
  L.boxC(bx, 0.45, bz, Math.abs(Math.cos(rot)) * 0.4 + 0.05, 0.5, Math.abs(Math.sin(rot)) * 0.4 + 0.05, mat, { solid: false });
  for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) L.boxC(x + dx, 0, z + dz, 0.05, 0.42, 0.05, mat, { solid: false });
}

export function crate(L, x, y, z, s = 1.2, mat = MAT.lightWood) {
  L.boxC(x, y, z, s, s, s, mat);
}

export function barrel(L, x, z, mat = { tex: 'metal', opts: { base: '#6a3a20' }, scale: 1 }) {
  L.cylinder(x, 0, z, 0.4, 1.1, mat, { segments: 10 });
}

export function car1930(L, x, z, color = '#1a1a1e', along = 'x') {
  const body = { tex: 'metal', opts: { base: color }, scale: 1 };
  const [w, d] = along === 'x' ? [4.4, 1.8] : [1.8, 4.4];
  L.boxC(x, 0.35, z, w, 0.7, d, body);
  if (along === 'x') { L.boxC(x - 0.3, 1.05, z, 2.2, 0.75, 1.6, body); L.boxC(x - 0.3, 1.2, z, 2.25, 0.4, 1.5, MAT.glass, { solid: false }); }
  else { L.boxC(x, 1.05, z + 0.3, 1.6, 0.75, 2.2, body); L.boxC(x, 1.2, z + 0.3, 1.5, 0.4, 2.25, MAT.glass, { solid: false }); }
  const wheel = { tex: 'flat', opts: { base: '#111' } };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (along === 'x') L.boxC(x + sx * 1.4, 0, z + sz * 0.95, 0.7, 0.7, 0.2, wheel, { solid: false });
    else L.boxC(x + sx * 0.95, 0, z + sz * 1.4, 0.2, 0.7, 0.7, wheel, { solid: false });
  }
  if (along === 'x') { L.boxC(x + 2.2, 0.5, z - 0.6, 0.05, 0.2, 0.25, MAT.glowYellow, { solid: false }); L.boxC(x + 2.2, 0.5, z + 0.6, 0.05, 0.2, 0.25, MAT.glowYellow, { solid: false }); }
}

export function lampPost(L, x, z, h = 4.5, light = true) {
  L.cylinder(x, 0, z, 0.1, h, MAT.metalDark, { segments: 6 });
  L.boxC(x, h, z, 0.5, 0.5, 0.5, MAT.glowYellow, { solid: false });
  if (light) L.light({ x, y: h - 0.3, z, color: 0xffd9a0, intensity: 9, distance: 16 });
}

export function plant(L, x, z, s = 1, y = 0) {
  L.cylinder(x, y, z, 0.3 * s, 0.5 * s, { tex: 'flat', opts: { base: '#8a5a3a' } }, { segments: 8 });
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 0), new THREE.MeshLambertMaterial({ color: '#2f7a2a', flatShading: true }));
  m.position.set(x, y + 1.0 * s, z);
  m.castShadow = true;
  L.prop(m);
}

export function tree(L, x, z, h = 5) {
  L.cylinder(x, 0, z, 0.25, h * 0.6, MAT.bark, { segments: 6 });
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.3, 0), new THREE.MeshLambertMaterial({ color: '#2d6a28', flatShading: true }));
  m.position.set(x, h * 0.75, z); m.castShadow = true;
  L.prop(m);
}

export function sign(L, text, x, y, z, w, h, facing = 'z+', opts = {}) {
  const tex = textTexture(text, opts);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = { 'z+': 0, 'z-': Math.PI, 'x+': Math.PI / 2, 'x-': -Math.PI / 2 }[facing];
  L.prop(m);
  return m;
}

export function chandelier(L, x, y, z, s = 1, color = 0xffd9a0, intensity = 10, distance = 20) {
  const g = new THREE.Group();
  const gold = new THREE.MeshLambertMaterial({ color: '#d4a93a', flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: '#fff2c0' });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8 * s, 0.06 * s, 4, 12), gold);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.2 * s, 0.1 * s), glow);
    b.position.set(Math.cos(a) * 0.8 * s, 0.12 * s, Math.sin(a) * 0.8 * s);
    g.add(b);
  }
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5), gold);
  chain.position.y = 0.8;
  g.add(chain);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35 * s, 0), glow);
  crystal.position.y = -0.3 * s;
  g.add(crystal);
  g.position.set(x, y, z);
  L.prop(g);
  L.light({ x, y: y - 0.4, z, color, intensity, distance });
}

export function shelves(L, x1, z1, x2, z2, h, mat = MAT.darkWood, items = true) {
  L.box(x1, 0, z1, x2, h, z2, mat);
  if (!items) return;
  const colors = ['#8a2a2a', '#2a5a8a', '#2a7a3a', '#8a7a2a', '#5a2a7a'];
  const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const n = Math.floor(len / 0.3);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < n; i++) {
      if ((i * 7 + row * 3) % 5 === 0) continue;
      const c = colors[(i + row) % colors.length];
      const y = 0.4 + row * (h - 0.4) / 3;
      const t = (i + 0.5) * (len / n);
      const bh = 0.25 + ((i * 13) % 5) * 0.03;
      if (alongX) L.box(Math.min(x1, x2) + t - 0.1, y, Math.min(z1, z2) - 0.02, Math.min(x1, x2) + t + 0.1, y + bh, Math.max(z1, z2) + 0.02, { tex: 'flat', opts: { base: c } }, { solid: false });
      else L.box(Math.min(x1, x2) - 0.02, y, Math.min(z1, z2) + t - 0.1, Math.max(x1, x2) + 0.02, y + bh, Math.min(z1, z2) + t + 0.1, { tex: 'flat', opts: { base: c } }, { solid: false });
    }
  }
}

/** Swirling time portal. Returns the animated object; visible when `isOpen(game)` returns true. */
export function timePortal(L, x, y, z, isOpen) {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: '#b06bff' });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 6, 24), ringMat);
  g.add(ring);
  const discs = [];
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(1.35 - i * 0.35, 6), new THREE.MeshBasicMaterial({
      color: ['#5a1fff', '#c040ff', '#40e0ff'][i], transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    d.position.z = i * 0.01;
    g.add(d); discs.push(d);
  }
  const light = new THREE.PointLight(0xa060ff, 0, 14, 1);
  g.add(light);
  g.position.set(x, y + 1.6, z);
  g.visible = false;
  L.prop(g);
  L.animated.push({
    update(dt, t, game) {
      const open = isOpen(game);
      if (open && !g.visible) game.effects.sparkle(g.position, '#c080ff', 40, 6);
      g.visible = open;
      light.intensity = open ? 12 + Math.sin(t * 5) * 3 : 0;
      discs.forEach((d, i) => { d.rotation.z += dt * (1.5 + i) * (i % 2 ? -1 : 1); d.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.05); });
      ring.rotation.z += dt * 0.5;
      g.lookAt(game.localActors[0]?.pos.x ?? x, g.position.y, game.localActors[0]?.pos.z ?? z + 1);
    },
  });
  return g;
}
