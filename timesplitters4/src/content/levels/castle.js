// EUROPE 1348 — "Castle Morrow" arcade arena. Dusk courtyard under siege: curtain walls, corner towers,
// a great hall on the north side, market stalls, siege scaffolds and a central well.
import * as THREE from 'three';
import { MAT, crate, barrel, sign } from './props.js';

function stall(L, x, z, cloth) {
  L.boxC(x, 0, z, 3, 1, 1.4, MAT.lightWood);
  for (const [dx, dz] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) L.boxC(x + dx, 1, z + dz, 0.12, 1.6, 0.12, MAT.darkWood, { solid: false });
  L.boxC(x, 2.6, z, 3.4, 0.12, 1.9, cloth, { solid: false });
}

function torch(L, x, y, z) {
  L.boxC(x, y, z, 0.12, 0.5, 0.12, MAT.darkWood, { solid: false });
  L.boxC(x, y + 0.5, z, 0.2, 0.2, 0.2, MAT.glowYellow, { solid: false });
  L.light({ x, y: y + 0.8, z, color: 0xff9a40, intensity: 6, distance: 12, flicker: 0.25 });
}

export default {
  id: 'castle',
  name: 'Castle Morrow',
  era: 'Europe, 1348',
  music: 'arena',
  navMaxFloor: 1.0,
  env: {
    sky: '#e08a50', fog: ['#b86a48', 45, 140],
    hemi: 0.8, hemiSky: '#ffd0a0', hemiGround: '#40302a', ambient: '#503838', ambientIntensity: 0.5,
    sun: { dir: [-60, 35, 20], color: '#ffb070', intensity: 1.8, shadowRange: 38 },
    skyDome: () => {
      const g = new THREE.Mesh(new THREE.SphereGeometry(300, 16, 8), new THREE.MeshBasicMaterial({ color: '#f0a060', side: THREE.BackSide, fog: false }));
      const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(18, 16), new THREE.MeshBasicMaterial({ color: '#fff0c0', fog: false }));
      sunDisc.position.set(-240, 120, 80); sunDisc.lookAt(0, 0, 0);
      g.add(sunDisc);
      return g;
    },
  },
  build(L) {
    L.floor(-24, -24, 24, 24, MAT.dirt);
    L.box(-6, 0.001, -2, 6, 0.02, 24, MAT.stone, { solid: false }); // cobbled path from gate
    // Curtain walls + towers
    const wall = { h: 10, t: 1.5, mat: MAT.stone };
    L.wallX(-23, -24, 24, wall);
    L.wallX(23, -24, 24, wall);
    L.wallZ(-23, -24, 24, wall);
    L.wallZ(23, -24, 24, wall);
    for (let i = -22; i <= 22; i += 2) {
      L.box(i - 0.5, 10, -23.75, i + 0.5, 11, -22.25, MAT.stone);
      L.box(i - 0.5, 10, 22.25, i + 0.5, 11, 23.75, MAT.stone);
      L.box(-23.75, 10, i - 0.5, -22.25, 11, i + 0.5, MAT.stone);
      L.box(22.25, 10, i - 0.5, 23.75, 11, i + 0.5, MAT.stone);
    }
    for (const [x, z] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) {
      L.cylinder(x, 0, z, 3.4, 14, MAT.stoneDark, { segments: 10 });
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 4, 10), new THREE.MeshLambertMaterial({ color: '#5a2a2a', flatShading: true }));
      roof.position.set(x, 16, z); roof.castShadow = true;
      L.prop(roof);
    }
    // Gatehouse (closed portcullis) on the south wall
    L.box(-4, 0, 22, 4, 12, 24, MAT.stoneDark);
    for (let x = -2.5; x <= 2.5; x += 0.5) L.box(x - 0.05, 0, 21.9, x + 0.05, 4, 22, MAT.metalDark, { solid: false });
    for (let y = 0.5; y <= 4; y += 0.7) L.box(-2.6, y, 21.88, 2.6, y + 0.08, 21.95, MAT.metalDark, { solid: false });
    // Great hall (north): x[-10,10] z[-22,-12]
    L.floor(-10, -22, 10, -12, MAT.woodFloor, 0.02, 0.1);
    L.wallX(-12, -10, 10, { h: 7, t: 0.8, mat: MAT.stone, doors: [{ at: 0, w: 3.2, h: 3.6 }, { at: -7, w: 2, h: 2.6 }, { at: 7, w: 2, h: 2.6 }] });
    L.wallZ(-10, -22.5, -12, { h: 7, t: 0.8, mat: MAT.stone });
    L.wallZ(10, -22.5, -12, { h: 7, t: 0.8, mat: MAT.stone });
    L.box(-10.4, 7, -22.5, 10.4, 7.4, -11.6, MAT.darkWood);
    L.box(-6, 0, -18.2, 6, 0.8, -17, MAT.darkWood);   // long table
    L.box(-1, 0, -21.9, 1, 2.2, -21, MAT.redCloth);   // throne
    L.box(-9.8, 0.02, -21.9, 9.8, 0.03, -19.5, MAT.redCloth, { solid: false });
    sign(L, 'CASTLE MORROW', 0, 5.2, -11.55, 6, 1, 'z+', { fg: '#ffd23b', bg: '#3a1a10', font: 'bold 34px Georgia, serif' });
    torch(L, -9.3, 2.2, -16); torch(L, 9.3, 2.2, -16); torch(L, -3, 2.5, -11.4); torch(L, 3, 2.5, -11.4);
    // Well
    L.cylinder(0, 0, 0, 1.3, 0.9, MAT.stone, { segments: 10 });
    L.boxC(-1.1, 0.9, 0, 0.15, 1.8, 0.15, MAT.darkWood, { solid: false });
    L.boxC(1.1, 0.9, 0, 0.15, 1.8, 0.15, MAT.darkWood, { solid: false });
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1, 4), new THREE.MeshLambertMaterial({ color: '#5a2a2a', flatShading: true }));
    wellRoof.position.set(0, 3.1, 0); wellRoof.rotation.y = Math.PI / 4; wellRoof.castShadow = true;
    L.prop(wellRoof);
    // Market stalls
    stall(L, -14, 4, MAT.redCloth); stall(L, -14, 11, { tex: 'flat', opts: { base: '#2a4a8a' } });
    stall(L, 14, 4, { tex: 'flat', opts: { base: '#2a6a3a' } }); stall(L, 14, 11, MAT.redCloth);
    // Siege scaffolds: 0.9m platforms with 0.45m steps, east & west
    for (const sx of [-1, 1]) {
      const x0 = sx * 18;
      L.box(x0 - 2.5, 0, -8, x0 + 2.5, 0.9, -2, MAT.lightWood);
      L.box(x0 - 2.5, 0, -2, x0 + 2.5, 0.45, -0.8, MAT.lightWood);
      L.box(x0 - 2.5, 0, -9.2, x0 + 2.5, 0.45, -8, MAT.lightWood);
      crate(L, x0 + sx * 1.6, 0.9, -6.8, 1.0);
      for (const [dx, dz] of [[-2.4, -7.9], [2.4, -7.9], [-2.4, -2.1], [2.4, -2.1]]) L.boxC(x0 + dx, 0.9, dz, 0.15, 1.2, 0.15, MAT.darkWood, { solid: false });
    }
    // Hay, carts, barrels
    for (const [x, z] of [[-8, 16], [9, 17], [-17, 17], [17, -14], [-17, -14]]) L.boxC(x, 0, z, 2, 1.1, 1.4, MAT.hay);
    L.boxC(7, 0, 8, 3.2, 1.1, 1.6, MAT.lightWood); // cart
    for (const [dx] of [[-1.2], [1.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 10), new THREE.MeshLambertMaterial({ color: '#4a2a14' })); w.rotation.x = Math.PI / 2; w.position.set(7 + dx, 0.5, 8.9); L.prop(w); }
    barrel(L, -6, 8); barrel(L, -5.2, 8.6); barrel(L, 19, 18); barrel(L, 20, 17.5);
    crate(L, 5, 0, -6); crate(L, -5, 0, -6);
    // Training dummies
    for (const x of [-4, 4]) { L.cylinder(x, 0, 17, 0.15, 1.8, MAT.darkWood, { segments: 6 }); L.boxC(x, 1.1, 17, 0.8, 0.5, 0.3, MAT.hay, { solid: false }); }
    torch(L, -21.2, 3, 0); torch(L, 21.2, 3, 0); torch(L, -10, 3, 21.2); torch(L, 10, 3, 21.2);

    const sp = [
      [0, 19, Math.PI, 0], [-10, 19, Math.PI, 0], [10, 19, Math.PI, 0], [-20, 10, -Math.PI / 2, 0], [20, 10, Math.PI / 2, 0],
      [0, -19.5, 0, 1], [-6, -15, 0, 1], [6, -15, 0, 1], [-20, -18, 0, 1], [20, -18, 0, 1],
      [-18, -5, -Math.PI / 2, -1, 0.92], [18, -5, Math.PI / 2, -1, 0.92], [-9, 2, 0, -1], [9, 2, 0, -1], [0, 8, 0, -1],
    ];
    for (const [x, z, yaw, team, y = 0.02] of sp) L.spawn(x, y, z, yaw, team);
    L.base(0, 0, 0, 18.5);
    L.base(1, 0, 0.03, -19.5);
    L.pickup('weapon', 'slot2', -18, 0.9, -5); L.pickup('weapon', 'slot2', 18, 0.9, -5);
    L.pickup('weapon', 'slot3', -14, 0, 7.5); L.pickup('weapon', 'slot3', 14, 0, 7.5);
    L.pickup('weapon', 'slot4', 0, 0, 3.5); L.pickup('weapon', 'slot5', 0, 0.03, -15);
    L.pickup('weapon', 'slot1', -10, 0, -8); L.pickup('weapon', 'slot1', 10, 0, -8);
    L.pickup('armor', 'armor', 0, 0.03, -20.5);
    L.pickup('health', 'health', -16, 0, 20); L.pickup('health', 'health', 16, 0, 20);
    L.pickup('health', 'health', -8, 0, -20); L.pickup('health', 'health', 8, 0, -20);
    L.pickup('health', 'health', -20, 0, 0); L.pickup('health', 'health', 20, 0, 0);
  },
};
