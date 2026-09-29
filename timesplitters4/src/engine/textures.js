// Procedurally painted low-res textures (64x64, nearest filtered) for a PS2-era look.
// No external image assets: every surface is generated at startup from a small painter function.
import * as THREE from 'three';

const SIZE = 64;
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

function noise(ctx, r, amount, size = SIZE) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    img.data[i] = clamp(img.data[i] + n);
    img.data[i + 1] = clamp(img.data[i + 1] + n);
    img.data[i + 2] = clamp(img.data[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

const painters = {
  brick(ctx, r, { base = '#8a3b2a', mortar = '#b9a58c' } = {}) {
    ctx.fillStyle = mortar; ctx.fillRect(0, 0, SIZE, SIZE);
    const bh = 8, bw = 16;
    for (let y = 0; y < SIZE; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < SIZE + bw; x += bw) {
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.12);
        ctx.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
      }
    }
    noise(ctx, r, 22);
  },
  wood(ctx, r, { base = '#7a4a24' } = {}) {
    for (let x = 0; x < SIZE; x += 16) {
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.1);
      ctx.fillRect(x, 0, 16, SIZE);
      ctx.fillStyle = shade(base, -0.15);
      ctx.fillRect(x, 0, 1, SIZE);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = shade(base, -0.06 - r() * 0.06);
        ctx.fillRect(x + 2 + r() * 12, r() * SIZE, 1, 6 + r() * 20);
      }
    }
    noise(ctx, r, 14);
  },
  planks(ctx, r, opts) { painters.wood(ctx, r, opts); },
  tiles(ctx, r, { a = '#e8e2d0', b = '#2b2b2b', n = 4 } = {}) {
    const s = SIZE / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? a : b;
      ctx.fillRect(x * s, y * s, s, s);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, SIZE); ctx.moveTo(0, i * s); ctx.lineTo(SIZE, i * s); ctx.stroke(); }
    noise(ctx, r, 10);
  },
  carpet(ctx, r, { base = '#7a1020', accent = '#d4a93a' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      const o = i * 32;
      ctx.moveTo(16 + o, 4); ctx.lineTo(28 + o, 16); ctx.lineTo(16 + o, 28); ctx.lineTo(4 + o, 16); ctx.closePath();
      ctx.moveTo(16 + o, 36); ctx.lineTo(28 + o, 48); ctx.lineTo(16 + o, 60); ctx.lineTo(4 + o, 48); ctx.closePath();
    }
    ctx.stroke();
    noise(ctx, r, 26);
  },
  wallpaper(ctx, r, { base = '#3d5a3a', accent = '#c9b37a' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = accent;
    for (let x = 4; x < SIZE; x += 16) {
      ctx.fillRect(x, 0, 2, SIZE);
      for (let y = 6; y < SIZE; y += 16) { ctx.fillRect(x + 5, y, 4, 4); }
    }
    ctx.fillStyle = shade(base, -0.12);
    ctx.fillRect(0, SIZE - 10, SIZE, 10);
    noise(ctx, r, 12);
  },
  concrete(ctx, r, { base = '#8c8c86' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 40);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 10; i++) ctx.fillRect(r() * SIZE, r() * SIZE, 1 + r() * 6, 1);
  },
  asphalt(ctx, r, { base = '#2c2d31' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 34);
  },
  metal(ctx, r, { base = '#6c7680' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = shade(base, 0.1);
    ctx.fillRect(0, 0, SIZE, 2); ctx.fillRect(0, 0, 2, SIZE);
    ctx.fillStyle = shade(base, -0.15);
    ctx.fillRect(0, SIZE - 2, SIZE, 2); ctx.fillRect(SIZE - 2, 0, 2, SIZE);
    ctx.fillStyle = shade(base, -0.25);
    for (const [x, y] of [[6, 6], [SIZE - 8, 6], [6, SIZE - 8], [SIZE - 8, SIZE - 8]]) ctx.fillRect(x, y, 2, 2);
    noise(ctx, r, 12);
  },
  grate(ctx, r, { base = '#4a4f55' } = {}) {
    ctx.fillStyle = shade(base, -0.2); ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = base;
    for (let i = 0; i < SIZE; i += 8) { ctx.fillRect(i, 0, 3, SIZE); ctx.fillRect(0, i, SIZE, 3); }
    noise(ctx, r, 10);
  },
  stone(ctx, r, { base = '#7d776a' } = {}) {
    ctx.fillStyle = shade(base, -0.2); ctx.fillRect(0, 0, SIZE, SIZE);
    const rows = 4, h = SIZE / rows;
    for (let y = 0; y < rows; y++) {
      let x = y % 2 ? -10 : 0;
      while (x < SIZE) {
        const w = 14 + r() * 16;
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.16);
        ctx.fillRect(x + 1, y * h + 1, w - 2, h - 2);
        x += w;
      }
    }
    noise(ctx, r, 30);
  },
  neon(ctx, r, { base = '#15122a', accent = '#ff2bd6' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 30, SIZE, 3);
    ctx.fillStyle = shade(accent, -0.25);
    ctx.fillRect(0, 10, SIZE, 1); ctx.fillRect(0, 52, SIZE, 1);
    noise(ctx, r, 8);
  },
  panel(ctx, r, { base = '#c9d2d8', accent = '#39424a' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = accent; ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 2.5, SIZE - 5, SIZE - 5);
    ctx.strokeRect(8.5, 8.5, 20, 12);
    ctx.fillStyle = accent; ctx.fillRect(40, 44, 16, 4);
    noise(ctx, r, 10);
  },
  plaster(ctx, r, { base = '#d8cba8' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 16);
  },
  flat(ctx, r, { base = '#888888' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, r, 8);
  },
  checker(ctx, r, { a = '#ffcc00', b = '#222222' } = {}) { painters.tiles(ctx, r, { a, b, n: 2 }); },
  glass(ctx, r, { base = '#9ad7ff' } = {}) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(10, 8, 3, 40); ctx.fillRect(16, 8, 1, 30);
  },
  hazard(ctx, r, { a = '#f4c20d', b = '#1a1a1a' } = {}) {
    ctx.fillStyle = b; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = a;
    for (let i = -SIZE; i < SIZE * 2; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 8, 0); ctx.lineTo(i + 8 - SIZE, SIZE); ctx.lineTo(i - SIZE, SIZE); ctx.fill();
    }
    noise(ctx, r, 10);
  },
};

export function makeTexture(kind, opts = {}, seed = 7) {
  const key = kind + JSON.stringify(opts) + seed;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  (painters[kind] || painters.flat)(ctx, rng(seed), opts);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  cache.set(key, tex);
  return tex;
}

/**
 * Material palette. A material spec is { tex, opts, color, emissive, scale, transparent, opacity }.
 * `scale` = texture repeats per metre.
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
  matCache.set(key, m);
  return m;
}

/** Canvas texture with text (signs, posters). */
export function textTexture(text, { fg = '#ff3bd6', bg = '#140c1a', w = 256, h = 64, font = 'bold 40px "Arial Black", Impact, sans-serif', glow = true } = {}) {
  const key = 'txt' + text + fg + bg + w + h + font;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (glow) { ctx.shadowColor = fg; ctx.shadowBlur = 12; }
  ctx.fillStyle = fg;
  ctx.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
