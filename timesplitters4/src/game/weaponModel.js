// Procedural weapon meshes built from boxes/cylinders. Barrel points along -Z; origin at the grip.
// A `muzzle` Object3D child marks where tracers and flashes originate.
import * as THREE from 'three';

let envTex = null;
/** Tiny painted reflection map: the classic PS2 "shiny gun" look without real reflections. */
function gunEnv() {
  if (envTex) return envTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#dfe8ff'); g.addColorStop(0.45, '#8a98b8'); g.addColorStop(0.5, '#fff6e0'); g.addColorStop(0.56, '#5a4a3a'); g.addColorStop(1, '#1a1410');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(20, 10, 18, 8); ctx.fillRect(84, 14, 10, 6);
  envTex = new THREE.CanvasTexture(c);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  return envTex;
}

const mats = new Map();
function mat(color, glow = false) {
  const key = color + (glow ? 'g' : '');
  if (!mats.has(key)) {
    let m;
    if (glow) m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2) });
    else {
      // Gun metal gets sharp PS2-style specular highlights; warm colours (wood/grips) stay satin.
      const c = new THREE.Color(color);
      const hsl = {}; c.getHSL(hsl);
      const wood = hsl.h > 0.02 && hsl.h < 0.14 && hsl.s > 0.25;
      m = new THREE.MeshPhongMaterial({
        color: c, shininess: wood ? 18 : 80,
        specular: wood ? new THREE.Color('#2a2218') : new THREE.Color('#9aa0aa'),
        envMap: wood ? null : gunEnv(), combine: THREE.MixOperation, reflectivity: wood ? 0 : 0.2,
      });
    }
    mats.set(key, m);
  }
  return mats.get(key);
}
const box = (g, w, h, d, x, y, z, color, glow) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, glow));
  m.position.set(x, y, z);
  g.add(m);
  return m;
};
const cyl = (g, r, len, x, y, z, color, glow, seg = 12) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat(color, glow));
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m);
  return m;
};

