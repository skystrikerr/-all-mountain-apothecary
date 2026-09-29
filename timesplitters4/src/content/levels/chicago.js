// CHICAGO 1932 — "The Hotel Stiletto"
// Story mission + arena variant. Layout (top-down, x → east, z → south; street is south):
//
//   z=-38 ┌──────────────┬───────────────┬──────────────┐
//         │  SAL'S OFFICE│ (service hall)│    VAULT     │
//   z=-20 ├──────┬───────┴───────────────┴──────┬───────┤
//         │ CARD │        BALLROOM (stage N)    │ LOAD- │
//         │ ROOM │                              │  ING  │
//   z=  6 ├──────┴──────┬────────────────┬──────┴───────┤
//         │  SPEAKEASY  │     LOBBY      │   KITCHEN    │
//   z= 22 └─────────────┴──────[door]────┴──────────────┘
//                         STREET (player start)
import { makeSky, makeRain } from '../../engine/sky.js';
import { MAT, roundTable, chair, crate, barrel, car1930, lampPost, plant, sign, chandelier, shelves, timePortal } from './props.js';

const IN_H = 4.5; // standard interior ceiling

function buildHotel(L) {
  // ------------------------------------------------------------ street
  L.floor(-34, 22, 34, 46, MAT.asphalt);
  L.box(-32, 0, 22.2, 32, 0.15, 26, MAT.sidewalk);              // sidewalk step
  L.box(-32, 0, 41, 32, 0.15, 44, MAT.sidewalk);
  L.box(-34, 0, 44, 34, 16, 46, MAT.brickDark);                 // buildings across the street
  for (let x = -28; x <= 28; x += 5) {
    for (const y of [4, 8, 12]) {
      const lit = (x * 7 + y) % 3 !== 0;
      L.box(x - 1, y, 43.9, x + 1, y + 1.8, 44, lit ? MAT.glowYellow : MAT.black, { solid: false });
    }
  }
  L.box(-34, 0, 22, -32, 12, 44, MAT.brick);                    // alley walls
  L.box(32, 0, 22, 34, 12, 44, MAT.brick);
  car1930(L, -14, 30, '#18181c');
  car1930(L, 9, 36.5, '#3a1414');
  car1930(L, 23, 30, '#1c2a1c');
  lampPost(L, -22, 25.2); lampPost(L, 20, 25.2); lampPost(L, -8, 25.2); lampPost(L, 8, 25.2);
  lampPost(L, -18, 42.6); lampPost(L, 0, 42.6); lampPost(L, 18, 42.6);
  L.boxC(-5, 0.15, 27.2, 1.4, 1.3, 0.8, MAT.darkWood);          // newspaper stand
  crate(L, 27, 0, 38); crate(L, 28.3, 0, 38); crate(L, 27.6, 1.2, 38, 1.1);
  barrel(L, -28, 40); barrel(L, -27, 40.2);

  // ------------------------------------------------------------ facade & shell
  L.wallX(22, -32, 32, { h: 14, t: 0.5, mat: MAT.brick, doors: [{ at: 0, w: 3.6, h: 3.4 }], trim: false });
  L.box(-2.6, 3.4, 22.25, 2.6, 3.8, 23.6, MAT.redCloth, { solid: false });     // awning
  sign(L, 'HOTEL STILETTO', 0, 6, 22.3, 8, 2, 'z+', { fg: '#ff3bd6', bg: '#1a0a14', w: 512, h: 128, font: 'bold 64px "Arial Black", Impact' });
  for (let x = -26; x <= 26; x += 6.5) {
    if (Math.abs(x) < 4) continue;
    for (const y of [6.5, 10]) L.box(x - 1, y, 22.26, x + 1, y + 2, 22.3, (x + y) % 2 ? MAT.glowYellow : MAT.black, { solid: false });
  }
  L.wallZ(-30, -38, 22, { h: 8, mat: MAT.wallGreen });
  L.wallZ(30, -38, 22, { h: 8, mat: MAT.wallCream });
  L.wallX(-38, -30, 30, { h: 8, mat: MAT.wallRed });
  L.box(-32, 7, -40, 32, 7.6, 22, MAT.ceilingDark, { skip: ['py'] }); // roof slab above all rooms

  // ------------------------------------------------------------ interior walls
  L.wallZ(-10, 6, 22, { h: 7, mat: MAT.wallGreen, doors: [{ at: 14, w: 3 }] });
  L.wallZ(10, 6, 22, { h: 7, mat: MAT.wallCream, doors: [{ at: 14, w: 3 }] });
  L.wallX(6, -30, 30, { h: 7, mat: MAT.wallRed, doors: [{ at: -20, w: 3 }, { at: 0, w: 4.2, h: 3.4 }, { at: 20, w: 3 }] });
  L.wallZ(-12, -20, 6, { h: 7, mat: MAT.wallRed, doors: [{ at: -6, w: 3 }] });
  L.wallZ(12, -20, 6, { h: 7, mat: MAT.wallRed, doors: [{ at: -6, w: 3 }] });
  L.wallX(-20, -30, 30, { h: 7, mat: MAT.wallGreen, doors: [{ at: -20, w: 3 }, { at: 20, w: 3 }] });
  L.wallZ(-8, -38, -20, { h: 7, mat: MAT.wallGreen, doors: [{ at: -27, w: 2.6 }] });
  L.wallZ(8, -38, -20, { h: 7, mat: MAT.metalDark, doors: [{ at: -27, w: 2.6 }] });
  L.box(-8, 0, -24, 8, 7, -20, MAT.wallCream);                   // solid fill around service hall
  L.box(-8, 0, -38, 8, 7, -30, MAT.wallCream);

  // ------------------------------------------------------------ LOBBY  x[-10,10] z[6,22]
  L.floor(-10, 6, 10, 22, MAT.marble);
  L.ceiling(-10, 6, 10, 22, 6, MAT.plaster);
  L.box(-8.5, 0, 8, -3.5, 1.1, 9.4, MAT.darkWood);                       // reception desk
  L.box(-8.6, 1.1, 7.9, -3.4, 1.18, 9.5, MAT.marble, { solid: false });
  shelves(L, -9.7, 6.4, -3.5, 6.8, 3, MAT.darkWood);                   // key cubbies
  for (const [x, z] of [[-6, 11], [6, 11], [-6, 18], [6, 18]]) L.cylinder(x, 0, z, 0.45, 6, MAT.marble, { segments: 8 });
  L.boxC(5.5, 0, 8.5, 3, 0.8, 1, MAT.redCloth);                          // sofas
  L.boxC(-7.5, 0, 20, 1, 0.8, 3, MAT.redCloth);
  L.boxC(7.5, 0, 20, 1, 0.8, 3, MAT.redCloth);
  plant(L, -9, 21); plant(L, 9, 21); plant(L, -9, 12); plant(L, 9, 12);
  L.box(-2.5, 0.001, 8, 2.5, 0.02, 21, MAT.carpet, { solid: false });
  chandelier(L, 0, 5.2, 14, 1.3, 0xffd9a0, 14, 24);
  L.light({ x: -7, y: 3, z: 8.5, color: 0xffc080, intensity: 4, distance: 9 });

  // ------------------------------------------------------------ SPEAKEASY  x[-30,-10] z[6,22]
  L.floor(-30, 6, -10, 22, MAT.woodFloor);
  L.ceiling(-30, 6, -10, 22, IN_H, MAT.ceilingDark);
  L.box(-27.5, 0, 9, -26, 1.15, 19, MAT.darkWood);                      // bar counter
  L.box(-27.7, 1.15, 8.8, -25.8, 1.25, 19.2, MAT.marble, { solid: false });
  shelves(L, -29.8, 9, -29.1, 19, 3.2, MAT.darkWood);                  // bottle shelves
  L.boxC(-29.4, 3.3, 14, 0.1, 0.6, 5, MAT.glowPink, { solid: false });
  sign(L, 'SPEAKEASY', -29.3, 3.6, 14, 4, 0.8, 'x+', { fg: '#ff9a3b', bg: '#140a04' });
  for (const [x, z] of [[-21, 10], [-16, 10], [-21, 15], [-16, 15], [-21, 19.5], [-13.5, 13]]) {
    roundTable(L, x, z, { r: 0.6, top: MAT.darkWood });
    chair(L, x - 0.9, z, MAT.darkWood, Math.PI / 2); chair(L, x + 0.9, z, MAT.darkWood, -Math.PI / 2);
  }
  L.box(-14, 0, 18.5, -11, 1.1, 21, MAT.black);                         // piano
  L.box(-14, 1.1, 20.6, -11, 1.8, 21, MAT.black, { solid: false });
  L.box(-13.8, 0.95, 18.4, -11.2, 1.0, 18.6, MAT.white, { solid: false });
  L.light({ x: -20, y: 3.8, z: 13, color: 0xffb070, intensity: 8, distance: 16 });
  L.light({ x: -27, y: 3.2, z: 14, color: 0xff60c0, intensity: 3, distance: 8 });

  // ------------------------------------------------------------ KITCHEN  x[10,30] z[6,22]
  L.floor(10, 6, 30, 22, MAT.kitchenTile);
  L.ceiling(10, 6, 30, 22, IN_H, MAT.plaster);
  L.box(14.5, 0, 10, 25.5, 0.95, 11.6, MAT.metal);                      // islands
  L.box(14.5, 0, 15.5, 25.5, 0.95, 17.1, MAT.metal);
  L.box(10.2, 0, 19.5, 19, 0.95, 21.8, MAT.metal);                      // counter along south wall
  for (let x = 12; x < 19; x += 1.6) L.boxC(x, 0.95, 20.6, 0.5, 0.03, 0.5, MAT.glowRed, { solid: false });
  L.box(27.5, 0, 6.2, 29.8, 2.8, 8.5, MAT.white);                       // fridges
  L.box(27.5, 0, 9, 29.8, 2.8, 11.3, MAT.white);
  L.box(29.2, 0, 13, 29.8, 2.2, 20, MAT.metal);                          // shelving
  crate(L, 26, 0, 20.5, 1); crate(L, 27.2, 0, 20.8, 1); barrel(L, 24, 21);
  L.light({ x: 20, y: 4, z: 13.5, color: 0xe8f0ff, intensity: 9, distance: 18 });

  // ------------------------------------------------------------ BALLROOM  x[-12,12] z[-20,6]
  L.floor(-12, -20, 12, 6, MAT.carpet);
  L.ceiling(-12, -20, 12, 6, 7, MAT.plaster);
  L.box(-8, 0, -20, 8, 0.45, -14.5, MAT.woodFloor);                    // stage
  L.box(-3, 0, -14.5, 3, 0.22, -13.9, MAT.woodFloor);                  // stage step
  L.box(-8, 0.45, -19.8, 8, 6.5, -19.6, MAT.redCloth, { solid: false }); // curtain
  for (let x = -7; x <= 7; x += 2) L.box(x - 0.4, 0.45, -19.55, x + 0.4, 6.4, -19.35, MAT.redCloth, { solid: false });
  sign(L, 'THE STILETTO ROOM', 0, 5.5, -19.3, 7, 1.2, 'z+', { fg: '#ffd23b', bg: '#2a0a10' });
  L.boxC(-5.5, 0.45, -17.5, 1.2, 1, 1.2, MAT.black);                   // band gear on stage (cover)
  L.boxC(5.5, 0.45, -17.5, 1.6, 1.2, 0.8, MAT.black);
  for (const [x, z] of [[-8, -9], [8, -9], [-8, -2], [8, -2], [-3.5, -5.5], [3.5, -5.5], [-8, 3], [8, 3]]) {
    roundTable(L, x, z, { r: 0.85, top: MAT.white });
    chair(L, x, z - 1.1, MAT.gold, 0); chair(L, x, z + 1.1, MAT.gold, Math.PI);
  }
  chandelier(L, 0, 6.2, -6, 1.6, 0xffe0b0, 12, 22);
  L.light({ x: 0, y: 5, z: -16, color: 0xff70c0, intensity: 7, distance: 14 });

  // ------------------------------------------------------------ CARD ROOM  x[-30,-12] z[-20,6]
  L.floor(-30, -20, -12, 6, MAT.woodFloor);
  L.ceiling(-30, -20, -12, 6, IN_H, MAT.ceilingDark);
  for (const [x, z] of [[-24, -12], [-17, -12], [-24, -3], [-17, -3]]) {
    L.boxC(x, 0, z, 2.4, 0.85, 1.4, MAT.felt);
    chair(L, x - 1.6, z, MAT.darkWood, Math.PI / 2); chair(L, x + 1.6, z, MAT.darkWood, -Math.PI / 2);
  }
  for (let z = -18; z <= -8; z += 2) L.boxC(-29.2, 0, z, 1, 1.9, 1.2, MAT.metalDark);   // slot machines
  for (let z = -18; z <= -8; z += 2) L.boxC(-28.68, 1.1, z, 0.02, 0.5, 0.8, MAT.glowYellow, { solid: false });
  crate(L, -14, 0, 3); crate(L, -15.3, 0, 3); crate(L, -14.6, 1.2, 3, 1.1); crate(L, -28, 0, 3.5);
  L.light({ x: -20, y: 3.8, z: -7, color: 0x9fffa0, intensity: 7, distance: 16, flicker: 0.15 });

  // ------------------------------------------------------------ LOADING DOCK  x[12,30] z[-20,6]
  L.floor(12, -20, 30, 6, MAT.concrete);
  L.ceiling(12, -20, 30, 6, IN_H, MAT.ceilingDark);
  car1930(L, 24, -8, '#2a2a36', 'z');
  crate(L, 15, 0, -17); crate(L, 16.3, 0, -17); crate(L, 15.6, 1.2, -17, 1.1); crate(L, 15, 0, -15.7);
  crate(L, 19, 0, 2, 1.4); crate(L, 20.5, 0, 3.5, 1.2);
  barrel(L, 28.5, 4); barrel(L, 28.5, 2.9); barrel(L, 27.4, 4.2);
  crate(L, 28.4, 0, -18.4); crate(L, 27.1, 0, -18.4);
  L.light({ x: 21, y: 4, z: -7, color: 0xffe0b0, intensity: 7, distance: 16 });

  // ------------------------------------------------------------ SAL'S OFFICE  x[-30,-8] z[-38,-20]
  L.floor(-30, -38, -8, -20, MAT.carpetBlue);
  L.ceiling(-30, -38, -8, -20, IN_H, MAT.ceilingDark);
  L.box(-22, 0, -33.5, -16, 0.9, -31.5, MAT.darkWood);                 // desk
  L.boxC(-19, 0, -35, 1, 1.5, 1, MAT.redCloth);                          // big chair
  shelves(L, -29.8, -37.8, -10, -37.2, 3.6, MAT.darkWood);
  L.box(-29.8, 0, -30, -29.2, 1.2, -26, MAT.brickDark);                  // fireplace
  L.box(-29.6, 0.1, -29.3, -29.3, 0.8, -26.7, MAT.glowRed, { solid: false });
  L.box(-12, 0, -37.8, -9, 2, -36.5, MAT.metalDark);                      // safe
  L.boxC(-14, 0, -25, 3, 0.8, 1, MAT.redCloth);                          // sofa (cover)
  plant(L, -9, -21); plant(L, -29, -21);
  L.light({ x: -19, y: 3.8, z: -29, color: 0xffc080, intensity: 8, distance: 16 });
  L.light({ x: -29, y: 1, z: -28, color: 0xff6020, intensity: 3, distance: 6, flicker: 0.3 });

  // ------------------------------------------------------------ SERVICE HALL  x[-8,8] z[-30,-24]
  L.floor(-8, -30, 8, -24, MAT.concrete);
  L.ceiling(-8, -30, 8, -24, 3.5, MAT.ceilingDark);
  L.light({ x: 0, y: 3.2, z: -27, color: 0xffe0a0, intensity: 4, distance: 10, flicker: 0.4 });
  barrel(L, 5, -29); crate(L, -6.5, 0, -25, 1);

  // ------------------------------------------------------------ VAULT  x[8,30] z[-38,-20]
  L.floor(8, -38, 30, -20, MAT.metal);
  L.ceiling(8, -38, 30, -20, IN_H, MAT.metalDark);
  L.box(18, 0, -33, 20, 1, -31, MAT.marble);                              // pedestal
  for (const [x, z] of [[12, -34], [12, -24], [26, -34], [26, -24], [23, -29]]) {
    L.boxC(x, 0, z, 1.6, 0.6, 0.8, MAT.gold);                              // gold bar stacks
    L.boxC(x, 0.6, z, 1.2, 0.4, 0.6, MAT.gold);
  }
  for (let x = 10; x <= 28; x += 1) L.box(x, 1, -37.8, x + 0.9, 3.4, -37.5, MAT.metalDark, { solid: false }); // deposit boxes
  L.box(8, 0, -37.9, 30, 3.6, -37.8, MAT.metal);
  L.light({ x: 19, y: 4, z: -27, color: 0xa0c8ff, intensity: 8, distance: 18 });
  L.light({ x: 19, y: 2, z: -32, color: 0xb070ff, intensity: 6, distance: 9 });
}

