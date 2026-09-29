// Builds a playable arena from a Map Maker tile map (see ui/editor.js for the format).
import { MAT, crate } from './props.js';
import { makeSky } from '../../engine/sky.js';

export const TILE = 4;
export const TILES = [
  { id: 0, name: 'Void', key: '0', color: '#111' },
  { id: 1, name: 'Floor', key: '1', color: '#8a8a8a' },
  { id: 2, name: 'Wall', key: '2', color: '#e0c060' },
  { id: 3, name: 'Cover', key: '3', color: '#b06a3a' },
  { id: 4, name: 'Step (0.45m)', key: '4', color: '#6aa0d0' },
  { id: 5, name: 'Raised (0.9m)', key: '5', color: '#3a70b0' },
  { id: 6, name: 'Pillar', key: '6', color: '#d0d0d0' },
  { id: 7, name: 'Window Wall', key: '7', color: '#a0e0ff' },
  { id: 8, name: 'Lit Floor', key: '8', color: '#ffe080' },
];
export const ITEMS = [
  { id: 'spawn', name: 'Spawn Point', color: '#3bff6b', glyph: 'S' },
  { id: 'weapon1', name: 'Weapon Slot 1', color: '#ffd23b', glyph: '1' },
  { id: 'weapon2', name: 'Weapon Slot 2', color: '#ffd23b', glyph: '2' },
  { id: 'weapon3', name: 'Weapon Slot 3', color: '#ffd23b', glyph: '3' },
  { id: 'weapon4', name: 'Weapon Slot 4', color: '#ffd23b', glyph: '4' },
  { id: 'weapon5', name: 'Weapon Slot 5', color: '#ffd23b', glyph: '5' },
  { id: 'health', name: 'Health', color: '#ff4040', glyph: '+' },
  { id: 'armor', name: 'Armour', color: '#4090ff', glyph: 'A' },
  { id: 'baseRed', name: 'Red Bag Base', color: '#ff3b3b', glyph: 'R' },
  { id: 'baseBlue', name: 'Blue Bag Base', color: '#3b8bff', glyph: 'B' },
];

export const THEMES = {
  chicago: { name: 'Chicago 1932', floor: MAT.woodFloor, wall: MAT.wallRed, cover: MAT.darkWood, raised: MAT.marble, ceiling: MAT.ceilingDark, light: 0xffc080, sky: '#0b0d1f', music: 'chicago', indoor: true },
  castle: { name: 'Castle 1348', floor: MAT.dirt, wall: MAT.stone, cover: MAT.hay, raised: MAT.lightWood, ceiling: null, light: 0xff9a40, sky: '#e08a50', music: 'arena', indoor: false },
  lab: { name: 'Lab 67 (1967)', floor: MAT.whiteTile, wall: MAT.panel, cover: MAT.metal, raised: MAT.grate, ceiling: MAT.plaster, light: 0xe0f0ff, sky: '#1a2230', music: 'arena', indoor: true },
  mall: { name: 'Mall 1997', floor: MAT.mallFloor, wall: MAT.mallWall, cover: MAT.lightWood, raised: MAT.carpet, ceiling: MAT.plaster, light: 0xffc0f0, sky: '#20183a', music: 'neon', indoor: true },
  neon: { name: 'Neo-Tokyo 2145', floor: MAT.grate, wall: MAT.neonWall, cover: MAT.metalDark, raised: MAT.neonWallPink, ceiling: MAT.ceilingDark, light: 0x40e0ff, sky: '#05030f', music: 'neon', indoor: true },
  space: { name: 'Deep Space 2670', floor: MAT.metal, wall: MAT.metalDark, cover: MAT.hazard, raised: MAT.grate, ceiling: MAT.metalDark, light: 0xa0ffb0, sky: '#000005', music: 'neon', indoor: true },
};

export function defaultMap() {
  const w = 12, h = 12;
  const tiles = new Array(w * h).fill(1);
  for (let i = 0; i < w; i++) { tiles[i] = 2; tiles[(h - 1) * w + i] = 2; tiles[i * w] = 2; tiles[i * w + w - 1] = 2; }
  for (const [x, z, t] of [[3, 3, 3], [8, 8, 3], [8, 3, 3], [3, 8, 3], [5, 5, 5], [6, 5, 5], [5, 6, 5], [6, 6, 5], [4, 5, 4], [7, 6, 4], [5, 1, 8], [6, 10, 8], [1, 6, 8], [10, 5, 8]]) tiles[z * w + x] = t;
  return {
    name: 'My Arena', theme: 'lab', w, h, tiles,
    items: [
      { type: 'spawn', x: 1, z: 1 }, { type: 'spawn', x: 10, z: 10 }, { type: 'spawn', x: 10, z: 1 }, { type: 'spawn', x: 1, z: 10 },
      { type: 'spawn', x: 5, z: 2 }, { type: 'spawn', x: 6, z: 9 },
      { type: 'weapon2', x: 5, z: 5 }, { type: 'weapon3', x: 2, z: 5 }, { type: 'weapon4', x: 9, z: 6 }, { type: 'weapon1', x: 6, z: 1 },
      { type: 'health', x: 1, z: 5 }, { type: 'health', x: 10, z: 6 }, { type: 'armor', x: 6, z: 6 },
      { type: 'baseRed', x: 1, z: 2 }, { type: 'baseBlue', x: 10, z: 9 },
    ],
  };
}

export function validateMap(map) {
  const problems = [];
  const spawns = map.items.filter((i) => i.type === 'spawn').length;
  if (spawns < 2) problems.push('Place at least 2 spawn points.');
  for (const it of map.items) {
    const t = map.tiles[it.z * map.w + it.x];
    if ([0, 2, 6, 7].includes(t)) problems.push(`${it.type} at ${it.x},${it.z} is inside a wall/void.`);
  }
  return problems;
}