export function buildWeaponModel(weapon) {
  const v = weapon.view || {};
  const g = new THREE.Group();
  const len = v.len ?? 0.4;
  const c = v.color ?? '#333', a = v.accent ?? '#654';
  const thick = v.bulky ? 1.35 : 1;
  const muzzle = new THREE.Object3D();
  g.add(muzzle);

  switch (v.type) {
    case 'fist': {
      box(g, 0.1, 0.09, 0.11, 0, 0.02, -0.05, c);
      box(g, 0.11, 0.03, 0.03, 0, 0.06, -0.1, a);
      muzzle.position.set(0, 0.03, -0.14);
      break;
    }
    case 'grenade': {
      const m = new THREE.Mesh(v.round ? new THREE.SphereGeometry(0.06, 8, 6) : new THREE.DodecahedronGeometry(0.06, 0), mat(c));
      m.scale.set(1, v.round ? 1 : 1.3, 1);
      m.position.set(0, 0.05, -0.04);
      g.add(m);
      box(g, 0.03, 0.03, 0.03, 0, 0.12, -0.04, a);
      muzzle.position.set(0, 0.05, -0.1);
      break;
    }
    case 'blade': {
      box(g, 0.035, 0.035, 0.18, 0, 0, 0.02, a);
      box(g, 0.1, 0.02, 0.03, 0, 0, -0.08, '#888');
      box(g, 0.012, 0.045, len, 0, 0.005, -0.08 - len / 2, c);
      if (v.glow) box(g, 0.004, 0.012, len, 0, 0.03, -0.08 - len / 2, v.glow, true);
      muzzle.position.set(0, 0, -0.08 - len);
      break;
    }
    case 'bow': {
      box(g, 0.03, 0.12, 0.03, 0, 0, 0, a);
      for (const s of [-1, 1]) {
        const limb = box(g, 0.025, len / 2, 0.03, 0, s * len / 4, -0.04, c);
        limb.rotation.x = s * 0.25;
      }
      box(g, 0.004, len * 0.95, 0.004, 0, 0, 0.06, '#eee');
      muzzle.position.set(0, 0.02, -0.1);
      break;
    }
    case 'crossbow': {
      box(g, 0.05, 0.05, len, 0, 0, -len / 2, c);
      box(g, 0.5, 0.03, 0.04, 0, 0.02, -len + 0.08, a);
      box(g, 0.035, 0.08, 0.05, 0, -0.06, 0.02, c);
      box(g, 0.01, 0.01, len * 0.7, 0, 0.04, -len * 0.55, '#bbb');
      muzzle.position.set(0, 0.04, -len);
      break;
    }
    case 'tube': {
      cyl(g, 0.055 * thick, len, 0, 0.03, -len / 2 + 0.1, c);
      cyl(g, 0.065 * thick, 0.08, 0, 0.03, -len + 0.12, a);
      box(g, 0.04, 0.12, 0.05, 0, -0.07, 0, '#222');
      if (v.quad) for (const [x, y] of [[-0.03, 0.06], [0.03, 0.06], [-0.03, 0], [0.03, 0]]) cyl(g, 0.02, 0.05, x, y, -len + 0.08, a);
      if (v.drumMag) cyl(g, 0.07, 0.12, 0, -0.03, -0.12, a, false, 6).rotation.set(0, 0, Math.PI / 2);
      if (v.glow) box(g, 0.02, 0.02, len * 0.6, 0, 0.1, -len / 2, v.glow, true);
      muzzle.position.set(0, 0.03, -len + 0.08);
      break;
    }
    case 'minigun': {
      const spin = new THREE.Group();
      spin.position.set(0, 0.02, 0);
      g.add(spin);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        cyl(spin, 0.014, len, Math.cos(ang) * 0.04, Math.sin(ang) * 0.04, -len / 2, c, false, 5);
      }
      g.userData.spinner = spin;
      cyl(g, 0.07, 0.2, 0, 0.02, -0.02, a);
      box(g, 0.04, 0.12, 0.06, 0, -0.08, 0.05, '#222');
      muzzle.position.set(0, 0.02, -len);
      break;
    }
    default: {
      // Generic firearm: receiver + barrel + grip + options.
      const rw = 0.05 * thick, rh = 0.07 * thick;
      box(g, rw, rh, len * 0.55, 0, 0.02, -len * 0.25, c);
      const bl = len * 0.5;
      if (v.double) {
        cyl(g, 0.016, bl, -0.018, 0.035, -len * 0.5 - bl / 2 + 0.05, c);
        cyl(g, 0.016, bl, 0.018, 0.035, -len * 0.5 - bl / 2 + 0.05, c);
      } else if (v.flared) {
        cyl(g, 0.03, bl, 0, 0.03, -len * 0.5 - bl / 2 + 0.05, c);
        cyl(g, 0.05, 0.06, 0, 0.03, -len * 0.5 - bl + 0.06, c);
      } else {
        cyl(g, 0.014 * thick, bl, 0, 0.035, -len * 0.5 - bl / 2 + 0.05, c);
      }
      box(g, 0.035, 0.1, 0.05, 0, -0.05, 0.02, v.grip ? a : '#222').rotation.x = 0.25;
      if (v.stock) box(g, 0.04, 0.07, 0.2, 0, 0, 0.16, a);
      if (v.foregrip) box(g, 0.03, 0.08, 0.04, 0, -0.04, -len * 0.45, a);
      if (v.pump) box(g, 0.05, 0.04, 0.14, 0, -0.005, -len * 0.55, a);
      if (v.mag === 'drum') cyl(g, 0.08, 0.05, 0, -0.07, -len * 0.3, '#1a1a1a', false, 10).rotation.set(0, 0, Math.PI / 2);
      if (v.mag === 'box') box(g, 0.03, 0.12, 0.04, 0, -0.08, -0.03, '#1a1a1a');
      if (v.mag === 'curved') { const m = box(g, 0.035, 0.14, 0.05, 0, -0.08, -len * 0.3, '#1a1a1a'); m.rotation.x = -0.35; }
      if (v.scope) { cyl(g, 0.022, 0.2, 0, 0.1, -len * 0.25, '#111'); box(g, 0.012, 0.03, 0.012, 0, 0.07, -len * 0.25, '#111'); }
      if (v.coils) for (let i = 0; i < 3; i++) cyl(g, 0.04, 0.02, 0, 0.035, -len * 0.4 - i * 0.06, v.accent, true);
      if (v.organic) { box(g, rw * 1.4, rh * 1.3, 0.12, 0, 0.03, -len * 0.3, a); }
      if (v.glow) box(g, 0.012, 0.012, len * 0.4, 0, 0.02 + rh / 2 + 0.004, -len * 0.25, v.glow, true);
      muzzle.position.set(0, 0.035, -len);
    }
  }
  g.userData.muzzle = muzzle;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}