export default {
  id: 'chicago',
  name: 'Hotel Stiletto',
  era: 'Chicago, 1932',
  music: 'chicago',
  navMaxFloor: 0.6,
  env: {
    sky: '#0b0d1f', fog: ['#141730', 30, 120],
    hemi: 0.6, hemiSky: '#8899cc', hemiGround: '#2a2018', ambient: '#303048', ambientIntensity: 0.5,
    sun: { dir: [-25, 45, 60], color: '#9fb0ff', intensity: 1.1, shadowRange: 36, target: [0, 0, 32] },
    skyDome: () => makeSky({
      top: '#05061a', mid: '#141a40', horizon: '#3a2a4a', bottom: '#141730', seed: 5, stars: 700,
      moon: { u: 0.62, v: 0.2, r: 13, color: '#e8ecff', glow: 'rgba(170,190,255,0.45)', craters: true },
      clouds: { count: 10, color: '120,110,170', alpha: 0.18 },
      skyline: { color: '#0c0d1c', windows: true },
    }),
  },
  build(L, { story }) {
    buildHotel(L);
    // Rain on the street
    const rain = makeRain({ minX: -32, maxX: 32, minZ: 22.6, maxZ: 44, top: 14 });
    L.prop(rain.object);
    L.animated.push({ update: (dt) => rain.update(dt) });
    // Triggers & markers (used by both variants)
    L.trigger('lobby', -10, 6, 10, 21);
    L.trigger('portal', -2.5, -18.5, 2.5, -15);
    L.marker('door', 0, 0, 22);
    L.marker('ledger', -19, 0.9, -32.5);
    L.marker('crystal', 19, 1, -32);
    L.marker('stage', 0, 0.45, -16);
    L.marker('portal', 0, 0.45, -17);
    if (story) {
      L.spawn(0, 0, 40, 0);
      buildStory(L);
    } else {
      buildArena(L);
    }
  },
  mission: {
    id: 'chicago',
    title: 'THE HOTEL STILETTO',
    brief: [
      'Chicago, 1932. A Rift Crystal has surfaced in the vault of mob boss "Big Sal" Marzetti, and he has been using it to peek at tomorrow\'s racing results.',
      'Infiltrate the Hotel Stiletto, grab Sal\'s ledger to find out where the crystal came from, steal the crystal, and get out through the time portal before the whole Outfit comes down on you.',
    ],
    startWeapons: ['fists', 'mobpistol'],
    objectives: [
      { id: 'enter', type: 'reach', trigger: 'lobby', text: 'Get inside the Hotel Stiletto', marker: 'door' },
      { id: 'ledger', type: 'collect', item: 'ledger', text: "Find Big Sal's ledger in his office", marker: 'ledger' },
      {
        id: 'crystal', type: 'collect', item: 'crystal', text: 'Steal the Rift Crystal from the vault', marker: 'crystal',
        onComplete: (c) => { c.sound('alarm'); c.spawnGroup('reinforce'); c.alertAll(); },
      },
      {
        id: 'boss', type: 'kill', target: 'sal', text: 'Big Sal wants his rock back. Take him down!', marker: 'stage',
        onStart: (c) => { c.spawnGroup('boss'); },
      },
      {
        id: 'escape', type: 'reach', trigger: 'portal', text: 'Escape through the time portal on the stage', marker: 'portal',
        onStart: (c) => { c.flags.portal = true; c.sound('portal'); },
      },
    ],
    scripts: [
      { trigger: 'kitchenAmbush', run: (c) => { c.spawnGroup('ambush'); c.message('AMBUSH!', 1.5); } },
    ],
  },
};