const HEIGHT = { 1: 0, 3: 0, 4: 0.45, 5: 0.9, 6: 0, 8: 0 };

export default {
  id: 'custom',
  name: 'Custom Map',
  era: 'Map Maker',
  navMaxFloor: 1.0,
  get env() { return this._env; },
  _env: {},
  build(L, { map }) {
    const theme = THEMES[map.theme] || THEMES.lab;
    this.name = map.name || 'Custom Map';
    this.music = theme.music;
    this._env = theme.indoor
      ? { sky: theme.sky, hemi: 0.9, hemiSky: '#ddeeff', hemiGround: '#443322', ambient: '#404050', ambientIntensity: 0.6 }
      : { sky: theme.sky, hemi: 0.8, hemiSky: '#ffd0a0', hemiGround: '#40302a', sun: { dir: [-40, 40, 20], color: '#ffc080', intensity: 1.6, shadowRange: map.w * TILE * 0.6 },
        skyDome: () => makeSky({ top: '#3a4a8a', mid: '#c87a78', horizon: '#ffb070', bottom: '#8a5a48', seed: 9, clouds: { count: 20, color: '255,190,150', alpha: 0.3 }, hills: { color: '#4a3a3a', far: '#7a5a58' } }) };
    const W = map.w, H = map.h;
    const wallH = theme.indoor ? 5 : 7;
    const ox = -W * TILE / 2, oz = -H * TILE / 2;
    const at = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? 0 : map.tiles[z * W + x]);
    let lights = 0;
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = at(x, z);
        const x1 = ox + x * TILE, z1 = oz + z * TILE, x2 = x1 + TILE, z2 = z1 + TILE, cx = x1 + TILE / 2, cz = z1 + TILE / 2;
        switch (t) {
          case 0: L.box(x1, -0.5, z1, x2, wallH, z2, MAT.black); break;
          case 2: L.box(x1, -0.5, z1, x2, wallH, z2, theme.wall); break;
          case 7:
            L.box(x1, -0.5, z1, x2, 1.2, z2, theme.wall);
            L.box(x1, 2.2, z1, x2, wallH, z2, theme.wall);
            L.box(x1 + 0.2, 1.2, z1 + 0.2, x2 - 0.2, 2.2, z2 - 0.2, MAT.glass, { solid: false });
            break;
          default: {
            L.floor(x1, z1, x2, z2, t === 8 ? theme.raised : theme.floor);
            if (t === 3) { crate(L, cx, 0, cz, 1.8, theme.cover); }
            if (t === 4) L.box(x1, 0, z1, x2, 0.45, z2, theme.raised);
            if (t === 5) L.box(x1, 0, z1, x2, 0.9, z2, theme.raised);
            if (t === 6) L.cylinder(cx, 0, cz, 0.6, wallH, theme.wall);
            if (t === 8 && lights < 10) { L.light({ x: cx, y: wallH - 0.8, z: cz, color: theme.light, intensity: 9, distance: 18 }); lights++; if (theme.indoor) L.box(cx - 0.8, wallH - 0.05, cz - 0.8, cx + 0.8, wallH, cz + 0.8, MAT.glowWhite, { solid: false }); }
          }
        }
      }
    }
    if (theme.indoor) L.ceiling(ox, oz, ox + W * TILE, oz + H * TILE, wallH, theme.ceiling);
    // boundary
    L.box(ox - 1, -0.5, oz - 1, ox, wallH + 2, oz + H * TILE + 1, MAT.black);
    L.box(ox + W * TILE, -0.5, oz - 1, ox + W * TILE + 1, wallH + 2, oz + H * TILE + 1, MAT.black);
    L.box(ox, -0.5, oz - 1, ox + W * TILE, wallH + 2, oz, MAT.black);
    L.box(ox, -0.5, oz + H * TILE, ox + W * TILE, wallH + 2, oz + H * TILE + 1, MAT.black);
    if (lights === 0) {
      // fallback lighting so maps without lit floors aren't pitch black
      for (let i = 0; i < 4; i++) L.light({ x: ox + W * TILE * (0.25 + (i % 2) * 0.5), y: wallH - 0.8, z: oz + H * TILE * (0.25 + Math.floor(i / 2) * 0.5), color: theme.light, intensity: 8, distance: 30 });
    }
    // Items
    for (const it of map.items) {
      const t = at(it.x, it.z);
      const y = HEIGHT[t] ?? 0;
      const cx = ox + it.x * TILE + TILE / 2, cz = oz + it.z * TILE + TILE / 2;
      // Cover tiles have a crate in the middle: put items on the side
      const px = t === 3 ? cx + 1.4 : cx, pz = t === 3 ? cz + 1.4 : cz;
      if (it.type === 'spawn') L.spawn(px, y + 0.02, pz, Math.random() * Math.PI * 2, -1);
      else if (it.type.startsWith('weapon')) L.pickup('weapon', 'slot' + it.type.slice(6), px, y, pz);
      else if (it.type === 'health') L.pickup('health', 'health', px, y, pz);
      else if (it.type === 'armor') L.pickup('armor', 'armor', px, y, pz);
      else if (it.type === 'baseRed') L.base(0, px, y, pz);
      else if (it.type === 'baseBlue') L.base(1, px, y, pz);
    }
    // Team spawns: assign by nearest base (if any)
    if (L.bases.length >= 2) {
      for (const s of L.spawns) {
        const d0 = Math.hypot(s.x - L.bases[0].x, s.z - L.bases[0].z), d1 = Math.hypot(s.x - L.bases[1].x, s.z - L.bases[1].z);
        s.team = d0 < d1 ? L.bases[0].team : L.bases[1].team;
      }
    }
  },
};
