// CALIFORNIA 1997 — "Galleria Grande" arcade arena.
// Symmetrical mall atrium: central fountain, four kiosks, planters, four raised mezzanine corners,
// plus two side stores (record shop / arcade) and a food court alcove.
import * as THREE from 'three';
import { MAT, roundTable, chair, plant, tree, sign, crate } from './props.js';

const H = 9;

function kiosk(L, x, z, label, color) {
  L.boxC(x, 0, z, 3, 1.1, 3, MAT.mallWall);
  L.boxC(x, 1.1, z, 3.1, 0.08, 3.1, MAT.white, { solid: false });
  L.boxC(x, 1.2, z, 0.5, 1.8, 0.5, MAT.metal);
  L.boxC(x, 3, z, 3.6, 0.3, 3.6, color, { solid: false });
  sign(L, label, x, 3.5, z + 1.81, 3.4, 0.7, 'z+', { fg: '#fff', bg: '#c0308a', font: 'bold 34px "Arial Black", Impact' });
  sign(L, label, x, 3.5, z - 1.81, 3.4, 0.7, 'z-', { fg: '#fff', bg: '#c0308a', font: 'bold 34px "Arial Black", Impact' });
}

function mezzanine(L, sx, sz) {
  // raised 0.9m corner platform with a 0.45m step band on the two inner sides
  const x1 = sx > 0 ? 18 : -26, x2 = sx > 0 ? 26 : -18;
  const z1 = sz > 0 ? 18 : -26, z2 = sz > 0 ? 26 : -18;
  L.box(x1, 0, z1, x2, 0.9, z2, MAT.woodFloor);
  const ix = sx > 0 ? x1 : x2, iz = sz > 0 ? z1 : z2; // inner corner
  L.box(ix - sx * 1.2, 0, sz > 0 ? iz - 1.2 : z1, ix, 0.45, sz > 0 ? z2 : iz + 1.2, MAT.woodFloor);
  L.box(sx > 0 ? ix - 1.2 : x1, 0, iz - sz * 1.2, sx > 0 ? x2 : ix + 1.2, 0.45, iz, MAT.woodFloor);
  // benches & planter on top
  const cx = (x1 + x2) / 2 + sx, cz = (z1 + z2) / 2 + sz;
  L.boxC(cx + sx * 1.5, 0.9, cz - sz * 2, 2.5, 0.5, 0.7, MAT.darkWood);
  plant(L, cx + sx * 1.5, cz + sz * 1.5, 1.2, 0.9);
}