function buildStory(L) {
  const E = (x, z, yaw, weapons, character = 'vinnie', extra = {}) =>
    L.enemy({ x, z, yaw, weapons: ['fists', ...weapons], character, name: extra.name || 'Mobster', ...extra });
  const S = Math.PI; // facing south (towards the street)
  // Street
  E(-2.6, 24.8, -Math.PI / 2, ['mobpistol'], 'vinnie', { group: 'street' });   // door guards chatting to each other
  E(2.6, 24.8, Math.PI / 2, ['mobpistol'], 'bookie', { group: 'street' });
  E(-18, 34, 0, ['tommy'], 'vinnie', { group: 'street', patrol: [[-18, 34], [-18, 28], [16, 28], [16, 34]] });
  // Lobby
  E(-6, 7.35, S, ['mobpistol'], 'bellhop', { group: 'lobby', health: 50 });
  E(6, 15, -Math.PI / 2, ['mobpistol'], 'vinnie', { group: 'lobby' });
  E(-4, 18, S, ['tommy'], 'flapper', { group: 'lobby' });
  // Speakeasy
  E(-28.5, 14, -Math.PI / 2, ['pumpgun'], 'chef', { group: 'bar', name: 'Bartender' });
  E(-18, 12.5, Math.PI / 2, ['mobpistol'], 'vinnie', { group: 'bar' });
  E(-14, 16, Math.PI / 2, ['mobpistol'], 'bookie', { group: 'bar' });
  E(-22, 20.5, Math.PI / 2, ['tommy'], 'flapper', { group: 'bar' });
  // Kitchen
  E(20, 13.5, -Math.PI / 2, ['mobpistol'], 'chef', { group: 'kitchen', name: 'Cook' });
  E(27, 18, Math.PI / 2, ['pumpgun'], 'chef', { group: 'kitchen', name: 'Head Chef', health: 90 });
  // Ballroom
  E(-6, -12, 0, ['tommy'], 'vinnie', { group: 'ballroom', patrol: [[-6, -12], [6, -12], [6, 2], [-6, 2]] });
  E(6, -15, Math.PI, ['mobpistol'], 'flapper', { group: 'ballroom', y: 0.45 });
  E(-10, 4, 0, ['mobpistol'], 'bookie', { group: 'ballroom' });
  // Card room
  E(-20.5, -7.5, Math.PI / 2, ['tommy'], 'vinnie', { group: 'cards' });
  E(-26, -16, Math.PI / 2, ['mobpistol'], 'bookie', { group: 'cards' });
  E(-15, -17, S, ['pumpgun'], 'vinnie', { group: 'cards' });
  // Loading dock
  E(18, -5, Math.PI / 2, ['tommy'], 'vinnie', { group: 'dock' });
  E(27, 0, Math.PI / 2, ['mobpistol'], 'bookie', { group: 'dock' });
  E(16, -14, 0, ['pumpgun'], 'vinnie', { group: 'dock' });
  // Office
  E(-12, -30, Math.PI / 2, ['tommy'], 'vinnie', { group: 'office', name: 'Bodyguard', health: 90 });
  E(-25, -25, 0, ['mobpistol'], 'flapper', { group: 'office' });
  // Service hall + vault
  E(0, -27, Math.PI / 2, ['pumpgun'], 'vinnie', { group: 'vault' });
  E(12, -29, -Math.PI / 2, ['tommy'], 'copper', { group: 'vault', name: 'Crooked Cop', health: 90, armor: 30 });
  E(26, -29, Math.PI / 2, ['tommy'], 'copper', { group: 'vault', name: 'Crooked Cop', health: 90, armor: 30 });
  // Kitchen ambush (scripted trigger when entering the kitchen)
  L.trigger('kitchenAmbush', 11, 7, 29, 21);
  E(17, 4.5, 0, ['mobpistol'], 'vinnie', { dormant: 'ambush', group: 'ambush' });
  E(23, 2, 0, ['tommy'], 'bookie', { dormant: 'ambush', group: 'ambush' });
  // Reinforcements after the alarm
  const R = (x, z, w, c) => E(x, z, 0, w, c, { dormant: 'reinforce', group: 'reinforce', name: 'Outfit Muscle' });
  R(0, 12, ['tommy'], 'vinnie'); R(-4, 16, ['mobpistol'], 'bookie'); R(4, 16, ['pumpgun'], 'vinnie');
  R(-20, -2, ['tommy'], 'vinnie'); R(20, -2, ['tommy'], 'bookie'); R(0, -8, ['mobpistol'], 'flapper');
  // Boss
  E(0, -17, 0, ['tommy'], 'sal', { dormant: 'boss', group: 'boss', tag: 'sal', name: 'Big Sal', y: 0.45, health: 380, armor: 60, skillBonus: 0.1, damage: 1.1 });
  E(-4, -16, 0, ['tommy'], 'vinnie', { dormant: 'boss', group: 'boss', name: "Sal's Bodyguard", y: 0.45, health: 110 });
  E(4, -16, 0, ['pumpgun'], 'vinnie', { dormant: 'boss', group: 'boss', name: "Sal's Bodyguard", y: 0.45, health: 110 });
  // (enemy.dormant groups arrive already alert and hunting the player)

  // Items & pickups
  L.pickup('item', 'ledger', -19, 0.9, -32.5, 0);
  L.pickups[L.pickups.length - 1].itemId = 'ledger';
  Object.assign(L.pickups[L.pickups.length - 1], { name: "Big Sal's Ledger", shape: 'book', color: '#6a2a1a' });
  L.pickup('item', 'crystal', 19, 1.1, -32, 0);
  Object.assign(L.pickups[L.pickups.length - 1], { itemId: 'crystal', name: 'Rift Crystal', shape: 'crystal', color: '#b070ff' });
  L.pickup('weapon', 'tommy', -25, 0, 17.5, 0);
  L.pickup('weapon', 'pumpgun', 22, 0, 8.2, 0);
  L.pickup('weapon', 'pineapple', -27, 0, -1, 0);
  L.pickup('weapon', 'sputnik', 12, 0, -36, 0);
  L.pickup('armor', 'armor', -8, 0, 7.3, 0);
  L.pickup('armor', 'armor', 28, 0, -22, 0);
  for (const [x, z] of [[-11.5, 8], [28.5, 15], [-28.5, -19], [-11, -22], [28.5, 0], [-10.5, -18.5]]) L.pickup('health', 'health', x, 0, z, 0);
  timePortal(L, 0, 0.45, -17, (game) => !!game.mode.flags?.portal);
}

