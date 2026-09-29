// Procedurally painted textures (128×128, bilinear + mipmaps) in a PS2-era style: hand-painted shading,
// bevel highlights, grime and colour variation baked into the texture. No external image assets.
//
// Painters draw in a 64-unit logical space (ctx is scaled ×2) so world-space texture scale is unchanged;
// per-pixel noise and fine details are applied at full resolution.
import * as THREE from 'three';

const SIZE = 64;   // logical painter units
const RES = 128;   // actual texture resolution
const cache = new Map();

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return `#${c.getHexString()}`;
}
function tint(hex, h, s, l) {
  const c = new THREE.Color(hex);
  c.offsetHSL(h, s, l);
  return `#${c.getHexString()}`;
}

/** Per-pixel value noise at full resolution (optionally chunky: `grain` pixels per cell). */
function noise(ctx, r, amount, grain = 1) {
  const img = ctx.getImageData(0, 0, RES, RES);
  const d = img.data;
  const cells = new Float32Array(Math.ceil(RES / grain) ** 2);
  for (let i = 0; i < cells.length; i++) cells[i] = (r() - 0.5) * amount;
  const cw = Math.ceil(RES / grain);
  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const n = cells[Math.floor(y / grain) * cw + Math.floor(x / grain)] + (r() - 0.5) * amount * 0.35;
      const i = (y * RES + x) * 4;
      d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n);
    }
  }
  ctx.putImageData(img, 0, 0);
}
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Soft grime blotches (multiply-ish darkening). */
function grime(ctx, r, n = 6, alpha = 0.08, color = '0,0,0') {
  for (let i = 0; i < n; i++) {
    const x = r() * SIZE, y = r() * SIZE, rad = 4 + r() * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    // draw wrapped so the texture still tiles
    for (const ox of [-SIZE, 0, SIZE]) for (const oy of [-SIZE, 0, SIZE]) ctx.fillRect(x - rad + ox, y - rad + oy, rad * 2, rad * 2);
  }
}

/** A raised/bevelled rectangle: fill + light top/left edge + dark bottom/right edge. */
function bevel(ctx, x, y, w, h, fill, hi = 0.12, lo = -0.18, e = 0.75) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = shade(fill, hi); ctx.fillRect(x, y, w, e); ctx.fillRect(x, y, e, h);
  ctx.fillStyle = shade(fill, lo); ctx.fillRect(x, y + h - e, w, e); ctx.fillRect(x + w - e, y, e, h);
}