export default {
  id: 'galleria',
  name: 'Galleria Grande',
  era: 'California, 1997',
  music: 'neon',
  navMaxFloor: 1.0,
  env: {
    sky: '#20183a', fog: ['#2a1f44', 40, 110],
    hemi: 0.85, hemiSky: '#fff4e0', hemiGround: '#6a4a6a', ambient: '#505070', ambientIntensity: 0.6,
  },
  build(L) {
    // floor, walls, roof
    L.floor(-26, -26, 26, 26, MAT.mallFloor);
    L.wallX(-26, -26, 26, { h: H, mat: MAT.mallWall, doors: [{ at: 0, w: 16, h: 5 }] });
    L.wallX(26, -26, 26, { h: H, mat: MAT.mallWall, doors: [{ at: 0, w: 8, h: 4 }] });
    L.wallZ(-26, -26, 26, { h: H, mat: MAT.mallWall, doors: [{ at: 0, w: 5, h: 3.5 }] });
    L.wallZ(26, -26, 26, { h: H, mat: MAT.mallWall, doors: [{ at: 0, w: 5, h: 3.5 }] });
    L.ceiling(-27, -34, 27, 27, H, MAT.plaster);
    const skylight = { tex: 'grate', opts: { base: '#e8f0ff' }, emissive: '#dde8ff', emissiveIntensity: 0.62, scale: 0.5 };
    for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) L.box(x - 4, H - 0.05, z - 4, x + 4, H, z + 4, skylight, { solid: false });
    // storefront windows / neon along walls
    const fronts = [
      ['PIZZA PLANET X', -16, 'z-'], ['SK8 SHACK', 16, 'z-'], ['VIDEO VAULT', -16, 'z+'], ['CYBER CAFE', 16, 'z+'],
    ];
    for (const [label, x, face] of fronts) {
      const z = face === 'z-' ? 25.78 : -25.78;
      L.box(x - 4, 0.6, z - 0.01, x + 4, 3.6, z + 0.01, MAT.glass, { solid: false });
      sign(L, label, x, 4.4, face === 'z-' ? 25.75 : -25.75, 6, 1.1, face === 'z-' ? 'z-' : 'z+', { fg: '#29f0ff', bg: '#140a24' });
    }
    sign(L, 'GALLERIA GRANDE', 0, 6.4, 25.7, 12, 2, 'z-', { fg: '#ff2bd6', bg: '#120818', w: 512, h: 96, font: 'bold 60px "Arial Black", Impact' });
    L.box(-8, 0, 26, 8, 5, 27, MAT.glass, { solid: true }); // sealed glass entrance
    // South (+z) entrance lobby behind glass is just decoration; north (-z) is the food court alcove
    L.floor(-8, -34, 8, -26, MAT.whiteTile);
    L.wallX(-34, -8, 8, { h: H, mat: MAT.neonWall });
    L.wallZ(-8, -34, -26, { h: H, mat: MAT.neonWall });
    L.wallZ(8, -34, -26, { h: H, mat: MAT.neonWall });
    L.box(-7.8, 0, -33.8, 7.8, 1.1, -32.4, MAT.metal); // counter
    L.box(-7.8, 2.4, -33.9, 7.8, 3.6, -33.7, MAT.glowPink, { solid: false });
    sign(L, 'FOOD COURT', 0, 5, -33.75, 8, 1.4, 'z+', { fg: '#ffd23b', bg: '#1a0a24' });
    for (const [x, z] of [[-4.5, -29], [0, -29.5], [4.5, -29]]) { roundTable(L, x, z, { r: 0.7, top: MAT.white, leg: MAT.metal }); chair(L, x, z + 1, MAT.metal, Math.PI); }
    L.light({ x: 0, y: 5, z: -30, color: 0xffb0e0, intensity: 8, distance: 14 });

    // West store: RAD RECORDS
    L.floor(-34, -8, -26, 8, MAT.carpetBlue);
    L.ceiling(-34, -8, -26, 8, 4.5, MAT.ceilingDark);
    L.wallZ(-34, -8, 8, { h: 5, mat: MAT.neonWallPink });
    L.wallX(-8, -34, -26, { h: 5, mat: MAT.neonWallPink });
    L.wallX(8, -34, -26, { h: 5, mat: MAT.neonWallPink });
    for (const z of [-5, 0, 5]) L.box(-32, 0, z - 0.3, -28.5, 1.4, z + 0.3, MAT.lightWood);
    sign(L, 'RAD RECORDS', -25.7, 4.6, 0, 5, 1, 'x+', { fg: '#ff2bd6', bg: '#14081a' });
    L.light({ x: -30, y: 4, z: 0, color: 0xff60d0, intensity: 7, distance: 12 });

    // East store: ARCADE ZONE
    L.floor(26, -8, 34, 8, MAT.carpet);
    L.ceiling(26, -8, 34, 8, 4.5, MAT.ceilingDark);
    L.wallZ(34, -8, 8, { h: 5, mat: MAT.neonWall });
    L.wallX(-8, 26, 34, { h: 5, mat: MAT.neonWall });
    L.wallX(8, 26, 34, { h: 5, mat: MAT.neonWall });
    for (const z of [-6, -3.5, 3.5, 6]) {
      L.boxC(33, 0, z, 1.2, 2, 1.1, MAT.black);
      L.boxC(32.38, 1.1, z, 0.02, 0.7, 0.8, [MAT.glowBlue, MAT.glowGreen, MAT.glowPink, MAT.glowYellow][Math.abs(Math.round(z)) % 4], { solid: false });
    }
    L.boxC(29, 0, -6.5, 1.2, 2, 1.1, MAT.black); L.boxC(29, 0, 6.5, 1.2, 2, 1.1, MAT.black);
    sign(L, 'ARCADE ZONE', 25.7, 4.6, 0, 5, 1, 'x-', { fg: '#29f0ff', bg: '#08141a' });
    L.light({ x: 30, y: 4, z: 0, color: 0x40d0ff, intensity: 7, distance: 12 });

    // Central fountain
    const fw = 3.6, fh = 0.6;
    L.box(-fw, 0, -fw, fw, fh, -fw + 0.4, MAT.marble);
    L.box(-fw, 0, fw - 0.4, fw, fh, fw, MAT.marble);
    L.box(-fw, 0, -fw + 0.4, -fw + 0.4, fh, fw - 0.4, MAT.marble);
    L.box(fw - 0.4, 0, -fw + 0.4, fw, fh, fw - 0.4, MAT.marble);
    L.box(-fw + 0.4, 0.35, -fw + 0.4, fw - 0.4, 0.36, fw - 0.4, MAT.water, { solid: false });
    L.boxC(0, 0, 0, 1.2, 2.6, 1.2, MAT.marble);
    const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), new THREE.MeshLambertMaterial({ color: '#d4a93a', flatShading: true }));
    globe.position.set(0, 3.4, 0); globe.castShadow = true;
    L.prop(globe);
    L.animated.push({ update(dt) { globe.rotation.y += dt * 0.4; } });
    L.light({ x: 0, y: 5.5, z: 0, color: 0xfff0e0, intensity: 10, distance: 22 });

    // Kiosks
    kiosk(L, -12, 0, 'SUNGLASS HUT', MAT.glowPink);
    kiosk(L, 12, 0, 'PAGERS 4 U', MAT.glowBlue);
    kiosk(L, 0, -12, 'PRETZELS', MAT.glowYellow);
    kiosk(L, 0, 12, 'CD WORLD', MAT.glowGreen);

    // Planters with palm-ish trees
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
      L.boxC(x, 0, z, 2.2, 0.8, 2.2, MAT.brick);
      tree(L, x, z, 5);
    }
    // Pillars
    for (const [x, z] of [[-16, -6], [-16, 6], [16, -6], [16, 6], [-6, -16], [6, -16], [-6, 16], [6, 16]]) L.cylinder(x, 0, z, 0.5, H, MAT.white, { segments: 10 });

    // Mezzanines
    mezzanine(L, 1, 1); mezzanine(L, -1, 1); mezzanine(L, 1, -1); mezzanine(L, -1, -1);
    // Scattered cover
    crate(L, -20, 0, 2, 1.1); crate(L, 20, 0, -2, 1.1);
    L.boxC(-3, 0, 20, 2.5, 0.5, 0.7, MAT.darkWood); L.boxC(3, 0, -20, 2.5, 0.5, 0.7, MAT.darkWood); // benches

    for (const [x, z, c] of [[-18, -18, 0xff70d0], [18, -18, 0x70e0ff], [-18, 18, 0x70e0ff], [18, 18, 0xff70d0]]) L.light({ x, y: 6, z, color: c, intensity: 9, distance: 20 });

    // Spawns (team 0 west, team 1 east)
    const sp = [
      [-21, -21, -Math.PI * 0.75, 0, 0.92], [-21, 21, -Math.PI * 0.25, 0, 0.92], [21, -21, Math.PI * 0.75, 1, 0.92], [21, 21, Math.PI * 0.25, 1, 0.92],
      [-20, -8, -Math.PI / 2, 0], [-20, 8, -Math.PI / 2, 0], [20, -8, Math.PI / 2, 1], [20, 8, Math.PI / 2, 1],
      [-6, -22, 0, -1], [6, 22, Math.PI, -1], [-27.3, -2.5, -Math.PI / 2, 0], [30, 5, Math.PI / 2, 1],
      [0, -27, 0, -1], [-14, 14, 0, 0], [14, -14, Math.PI, 1], [-14, -14, 0, 0], [14, 14, Math.PI, 1],
    ];
    for (const [x, z, yaw, team, y = 0.02] of sp) L.spawn(x, y, z, yaw, team);
    L.base(0, -27.2, 0, 0);
    L.base(1, 30.5, 0, 0);
    // Pickups
    L.pickup('weapon', 'slot2', -22, 0.9, -22); L.pickup('weapon', 'slot2', 22, 0.9, 22);
    L.pickup('weapon', 'slot3', 22, 0.9, -22); L.pickup('weapon', 'slot3', -22, 0.9, 22);
    L.pickup('weapon', 'slot4', 0, 0, -20); L.pickup('weapon', 'slot4', 0, 0, 20);
    L.pickup('weapon', 'slot5', 0, 0, -27.5);
    L.pickup('weapon', 'slot1', -17, 0, 0); L.pickup('weapon', 'slot1', 17, 0, 0);
    L.pickup('armor', 'armor', 0, 0.35, 2.6);
    L.pickup('health', 'health', -30, 0, 2.5); L.pickup('health', 'health', 30, 0, -5);
    L.pickup('health', 'health', -12, 0, -12); L.pickup('health', 'health', 12, 0, 12);
    L.pickup('health', 'health', 20, 0.9, 20); L.pickup('health', 'health', -20, 0.9, -20);
  },
};