function buildArena(L) {
  // Spawns across the whole hotel
  const spawns = [
    [0, 36, 0, 0], [-20, 30, 0, 0], [20, 30, 0, 1], [0, 14, 0, 0], [-20, 12, 0, 0], [20, 12, 0, 1], [-15, -1, Math.PI / 2, 0],
    [0, -10, 0, -1], [-22, -8, 0, 0], [22, -12, 0, 1], [-20, -28, 0, 0], [20, -26, 0, 1], [0, -27, Math.PI / 2, -1],
    [-24, 18, 0, 0], [26, 18, 0, 1], [8, 0.5, 0, 1], [-8, 0.5, 0, 0], [28.5, -35, 0, 1], [-26, -34, 0, 0],
  ];
  for (const [x, z, yaw, team] of spawns) L.spawn(x, 0.02, z, yaw, team);
  L.base(0, -18.5, 0, 17.5);
  L.base(1, 20, 0, 13.5);
  L.pickup('weapon', 'slot2', -25, 0, 17.5);
  L.pickup('weapon', 'slot2', 22, 0, 8.2);
  L.pickup('weapon', 'slot3', 0, 0, -8);
  L.pickup('weapon', 'slot3', 0, 0, 30);
  L.pickup('weapon', 'slot4', -27, 0, -1);
  L.pickup('weapon', 'slot4', 27, 0, -1);
  L.pickup('weapon', 'slot5', 19, 1, -32);
  L.pickup('weapon', 'slot5', -19, 0.9, -32.5);
  L.pickup('weapon', 'slot1', 0, 0.45, -17);
  L.pickup('armor', 'armor', -8, 0, 7.3);
  L.pickup('armor', 'armor', 0, 0, -27);
  for (const [x, z] of [[-11.5, 8], [28.5, 15], [-28.5, -19], [-11, -22], [28.5, 0], [-10.5, -18.5], [30, 40], [-30, 40]]) L.pickup('health', 'health', x, 0, z);
}
