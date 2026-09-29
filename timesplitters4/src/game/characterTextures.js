// Painted character textures, UV-mapped onto the sculpted character geometry:
//   headTexture  – 512×256 equirectangular wrap for the sculpted head (skin shading, brows, eyelids/lashes,
//                  lips, nostrils, blush, stubble, freckles, hairline, zombie stitches)
//   shirtTexture – 256×128 wrap around the lathed torso (front at u = 0.5): collars, plackets, buttons,
//                  pockets, suit lapels & shirt V, uniforms, chainmail, robot plating, seams and folds
//   fabricWrap   – sleeves / trousers wrap with side seams, folds and fly
//   skinTexture  – subtle pore/noise map for hands, neck, ears
import * as THREE from 'three';

const cache = new Map();

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function shade(hex, amt) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, amt); return `#${c.getHexString()}`; }
function rgba(hex, a) { const c = new THREE.Color(hex); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`; }

function canvasTex(key, w, h, paint) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  paint(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Fine grain noise, done on the pixel buffer in one pass (much faster than thousands of fillRects). */
function speckle(ctx, w, h, amount, alpha = 0.05) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const p = Math.min(1, amount / (w * h)) * 2, a = alpha * 255 * 2;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.random() > p) continue;
    const n = (Math.random() - 0.5) * a;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export function isFeminine(look) {
  return ['bob', 'bun'].includes(look.hat) || ['ponytail', 'pigtails'].includes(look.hair2) || (look.extras || []).includes('pearls') || look.feminine;
}

/**
 * Head wrap texture. `feat` gives UV positions of facial features measured on the sculpted mesh:
 * { eyeL, eyeR, browL, browR, mouth, nose, chin, cheekL, cheekR } each [u, v].
 * `hairAt(u, v)` → true where the scalp should be painted with hair colour.
 */
export function headTexture(character, feat, hairAt) {
  const look = character.look;
  return canvasTex('head:' + character.id, 512, 256, (ctx, W, H) => {
    const r = hash(character.id);
    const skin = look.skin || '#e0b090';
    const zombie = look.head === 'zombie';
    const fem = isFeminine(look);
    const P = ([u, v]) => [u * W, (1 - v) * H];
    ctx.fillStyle = skin; ctx.fillRect(0, 0, W, H);
    // broad shading: darker towards the neck/jaw underside and the back of the head
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(0.72, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    speckle(ctx, W, H, 6000, 0.035);
    const [ex, ey] = P(feat.eyeL), [fx, fy] = P(feat.eyeR);
    const dist = Math.abs(fx - ex);
    const eyeW = dist * 0.2;
    // eye socket shadows
    for (const [x, y] of [[ex, ey], [fx, fy]]) {
      const sg = ctx.createRadialGradient(x, y, 1, x, y, eyeW * 1.6);
      sg.addColorStop(0, rgba(shade(skin, -0.25), zombie ? 0.8 : 0.45)); sg.addColorStop(1, rgba(skin, 0));
      ctx.fillStyle = sg; ctx.fillRect(x - eyeW * 2, y - eyeW * 2, eyeW * 4, eyeW * 4);
    }
    // eyelids & lashes (the eyeballs themselves are 3D)
    ctx.strokeStyle = fem ? '#120a08' : rgba(shade(skin, -0.45), 0.9); ctx.lineWidth = fem ? 3 : 2;
    for (const [x, y] of [[ex, ey], [fx, fy]]) {
      ctx.beginPath(); ctx.ellipse(x, y, eyeW, eyeW * 0.55, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      if (fem) { for (let k = 0; k < 4; k++) { const a = Math.PI * (1.15 + k * 0.2); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * eyeW, y + Math.sin(a) * eyeW * 0.55); ctx.lineTo(x + Math.cos(a) * eyeW * 1.3, y + Math.sin(a) * eyeW * 0.8); ctx.stroke(); } }
      ctx.strokeStyle = rgba(shade(skin, -0.3), 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y + eyeW * 0.25, eyeW * 0.9, eyeW * 0.5, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); // under-eye crease
      ctx.strokeStyle = fem ? '#120a08' : rgba(shade(skin, -0.45), 0.9); ctx.lineWidth = fem ? 3 : 2;
    }
    // eyebrows
    const browCol = look.hair && look.hair !== look.skin ? shade(look.hair, -0.05) : shade(skin, -0.35);
    const tilt = ((r >> 3) % 3) - 1;
    for (const [bp, s] of [[feat.browL, -1], [feat.browR, 1]]) {
      const [x, y] = P(bp);
      ctx.save(); ctx.translate(x, y); ctx.rotate(s * tilt * 0.2);
      ctx.fillStyle = browCol;
      const bw = eyeW * 1.35, bh = fem ? 1.6 : 2.2 + (r % 3) * 0.6;
      ctx.beginPath(); ctx.moveTo(-bw, bh * 0.4); ctx.quadraticCurveTo(0, -bh * 1.2, bw, bh * 0.2); ctx.lineTo(bw, bh * 0.9); ctx.quadraticCurveTo(0, -bh * 0.1, -bw, bh * 1.3); ctx.fill();
      ctx.restore();
    }
    // nose shading & nostrils
    const [nx, ny] = P(feat.nose);
    ctx.fillStyle = rgba(shade(skin, -0.3), 0.35);
    ctx.beginPath(); ctx.ellipse(nx, ny + 3, dist * 0.14, dist * 0.06, 0, 0, 7); ctx.fill();
    ctx.fillStyle = rgba('#2a1510', 0.55);
    ctx.beginPath(); ctx.ellipse(nx - dist * 0.07, ny + 4, 1.8, 1.2, 0.3, 0, 7); ctx.ellipse(nx + dist * 0.07, ny + 4, 1.8, 1.2, -0.3, 0, 7); ctx.fill();
    // cheeks
    for (const cp of [feat.cheekL, feat.cheekR]) {
      const [x, y] = P(cp);
      const cg = ctx.createRadialGradient(x, y, 0, x, y, dist * 0.3);
      cg.addColorStop(0, fem ? 'rgba(230,90,110,0.28)' : 'rgba(200,90,80,0.1)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(x - dist * 0.4, y - dist * 0.4, dist * 0.8, dist * 0.8);
    }
    // mouth: lip colour, parting line, corners (3D lips sit on top)
    const [mx, my] = P(feat.mouth);
    const mw = dist * (fem ? 0.24 : 0.28);
    ctx.fillStyle = zombie ? '#3a2830' : fem ? '#b83248' : rgba(shade(skin, -0.2), 0.9);
    ctx.beginPath(); ctx.ellipse(mx, my, mw, dist * 0.06, 0, 0, 7); ctx.fill();
    const mood = (r >> 7) % 4;
    ctx.strokeStyle = zombie ? '#150808' : '#3a1414'; ctx.lineWidth = 2;
    ctx.beginPath();
    const curve = mood === 0 ? 3 : mood === 3 ? -2.5 : 0;
    ctx.lineWidth = 1.5;
    ctx.moveTo(mx - mw, my - curve * 0.3); ctx.quadraticCurveTo(mx, my + curve, mx + mw, my - curve * 0.3 + (mood === 1 ? -2 : 0)); ctx.stroke();
    if (zombie) { ctx.fillStyle = '#d8d0a0'; for (let i = -2; i <= 1; i++) ctx.fillRect(mx + i * 4, my - 1.5, 3, 3); }
    // chin shadow + stubble / freckles
    const [cx, cy] = P(feat.chin);
    if (!fem && (r % 5 === 0 || (look.extras || []).includes('beard'))) {
      const sg = ctx.createRadialGradient(cx, cy - dist * 0.15, 0, cx, cy - dist * 0.15, dist * 0.8);
      sg.addColorStop(0, 'rgba(40,28,20,0.3)'); sg.addColorStop(0.7, 'rgba(40,28,20,0.18)'); sg.addColorStop(1, 'rgba(40,28,20,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx, cy - dist * 0.12, dist * 0.8, dist * 0.5, 0, 0, Math.PI); ctx.fill();
    }
    if (r % 7 === 0 && !zombie) { ctx.fillStyle = 'rgba(140,70,30,0.35)'; for (let i = 0; i < 40; i++) ctx.fillRect(nx + (Math.random() - 0.5) * dist * 0.9, ny - Math.random() * dist * 0.2, 1.2, 1.2); }
    if (zombie) {
      ctx.fillStyle = 'rgba(80,120,60,0.35)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#402030'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex - eyeW * 2, ey - eyeW * 3); ctx.lineTo(ex + eyeW, ey - eyeW * 1.2);
      for (let i = 0; i < 5; i++) { const t = i / 4; const x = ex - eyeW * 2 + t * eyeW * 3, y = ey - eyeW * 3 + t * eyeW * 1.8; ctx.moveTo(x - 2, y + 3); ctx.lineTo(x + 2, y - 3); }
      ctx.stroke();
    }
    // scalp / hairline
    if (look.hair && hairAt) {
      const img = ctx.getImageData(0, 0, W, H);
      const hc = new THREE.Color(look.hair);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = hairAt(x / W, 1 - y / H);
        if (k <= 0) continue;
        const i = (y * W + x) * 4, n = 0.85 + Math.random() * 0.3 + ((x * 7 + y * 3) % 5 === 0 ? -0.15 : 0);
        const a = Math.min(1, k);
        img.data[i] = img.data[i] * (1 - a) + hc.r * 255 * n * a;
        img.data[i + 1] = img.data[i + 1] * (1 - a) + hc.g * 255 * n * a;
        img.data[i + 2] = img.data[i + 2] * (1 - a) + hc.b * 255 * n * a;
      }
      ctx.putImageData(img, 0, 0);
    }
  });
}

/** Torso wrap: u = 0.5 is the chest centre, v = 0 the waist, v = 1 the neck. */
export function shirtTexture(character) {
  const look = character.look;
  const base = look.top || '#555';
  const ex = look.extras || [];
  const style = ['robot', 'android', 'dome', 'visor'].includes(look.head) ? 'robot'
    : look.head === 'skull' || ex.includes('ribs') ? 'bones'
    : look.hat === 'knight' ? 'mail'
    : ex.includes('tie') ? 'suit'
    : ['police', 'captain', 'helmet', 'spacehelm', 'ushanka'].includes(look.hat) || ex.includes('badge') ? 'uniform'
    : ['cap_back', 'beanie', 'cap', 'none'].includes(look.hat) && !ex.includes('labcoat') ? 'tee' : 'shirt';
  return canvasTex(`shirt:${character.id}`, 256, 128, (ctx, W, H) => {
    const C = W / 2;
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    // light from above, shadow at the waist, darker flanks (u = .25/.75) and back
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const s = ctx.createLinearGradient(0, 0, W, 0);
    s.addColorStop(0, 'rgba(0,0,0,0.16)'); s.addColorStop(0.25, 'rgba(0,0,0,0.12)'); s.addColorStop(0.4, 'rgba(0,0,0,0)'); s.addColorStop(0.6, 'rgba(0,0,0,0)'); s.addColorStop(0.75, 'rgba(0,0,0,0.12)'); s.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
    speckle(ctx, W, H, 3000, 0.05);
    // folds / creases
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 3; i++) { const y = H * (0.72 + i * 0.09); ctx.beginPath(); ctx.moveTo(C - 50 + i * 9, y); ctx.quadraticCurveTo(C - 10, y + 4, C + 30 - i * 5, y - 3); ctx.stroke(); }
    // side seams & back seam
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (const x of [W * 0.25, W * 0.75]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0.5, 0); ctx.lineTo(0.5, H); ctx.stroke();
    const skin = look.skin || '#e0b090';
    if (style === 'robot') {
      ctx.strokeStyle = shade(base, -0.3); ctx.lineWidth = 2;
      for (let x = 8; x < W; x += 32) ctx.strokeRect(x, 14, 26, 40);
      ctx.fillStyle = look.glow || '#6cf'; ctx.fillRect(C - 8, 30, 16, 10);
      ctx.fillStyle = shade(base, 0.2); for (let x = 12; x < W; x += 16) { ctx.fillRect(x, 70, 3, 3); ctx.fillRect(x, 100, 3, 3); }
      return;
    }
    if (style === 'bones') {
      ctx.fillStyle = '#111'; ctx.fillRect(C - 4, 10, 8, 90);
      for (let i = 0; i < 5; i++) { ctx.fillRect(C - 50, 18 + i * 16, 42, 5); ctx.fillRect(C + 8, 18 + i * 16, 42, 5); }
      return;
    }
    if (style === 'mail') {
      ctx.strokeStyle = 'rgba(40,40,50,0.55)'; ctx.lineWidth = 1;
      for (let y = 0; y < H; y += 5) for (let x = (y / 5) % 2 ? 3 : 0; x < W; x += 6) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI); ctx.stroke(); }
      return;
    }
    // neck opening
    ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(C - 14, 0); ctx.lineTo(C, style === 'tee' ? 10 : 22); ctx.lineTo(C + 14, 0); ctx.fill();
    if (style === 'suit') {
      // white shirt V + lapels
      ctx.fillStyle = '#f2f2ee'; ctx.beginPath(); ctx.moveTo(C - 20, 0); ctx.lineTo(C, 70); ctx.lineTo(C + 20, 0); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(C - 10, 0); ctx.lineTo(C, 12); ctx.lineTo(C + 10, 0); ctx.fill();
      ctx.fillStyle = shade(base, -0.12);
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(C + sgn * 20, 0); ctx.lineTo(C + sgn * 5, 70); ctx.lineTo(C + sgn * 14, 68); ctx.lineTo(C + sgn * 34, 26); ctx.lineTo(C + sgn * 26, 20); ctx.fill(); }
      ctx.fillStyle = shade(base, 0.25); for (const y of [80, 98]) { ctx.beginPath(); ctx.arc(C + 6, y, 2.4, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#f2f2ee'; ctx.fillRect(C + 34, 34, 12, 3); // pocket square
      ctx.strokeStyle = shade(base, -0.2); ctx.strokeRect(C + 32, 36, 16, 2);
      ctx.strokeRect(C - 48, 86, 18, 2); ctx.strokeRect(C + 30, 86, 18, 2);
      return;
    }
    if (style === 'tee') {
      ctx.strokeStyle = shade(base, -0.2); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(C, -6, 16, 0.2, Math.PI - 0.2); ctx.stroke();
      // chest print
      const r = hash(character.id);
      ctx.fillStyle = shade(base, (r % 2) ? 0.3 : -0.3);
      if (r % 3 === 0) { ctx.beginPath(); ctx.arc(C, 50, 14, 0, 7); ctx.fill(); ctx.fillStyle = base; ctx.beginPath(); ctx.arc(C, 50, 7, 0, 7); ctx.fill(); }
      else if (r % 3 === 1) { ctx.fillRect(C - 20, 40, 40, 6); ctx.fillRect(C - 20, 52, 40, 6); }
      else { ctx.beginPath(); ctx.moveTo(C, 34); ctx.lineTo(C + 16, 64); ctx.lineTo(C - 16, 64); ctx.fill(); }
      return;
    }
    // shirt / uniform: collar, placket, buttons, pockets
    ctx.fillStyle = shade(base, 0.12);
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(C + sgn * 3, 20); ctx.lineTo(C + sgn * 22, 0); ctx.lineTo(C + sgn * 30, 10); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = shade(base, -0.1); ctx.fillRect(C - 2, 20, 4, H - 20);
    ctx.fillStyle = shade(base, 0.35);
    for (let y = 30; y < H - 8; y += 18) { ctx.beginPath(); ctx.arc(C, y, 2.2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = shade(base, -0.25); ctx.lineWidth = 1.5;
    const pockets = style === 'uniform' ? [-1, 1] : [1];
    for (const sgn of pockets) {
      const x = C + sgn * 34 - 12;
      ctx.strokeRect(x, 38, 24, 22); ctx.fillStyle = shade(base, -0.08); ctx.fillRect(x - 1, 34, 26, 8);
      ctx.fillStyle = shade(base, 0.35); ctx.beginPath(); ctx.arc(x + 12, 40, 1.8, 0, 7); ctx.fill();
    }
    if (style === 'uniform') {
      ctx.fillStyle = shade(base, -0.15); ctx.fillRect(W * 0.2, 0, W * 0.1, 6); ctx.fillRect(W * 0.7, 0, W * 0.1, 6);
      ctx.fillStyle = '#d8b040'; ctx.fillRect(C - 48, 70, 10, 3); ctx.fillRect(C - 48, 75, 10, 3);
    }
  });
}

/** Sleeve / trouser wrap (lathe UVs: u around, v along). */
export function fabricWrap(color, key, { fly = false, stripes = false } = {}) {
  return canvasTex(`wrap:${key}:${color}:${fly}:${stripes}`, 128, 128, (ctx, W, H) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    const s = ctx.createLinearGradient(0, 0, W, 0);
    s.addColorStop(0, 'rgba(0,0,0,0.18)'); s.addColorStop(0.3, 'rgba(0,0,0,0)'); s.addColorStop(0.5, 'rgba(255,255,255,0.06)'); s.addColorStop(0.7, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
    speckle(ctx, W, H, 2500, 0.06);
    for (let y = 0; y < H; y += 2) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(0, y, W, 1); }
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { const y = 10 + Math.random() * (H - 20); ctx.beginPath(); ctx.moveTo(W * 0.35, y); ctx.quadraticCurveTo(W * 0.5, y + 5, W * 0.65, y - 1); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    for (const x of [W * 0.25, W * 0.75]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    if (stripes) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(W * 0.23, 0, 3, H); ctx.fillRect(W * 0.75, 0, 3, H); }
    if (fly) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5, H * 0.5); ctx.quadraticCurveTo(W * 0.55, H * 0.6, W * 0.56, H * 0.3); ctx.stroke(); }
  });
}

export function skinTexture() {
  return canvasTex('skin', 64, 64, (ctx, W, H) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    speckle(ctx, W, H, 1500, 0.05);
  });
}

/** Neutral fabric weave (white), tinted by material colour. */
export function fabricTexture() {
  return canvasTex('fabric', 32, 32, (ctx) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const v = 225 + ((x + y) % 2) * 12 + Math.floor(Math.random() * 16);
      ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x, y, 1, 1);
    }
  });
}
