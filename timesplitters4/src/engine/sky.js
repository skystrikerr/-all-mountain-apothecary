// Painted sky domes (equirectangular canvas on a big inverted sphere): gradient, stars, moon/sun with glow,
// soft clouds, and distant silhouettes (city skyline with lit windows, or rolling hills).
import * as THREE from 'three';

function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/**
 * opts: { top, mid, horizon, bottom, stars, moon: {u, v, r, color}, sun: {...}, clouds: {count, color, alpha},
 *         skyline: {color, windows}, hills: {color} }
 * u/v are 0..1 across the canvas (u = heading, v = 0 top … 0.5 horizon).
 */
export function makeSky(opts) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = rng(opts.seed || 3);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, opts.top); g.addColorStop(0.32, opts.mid || opts.top); g.addColorStop(0.5, opts.horizon); g.addColorStop(0.56, opts.bottom || opts.horizon); g.addColorStop(1, opts.bottom || opts.horizon);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (opts.stars) {
    for (let i = 0; i < opts.stars; i++) {
      const y = Math.pow(r(), 1.6) * H * 0.46;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
      const s = r() < 0.1 ? 2 : 1;
      ctx.fillRect(r() * W, y, s, s);
    }
  }
  for (const body of [opts.moon, opts.sun].filter(Boolean)) {
    const x = body.u * W, y = body.v * H, rad = body.r;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, rad * 6);
    glow.addColorStop(0, body.glow || 'rgba(255,240,200,0.55)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - rad * 6, y - rad * 6, rad * 12, rad * 12);
    ctx.fillStyle = body.color; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    if (body.craters) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * rad, y + (r() - 0.5) * rad, rad * (0.1 + r() * 0.2), 0, 7); ctx.fill(); } }
  }
  if (opts.clouds) {
    const { count = 18, color = '255,255,255', alpha = 0.25 } = opts.clouds;
    for (let i = 0; i < count; i++) {
      const cx = r() * W, cy = H * (0.18 + r() * 0.28), w = 60 + r() * 160;
      for (let k = 0; k < 7; k++) {
        const x = cx + (r() - 0.5) * w, y = cy + (r() - 0.5) * 14, rad = 12 + r() * 26;
        const cg = ctx.createRadialGradient(x, y, 0, x, y, rad);
        cg.addColorStop(0, `rgba(${color},${alpha})`); cg.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = cg;
        for (const ox of [-W, 0, W]) ctx.fillRect(x - rad + ox, y - rad, rad * 2, rad * 2);
      }
    }
  }
  const horizon = H * 0.5;
  if (opts.hills) {
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? opts.hills.color : opts.hills.far || opts.hills.color;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, horizon - 10 - layer * -6 - (Math.sin(x * 0.012 + layer * 2) * 10 + Math.sin(x * 0.031 + layer) * 6 + 12) * (layer ? 0.8 : 1.4));
      ctx.lineTo(W, H); ctx.fill();
    }
  }
  if (opts.skyline) {
    let x = 0;
    while (x < W) {
      const bw = 18 + r() * 40, bh = 12 + r() * 60 * (r() < 0.15 ? 2 : 1);
      ctx.fillStyle = opts.skyline.color; ctx.fillRect(x, horizon - bh, bw, bh + 40);
      if (r() < 0.2) ctx.fillRect(x + bw / 2 - 1, horizon - bh - 14, 2, 14); // antenna
      if (opts.skyline.windows) {
        for (let wy = horizon - bh + 4; wy < horizon; wy += 5) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
          if (r() < 0.28) { ctx.fillStyle = r() < 0.8 ? 'rgba(255,210,120,0.85)' : 'rgba(160,220,255,0.8)'; ctx.fillRect(wx, wy, 2, 2); }
        }
      }
      x += bw + r() * 4;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  mesh.renderOrder = -10;
  mesh.rotation.y = opts.rotation || 0;
  return mesh;
}

/** Falling rain streaks inside an axis-aligned box. Returns { object, update(dt) }. */
export function makeRain({ minX, maxX, minZ, maxZ, top = 16, count = 2200, speed = 20 }) {
  const pos = new Float32Array(count * 6);
  const drops = [];
  for (let i = 0; i < count; i++) {
    const d = { x: minX + Math.random() * (maxX - minX), y: Math.random() * top, z: minZ + Math.random() * (maxZ - minZ), v: speed * (0.8 + Math.random() * 0.4) };
    drops.push(d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#a8b8d8', transparent: true, opacity: 0.32, depthWrite: false }));
  lines.frustumCulled = false;
  return {
    object: lines,
    update(dt) {
      for (let i = 0; i < count; i++) {
        const d = drops[i];
        d.y -= d.v * dt;
        d.x += dt * 1.5;
        if (d.y < 0) { d.y += top; d.x = minX + Math.random() * (maxX - minX); }
        if (d.x > maxX) d.x -= maxX - minX;
        pos[i * 6] = d.x; pos[i * 6 + 1] = d.y; pos[i * 6 + 2] = d.z;
        pos[i * 6 + 3] = d.x - 0.03; pos[i * 6 + 4] = d.y + 0.45; pos[i * 6 + 5] = d.z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