const painters = {
  brick(ctx, r, { base = '#8a3b2a', mortar = '#b9a58c' } = {}) {
    ctx.fillStyle = shade(mortar, -0.08); ctx.fillRect(0, 0, SIZE, SIZE);
    const bh = 8, bw = 16;
    for (let y = 0; y < SIZE; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < SIZE + bw; x += bw) {
        const c = tint(base, (r() - 0.5) * 0.02, (r() - 0.5) * 0.1, (r() - 0.5) * 0.12);
        bevel(ctx, x + off + 0.6, y + 0.6, bw - 1.2, bh - 1.2, c, 0.08, -0.14, 0.6);
        if (r() < 0.25) { ctx.fillStyle = shade(c, -0.1); ctx.fillRect(x + off + 2 + r() * 8, y + 2 + r() * 3, 2, 1); }
      }
    }
    grime(ctx, r, 5, 0.1);
    noise(ctx, r, 18, 2);
  },
  wood(ctx, r, { base = '#7a4a24' } = {}) {
    for (let x = 0; x < SIZE; x += 16) {
      const c = tint(base, 0, (r() - 0.5) * 0.08, (r() - 0.5) * 0.1);
      const g = ctx.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, shade(c, 0.05)); g.addColorStop(0.5, c); g.addColorStop(1, shade(c, -0.06));
      ctx.fillStyle = g; ctx.fillRect(x, 0, 16, SIZE);
      ctx.strokeStyle = shade(c, -0.1); ctx.lineWidth = 0.35;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        const gx = x + 1 + r() * 14;
        ctx.moveTo(gx, 0);
        for (let y = 0; y <= SIZE; y += 8) ctx.lineTo(gx + Math.sin(y * 0.15 + i) * 0.8, y);
        ctx.stroke();
      }
      if (r() < 0.6) { ctx.fillStyle = shade(c, -0.18); ctx.beginPath(); ctx.ellipse(x + 4 + r() * 8, r() * SIZE, 1.2, 2, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = shade(c, -0.28); ctx.fillRect(x, 0, 0.6, SIZE);
      ctx.fillStyle = shade(c, 0.12); ctx.fillRect(x + 0.6, 0, 0.4, SIZE);
      ctx.fillStyle = shade(c, -0.22); ctx.fillRect(x, (r() * 4 | 0) * 16, 16, 0.5);
    }
    noise(ctx, r, 10);
  },
  planks(ctx, r, opts) { painters.wood(ctx, r, opts); },
  tiles(ctx, r, { a = '#e8e2d0', b = '#2b2b2b', n = 4 } = {}) {
    const s = SIZE / n;
    ctx.fillStyle = '#6a665e'; ctx.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const base = (x + y) % 2 ? a : b;
      const c = shade(base, (r() - 0.5) * 0.05);
      bevel(ctx, x * s + 0.35, y * s + 0.35, s - 0.7, s - 0.7, c, 0.1, -0.1, 0.5);
      const g = ctx.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
      g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.06)');
      ctx.fillStyle = g; ctx.fillRect(x * s + 0.35, y * s + 0.35, s - 0.7, s - 0.7);
    }
    grime(ctx, r, 4, 0.05);
    noise(ctx, r, 7);
  },
  carpet(ctx, r, { base = '#7a1020', accent = '#d4a93a' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = shade(base, -0.06);
    for (let i = 0; i < SIZE; i += 4) { ctx.fillRect(i, 0, 1, SIZE); ctx.fillRect(0, i, SIZE, 1); }
    ctx.strokeStyle = shade(accent, -0.25); ctx.lineWidth = 2.6;
    const diamonds = () => {
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const o = i * 32;
        ctx.moveTo(16 + o, 4); ctx.lineTo(28 + o, 16); ctx.lineTo(16 + o, 28); ctx.lineTo(4 + o, 16); ctx.closePath();
        ctx.moveTo(16 + o, 36); ctx.lineTo(28 + o, 48); ctx.lineTo(16 + o, 60); ctx.lineTo(4 + o, 48); ctx.closePath();
      }
      ctx.stroke();
    };
    diamonds();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.4; diamonds();
    ctx.fillStyle = accent;
    for (const [x, y] of [[16, 16], [48, 16], [16, 48], [48, 48], [0, 0], [32, 32], [0, 32], [32, 0]]) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
    noise(ctx, r, 28);
  },
  wallpaper(ctx, r, { base = '#3d5a3a', accent = '#c9b37a' } = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, SIZE);
    g.addColorStop(0, shade(base, 0.04)); g.addColorStop(1, shade(base, -0.04));
    ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = shade(base, -0.05);
    for (let x = 0; x < SIZE; x += 16) ctx.fillRect(x + 8, 0, 3, SIZE);
    ctx.fillStyle = accent;
    for (let x = 4; x < SIZE; x += 16) {
      ctx.fillRect(x, 0, 1, SIZE); ctx.fillRect(x + 2.5, 0, 0.5, SIZE);
      for (let y = 6; y < SIZE; y += 16) {
        // little fleur motif
        ctx.beginPath(); ctx.moveTo(x + 7, y); ctx.lineTo(x + 9.5, y + 3); ctx.lineTo(x + 7, y + 6); ctx.lineTo(x + 4.5, y + 3); ctx.closePath(); ctx.fill();
        ctx.fillRect(x + 6.6, y + 6, 0.8, 3);
      }
    }
    grime(ctx, r, 6, 0.06);
    noise(ctx, r, 9);
  },
  concrete(ctx, r, { base = '#8c8c86' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 22, 4);
    grime(ctx, r, 9, 0.09);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.35;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); let x = r() * SIZE, y = r() * SIZE; ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 10; y += (r() - 0.5) * 10; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    noise(ctx, r, 16);
  },
  asphalt(ctx, r, { base = '#2c2d31' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 18, 3);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(200,200,200,${0.05 + r() * 0.1})`; ctx.fillRect(r() * SIZE, r() * SIZE, 0.6, 0.6); }
    grime(ctx, r, 5, 0.15);
    // wet sheen patches
    grime(ctx, r, 3, 0.07, '150,170,210');
    noise(ctx, r, 18);
  },
  metal(ctx, r, { base = '#6c7680' } = {}) {
    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    g.addColorStop(0, shade(base, 0.08)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, -0.08));
    ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = shade(base, 0.14); ctx.fillRect(0, 0, SIZE, 1.2); ctx.fillRect(0, 0, 1.2, SIZE);
    ctx.fillStyle = shade(base, -0.2); ctx.fillRect(0, SIZE - 1.2, SIZE, 1.2); ctx.fillRect(SIZE - 1.2, 0, 1.2, SIZE);
    for (const [x, y] of [[5, 5], [SIZE - 6, 5], [5, SIZE - 6], [SIZE - 6, SIZE - 6], [SIZE / 2, 5], [SIZE / 2, SIZE - 6]]) {
      ctx.fillStyle = shade(base, -0.25); ctx.beginPath(); ctx.arc(x + 0.3, y + 0.3, 1.3, 0, 7); ctx.fill();
      ctx.fillStyle = shade(base, 0.2); ctx.beginPath(); ctx.arc(x, y, 1, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.3;
    for (let i = 0; i < 14; i++) { const x = r() * SIZE, y = r() * SIZE; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 10, y + (r() - 0.5) * 3); ctx.stroke(); }
    grime(ctx, r, 4, 0.08);
    noise(ctx, r, 8);
  },
  grate(ctx, r, { base = '#4a4f55' } = {}) {
    ctx.fillStyle = shade(base, -0.3); ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < SIZE; i += 8) {
      bevel(ctx, i, 0, 3, SIZE, base, 0.15, -0.15, 0.6);
      bevel(ctx, 0, i, SIZE, 3, shade(base, 0.03), 0.15, -0.15, 0.6);
    }
    noise(ctx, r, 10);
  },
  stone(ctx, r, { base = '#7d776a' } = {}) {
    ctx.fillStyle = shade(base, -0.28); ctx.fillRect(0, 0, SIZE, SIZE);
    const rows = 4, h = SIZE / rows;
    for (let y = 0; y < rows; y++) {
      let x = y % 2 ? -10 : 0;
      while (x < SIZE) {
        const w = 14 + r() * 16;
        const c = tint(base, (r() - 0.5) * 0.03, (r() - 0.5) * 0.08, (r() - 0.5) * 0.14);
        ctx.fillStyle = c;
        ctx.beginPath();
        const x0 = x + 0.8, y0 = y * h + 0.8, x1 = x + w - 0.8, y1 = y * h + h - 0.8;
        ctx.moveTo(x0 + 1.5, y0); ctx.lineTo(x1 - 1, y0); ctx.lineTo(x1, y0 + 1.5); ctx.lineTo(x1, y1 - 1); ctx.lineTo(x1 - 1.5, y1);
        ctx.lineTo(x0 + 1, y1); ctx.lineTo(x0, y1 - 1.5); ctx.lineTo(x0, y0 + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = shade(c, 0.1); ctx.fillRect(x0 + 1.5, y0, x1 - x0 - 3, 0.8);
        ctx.fillStyle = shade(c, -0.15); ctx.fillRect(x0 + 1, y1 - 0.8, x1 - x0 - 2, 0.8);
        if (r() < 0.3) { ctx.fillStyle = 'rgba(70,110,50,0.35)'; ctx.fillRect(x0, y1 - 2.5, w * 0.6, 2.5); }
        x += w;
      }
    }
    grime(ctx, r, 5, 0.12);
    noise(ctx, r, 20, 2);
  },
  neon(ctx, r, { base = '#15122a', accent = '#ff2bd6' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    for (let x = 0; x < SIZE; x += 16) bevel(ctx, x + 0.5, 0, 15, SIZE, shade(base, 0.03), 0.06, -0.06, 0.5);
    const g = ctx.createLinearGradient(0, 26, 0, 38);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, accent); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 26, SIZE, 12);
    ctx.fillStyle = shade(accent, 0.25); ctx.fillRect(0, 31.2, SIZE, 1.6);
    ctx.fillStyle = shade(accent, -0.3);
    ctx.fillRect(0, 10, SIZE, 0.6); ctx.fillRect(0, 52, SIZE, 0.6);
    noise(ctx, r, 7);
  },
  panel(ctx, r, { base = '#c9d2d8', accent = '#39424a' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    bevel(ctx, 1, 1, SIZE - 2, SIZE - 2, base, 0.08, -0.12, 0.8);
    bevel(ctx, 8, 8, 20, 12, shade(base, -0.04), -0.1, 0.08, 0.6);
    ctx.fillStyle = accent; ctx.fillRect(40, 44, 16, 3);
    ctx.fillStyle = '#3f3'; ctx.fillRect(42, 50, 2, 2); ctx.fillStyle = '#f93'; ctx.fillRect(46, 50, 2, 2);
    ctx.strokeStyle = shade(base, -0.2); ctx.lineWidth = 0.4;
    for (let y = 30; y < 40; y += 2) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(30, y); ctx.stroke(); }
    grime(ctx, r, 3, 0.06);
    noise(ctx, r, 8);
  },
  plaster(ctx, r, { base = '#d8cba8' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 12, 3);
    grime(ctx, r, 5, 0.06);
    noise(ctx, r, 8);
  },
  flat(ctx, r, { base = '#888888' } = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, SIZE);
    g.addColorStop(0, shade(base, 0.03)); g.addColorStop(1, shade(base, -0.03));
    ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 6);
  },
  checker(ctx, r, { a = '#ffcc00', b = '#222222' } = {}) { painters.tiles(ctx, r, { a, b, n: 2 }); },
  glass(ctx, r, { base = '#9ad7ff' } = {}) {
    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    g.addColorStop(0, shade(base, 0.15)); g.addColorStop(1, shade(base, -0.1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.save(); ctx.translate(20, 0); ctx.rotate(0.35);
    ctx.fillRect(0, -10, 4, 90); ctx.fillRect(8, -10, 1.5, 90);
    ctx.restore();
  },
  hazard(ctx, r, { a = '#f4c20d', b = '#1a1a1a' } = {}) {
    ctx.fillStyle = b; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = a;
    for (let i = -SIZE; i < SIZE * 2; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 8, 0); ctx.lineTo(i + 8 - SIZE, SIZE); ctx.lineTo(i - SIZE, SIZE); ctx.fill();
    }
    grime(ctx, r, 6, 0.18);
    noise(ctx, r, 12);
  },
};

export function makeTexture(kind, opts = {}, seed = 7) {
  const key = kind + JSON.stringify(opts) + seed;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = RES;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.save();
  ctx.scale(RES / SIZE, RES / SIZE);
  (painters[kind] || painters.flat)(ctx, rng(seed), opts);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;           // PS2 hardware filtered bilinearly
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/**
 * Shared uniforms for dynamic "flash" lights (muzzle flashes, explosions) on baked, unlit level surfaces.
 * effects.js writes these every frame.
 */
export const FLASH_COUNT = 3;
export const flashUniforms = {
  uFlashPos: { value: Array.from({ length: FLASH_COUNT }, () => new THREE.Vector3(0, -1000, 0)) },
  uFlashColor: { value: Array.from({ length: FLASH_COUNT }, () => new THREE.Color(0, 0, 0)) },
  uFlashDist: { value: new Array(FLASH_COUNT).fill(1) },
};

function injectFlashLights(m) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, flashUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFlashWP;\nvarying vec3 vFlashWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFlashWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvFlashWN = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vFlashWP;
varying vec3 vFlashWN;
uniform vec3 uFlashPos[${FLASH_COUNT}];
uniform vec3 uFlashColor[${FLASH_COUNT}];
uniform float uFlashDist[${FLASH_COUNT}];`)
      .replace('#include <opaque_fragment>', `
vec3 flashLight = vec3(0.0);
for (int i = 0; i < ${FLASH_COUNT}; i++) {
  vec3 L = uFlashPos[i] - vFlashWP;
  float d = length(L);
  float a = clamp(1.0 - d / uFlashDist[i], 0.0, 1.0);
  flashLight += uFlashColor[i] * a * a * max(dot(vFlashWN, L / max(d, 0.001)), 0.0);
}
outgoingLight += diffuseColor.rgb * flashLight;
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'flashlit';
}

/**
 * Material palette. A material spec is { tex, opts, color, emissive, scale, transparent, opacity }.
 * `scale` = texture repeats per metre.
 * `material()`      → lit Lambert material (dynamic objects, props).
 * `bakedMaterial()` → unlit material that multiplies the texture by per-vertex baked lighting
 *                     (static level geometry) and adds dynamic flash lights.
 */
const matCache = new Map();
export function material(spec) {
  const key = JSON.stringify(spec);
  if (matCache.has(key)) return matCache.get(key);
  const params = {};
  if (spec.tex) params.map = makeTexture(spec.tex, spec.opts || {}, spec.seed || 7);
  if (spec.color) params.color = new THREE.Color(spec.color);
  if (spec.emissive) {
    params.emissive = new THREE.Color(spec.emissive);
    params.emissiveIntensity = spec.emissiveIntensity ?? 1;
    if (params.map) params.emissiveMap = params.map;
  }
  if (spec.transparent) { params.transparent = true; params.opacity = spec.opacity ?? 0.5; params.depthWrite = false; }
  const m = new THREE.MeshLambertMaterial(params);
  m.userData.scale = spec.scale ?? 0.5;
  m.userData.spec = spec;
  matCache.set(key, m);
  return m;
}

const bakedCache = new Map();
export function bakedMaterial(spec) {
  const key = JSON.stringify(spec);
  if (bakedCache.has(key)) return bakedCache.get(key);
  const params = { vertexColors: true };
  if (spec.tex) params.map = makeTexture(spec.tex, spec.opts || {}, spec.seed || 7);
  params.color = new THREE.Color(spec.color || '#ffffff');
  if (spec.emissive) params.color.multiplyScalar(1.6 * (spec.emissiveIntensity ?? 1)); // over-bright → bloom
  if (spec.transparent) { params.transparent = true; params.opacity = spec.opacity ?? 0.5; params.depthWrite = false; }
  const m = new THREE.MeshBasicMaterial(params);
  if (!spec.emissive) injectFlashLights(m);
  m.userData.scale = spec.scale ?? 0.5;
  m.userData.spec = spec;
  m.userData.emissive = !!spec.emissive;
  bakedCache.set(key, m);
  return m;
}

/** Soft radial glow sprite texture (light halos, blob shadows, muzzle flashes). */
const radialCache = new Map();
export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 64, mid = null) {
  const key = inner + outer + size + mid;
  if (radialCache.has(key)) return radialCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  if (mid) g.addColorStop(0.35, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  radialCache.set(key, t);
  return t;
}

/** Canvas texture with text (signs, posters). */
export function textTexture(text, { fg = '#ff3bd6', bg = '#140c1a', w = 256, h = 64, font = 'bold 40px "Arial Black", Impact, sans-serif', glow = true } = {}) {
  const key = 'txt' + text + fg + bg + w + h + font;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // shrink the font until the text fits inside the sign
  const m = /(\d+)px/.exec(font);
  if (m && ctx.measureText) {
    let px = +m[1];
    while (px > 8 && ctx.measureText(text).width > w * 0.88) { px -= 2; ctx.font = font.replace(/\d+px/, `${px}px`); }
  }
  if (glow) { ctx.shadowColor = fg; ctx.shadowBlur = 14; }
  ctx.fillStyle = fg;
  ctx.fillText(text, w / 2, h / 2 + 2);
  if (glow) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(text, w / 2, h / 2 + 2); ctx.fillStyle = fg; ctx.globalAlpha = 0.6; ctx.fillText(text, w / 2, h / 2 + 2); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
