// Offline-style vertex light baking, PS2 style: level geometry is tessellated into ~1 m quads and every vertex
// gets ambient (hemisphere) light × ambient occlusion, plus each static point light and the sun with
// ray-traced shadows (soft via a few jittered samples). The result is stored as vertex colours and the
// level is rendered unlit (MeshBasicMaterial × vertex colour), exactly like console-era baked lighting.
//
// Units mirror three.js' Lambert shading (irradiance × albedo / π), so baked surfaces match the realtime-lit
// characters and props standing in them.
import * as THREE from 'three';

const INV_PI = 1 / Math.PI;

// Fixed cosine-weighted hemisphere directions around +Z (rotated to each normal).
const AO_DIRS = [];
{
  const n = 10;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, phi = i * 2.399963; // golden angle spiral
    const r = Math.sqrt(u), z = Math.sqrt(1 - u);
    AO_DIRS.push([Math.cos(phi) * r, Math.sin(phi) * r, z]);
  }
}

function basis(nx, ny, nz) {
  // tangent frame for normal n
  const ax = Math.abs(nx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  let tx = ny * ax[2] - nz * ax[1], ty = nz * ax[0] - nx * ax[2], tz = nx * ax[1] - ny * ax[0];
  const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
  const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
  return [tx, ty, tz, bx, by, bz];
}

/**
 * @param {import('./collision.js').CollisionWorld} world
 * @param {Float32Array|number[]} pos  flat xyz
 * @param {Float32Array|number[]} nrm  flat xyz
 * @param {{lights: THREE.PointLight[], env: object, aoRadius?: number, fullbright?: boolean}} opts
 * @returns {Float32Array} linear RGB per vertex
 */
export function bakeVertexColors(world, pos, nrm, { lights, env = {}, aoRadius = 1.4 }) {
  const count = pos.length / 3;
  const out = new Float32Array(count * 3);
  const sky = new THREE.Color(env.hemiSky || '#aabbdd').multiplyScalar(env.hemi ?? 0.9);
  const ground = new THREE.Color(env.hemiGround || '#443322').multiplyScalar(env.hemi ?? 0.9);
  const amb = new THREE.Color(env.ambient || '#404050').multiplyScalar(env.ambientIntensity ?? 0.6);
  const ls = lights.filter((l) => l.isPointLight && l.userData.bake !== false).map((l) => ({
    x: l.position.x, y: l.position.y, z: l.position.z,
    r: l.color.r * l.intensity, g: l.color.g * l.intensity, b: l.color.b * l.intensity,
    dist: l.distance || 1e9, decay: l.decay ?? 1,
  }));
  let sun = null;
  if (env.sun) {
    const d = new THREE.Vector3(...(env.sun.dir || [30, 50, 20])).normalize();
    const c = new THREE.Color(env.sun.color || '#fff').multiplyScalar(env.sun.intensity ?? 1.5);
    sun = { x: d.x, y: d.y, z: d.z, r: c.r, g: c.g, b: c.b };
  }
  const JIT = [[0, 0, 0], [0.3, 0.15, -0.2], [-0.25, -0.1, 0.3]];

  for (let i = 0; i < count; i++) {
    const nx = nrm[i * 3], ny = nrm[i * 3 + 1], nz = nrm[i * 3 + 2];
    const px = pos[i * 3] + nx * 0.04, py = pos[i * 3 + 1] + ny * 0.04, pz = pos[i * 3 + 2] + nz * 0.04;
    // --- ambient occlusion
    const [tx, ty, tz, bx, by, bz] = basis(nx, ny, nz);
    let occ = 0;
    for (const [a, b, c] of AO_DIRS) {
      const dx = tx * a + bx * b + nx * c, dy = ty * a + by * b + ny * c, dz = tz * a + bz * b + nz * c;
      const h = world.raycast(px, py, pz, dx, dy, dz, aoRadius);
      if (h) occ += 1 - h.t / aoRadius;
    }
    const ao = 1 - 0.85 * occ / AO_DIRS.length;
    // --- hemisphere + ambient
    const w = 0.5 * ny + 0.5;
    let r = (amb.r + ground.r + (sky.r - ground.r) * w) * ao;
    let g = (amb.g + ground.g + (sky.g - ground.g) * w) * ao;
    let b = (amb.b + ground.b + (sky.b - ground.b) * w) * ao;
    // --- point lights with soft ray-traced shadows
    for (const l of ls) {
      const lx = l.x - px, ly = l.y - py, lz = l.z - pz;
      const d = Math.hypot(lx, ly, lz);
      if (d >= l.dist) continue;
      const ndl = (nx * lx + ny * ly + nz * lz) / d;
      if (ndl <= 0) continue;
      const cut = 1 - (d / l.dist) ** 4;
      const fall = (1 / Math.max(d ** l.decay, 0.01)) * cut * cut;
      let vis = 0;
      for (const [jx, jy, jz] of JIT) if (world.lineOfSight(px, py, pz, l.x + jx, l.y + jy, l.z + jz)) vis++;
      if (vis === 0) continue;
      const k = ndl * fall * (vis / JIT.length);
      r += l.r * k; g += l.g * k; b += l.b * k;
    }
    // --- sun
    if (sun) {
      const ndl = nx * sun.x + ny * sun.y + nz * sun.z;
      if (ndl > 0 && !world.raycast(px, py, pz, sun.x, sun.y, sun.z, 250)) {
        r += sun.r * ndl; g += sun.g * ndl; b += sun.b * ndl;
      }
    }
    out[i * 3] = r * INV_PI; out[i * 3 + 1] = g * INV_PI; out[i * 3 + 2] = b * INV_PI;
  }
  return out;
}
