// Painted character textures: faces (eyes, brows, nose, mouth — varied per character) and clothing
// (shaded shirt fronts with collars/buttons/pockets, and a shared fabric weave tinted per material).
import * as THREE from 'three';

const cache = new Map();

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shade(hex, amt) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, amt); return `#${c.getHexString()}`; }

function canvasTex(key, w, h, paint) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  paint(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Front-of-head texture (128×128). */
export function faceTexture(character) {
  const look = character.look;
  return canvasTex('face:' + character.id, 128, 128, (ctx) => {
    const r = hash(character.id);
    const skin = look.skin || '#e0b090';
    const zombie = look.head === 'zombie';
    const feminine = ['bob', 'bun'].includes(look.hat) || ['ponytail', 'pigtails'].includes(look.hair2) || (look.extras || []).includes('pearls');
    // skin with soft shading: lighter forehead/cheeks, darker jaw & edges
    const g = ctx.createRadialGradient(64, 58, 10, 64, 64, 90);
    g.addColorStop(0, shade(skin, 0.05)); g.addColorStop(0.6, skin); g.addColorStop(1, shade(skin, -0.14));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = shade(skin, -0.06); ctx.fillRect(0, 108, 128, 20);
    // hair fringe
    if (look.hair && !['knight', 'hood', 'plague', 'spacehelm', 'hotdog', 'bob'].includes(look.hat)) {
      ctx.fillStyle = look.hair;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(128, 0); ctx.lineTo(128, 24);
      for (let x = 128; x >= 0; x -= 16) ctx.lineTo(x, 18 + ((x * 7 + r) % 11));
      ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(look.hair, 0.12); ctx.fillRect(20, 6, 40, 3);
    }
    const browColor = look.hair ? shade(look.hair, -0.05) : shade(skin, -0.3);
    const eyeY = 56, gap = 22;
    // brows
    ctx.fillStyle = browColor;
    const browTilt = ((r >> 3) % 3) - 1; // grumpy / neutral / surprised
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(64 + s * gap, eyeY - 14); ctx.rotate(s * browTilt * 0.18);
      ctx.fillRect(-11, -2, 22, feminine ? 3 : 5 + (r % 3)); ctx.restore();
    }
    // eyes
    const irisColors = ['#4a2e1a', '#2a5a9a', '#3a7a3a', '#5a4a2a', '#222'];
    const iris = irisColors[(r >> 5) % irisColors.length];
    for (const s of [-1, 1]) {
      const x = 64 + s * gap;
      ctx.fillStyle = shade(skin, -0.12); ctx.beginPath(); ctx.ellipse(x, eyeY + 1, 12, 8, 0, 0, 7); ctx.fill();
      if (zombie) { ctx.fillStyle = '#e8f040'; ctx.beginPath(); ctx.ellipse(x, eyeY, 9, 6, 0, 0, 7); ctx.fill(); continue; }
      ctx.fillStyle = '#f4f0ea'; ctx.beginPath(); ctx.ellipse(x, eyeY, 10, 6.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(x + s * 1, eyeY, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#080808'; ctx.beginPath(); ctx.arc(x + s * 1, eyeY, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x + s * 1 - 3, eyeY - 3, 2, 2);
      ctx.strokeStyle = feminine ? '#111' : shade(skin, -0.35); ctx.lineWidth = feminine ? 2.5 : 1.5;
      ctx.beginPath(); ctx.ellipse(x, eyeY, 10, 6.5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    }
    // nose
    ctx.fillStyle = shade(skin, -0.16);
    ctx.beginPath(); ctx.moveTo(64, eyeY + 4); ctx.lineTo(71, eyeY + 24); ctx.lineTo(58, eyeY + 25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(skin, 0.08); ctx.fillRect(62, eyeY + 6, 3, 14);
    // mouth
    const mouthY = 98;
    const style = (r >> 7) % 4;
    ctx.strokeStyle = feminine ? '#a8323a' : shade(skin, -0.4); ctx.fillStyle = '#3a1010'; ctx.lineWidth = feminine ? 4 : 3;
    ctx.beginPath();
    if (zombie) { ctx.fillStyle = '#201008'; ctx.fillRect(48, mouthY - 4, 32, 9); ctx.fillStyle = '#d8d0a0'; for (let i = 0; i < 4; i++) ctx.fillRect(50 + i * 8, mouthY - 4, 4, 4); }
    else if (style === 0) { ctx.arc(64, mouthY - 10, 16, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke(); }          // smile
    else if (style === 1) { ctx.moveTo(50, mouthY); ctx.lineTo(78, mouthY - 2); ctx.stroke(); }                       // smirk
    else if (style === 2) { ctx.fillRect(50, mouthY - 5, 28, 9); ctx.fillStyle = '#f4f0ea'; ctx.fillRect(52, mouthY - 5, 24, 3); } // grin
    else { ctx.arc(64, mouthY + 10, 13, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }                               // frown
    if (feminine && !zombie) { ctx.fillStyle = 'rgba(220,90,110,0.25)'; ctx.beginPath(); ctx.arc(38, 82, 9, 0, 7); ctx.arc(90, 82, 9, 0, 7); ctx.fill(); }
    if (zombie) { ctx.strokeStyle = '#402030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(40, 44); for (let i = 0; i < 4; i++) { ctx.moveTo(24 + i * 5, 32 + i * 3.5); ctx.lineTo(28 + i * 5, 28 + i * 3.5); } ctx.stroke(); }
    // stubble for rough types
    if (!feminine && (r % 5 === 0)) { ctx.fillStyle = 'rgba(40,30,20,0.18)'; ctx.fillRect(28, 84, 72, 36); }
  });
}

/** Shirt/jacket front (details) and back (plain shaded) textures. */
export function clothTexture(character, part = 'front') {
  const look = character.look;
  const base = look.top || '#555';
  return canvasTex(`cloth:${character.id}:${part}`, 64, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, shade(base, 0.08)); g.addColorStop(0.7, base); g.addColorStop(1, shade(base, -0.1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    // side shading
    const s = ctx.createLinearGradient(0, 0, 64, 0);
    s.addColorStop(0, 'rgba(0,0,0,0.18)'); s.addColorStop(0.2, 'rgba(0,0,0,0)'); s.addColorStop(0.8, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, 64, 64);
    // fabric weave
    for (let y = 0; y < 64; y += 2) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0, y, 64, 1); }
    ctx.fillStyle = shade(look.bottom || '#333', -0.05); ctx.fillRect(0, 58, 64, 6); // belt band at the waist
    ctx.fillStyle = '#b8a060'; if (part === 'front') ctx.fillRect(28, 58, 8, 6);   // buckle
    if (part !== 'front') return;
    const robot = ['robot', 'android', 'dome', 'skull'].includes(look.head);
    if (robot) {
      ctx.strokeStyle = shade(base, -0.25); ctx.lineWidth = 1; ctx.strokeRect(12, 10, 40, 30);
      ctx.fillStyle = look.glow || '#6cf'; ctx.fillRect(28, 20, 8, 8);
      return;
    }
    // collar
    ctx.fillStyle = shade(base, 0.15);
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(32, 16); ctx.lineTo(46, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = look.skin || '#e0b090';
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(32, 10); ctx.lineTo(40, 0); ctx.closePath(); ctx.fill();
    // placket & buttons
    ctx.fillStyle = shade(base, -0.12); ctx.fillRect(31, 12, 2, 46);
    ctx.fillStyle = shade(base, 0.3);
    for (let y = 18; y < 56; y += 9) { ctx.beginPath(); ctx.arc(35, y, 1.4, 0, 7); ctx.fill(); }
    // pocket
    ctx.strokeStyle = shade(base, -0.18); ctx.lineWidth = 1; ctx.strokeRect(10, 20, 11, 10);
    ctx.beginPath(); ctx.moveTo(10, 23); ctx.lineTo(21, 23); ctx.stroke();
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
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  });
}
