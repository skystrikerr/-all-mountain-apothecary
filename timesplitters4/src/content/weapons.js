// Weapon catalogue. Every weapon is data: the WeaponSystem implements the archetypes
// (melee, hitscan w/ pellets & piercing, projectile w/ gravity/splash/bounce/homing, thrown).
// `view` drives the procedural first-person/third-person model.
//
// Units: damage in HP (players have 100 HP + up to 100 armour), spread in radians, speeds in m/s.

const W = [];
const def = (w) => { W.push({ headMult: 2, auto: false, pellets: 1, spread: 0.01, moveSpread: 0.02, recoil: 0.01, range: 150,
  reload: 1.6, dual: false, botRange: [0, 40], botRating: 5, ammoPickup: w.clip * 2 || 0, ...w }); };

// ---------------------------------------------------------------- Chicago 1932
def({ id: 'fists', name: 'Knuckle Duster', era: 1932, kind: 'melee', rpm: 110, damage: 34, range: 2.2, clip: 0, reserve: 0,
  sound: 'melee', botRating: 0, botRange: [0, 2],
  view: { type: 'fist', color: '#c9a36a', accent: '#b8962a' } });
def({ id: 'mobpistol', name: 'Stiletto .38 Special', era: 1932, kind: 'hitscan', rpm: 260, damage: 22, spread: 0.012, clip: 8, reserve: 48,
  reload: 1.4, dual: true, sound: 'pistol', recoil: 0.025, botRating: 3, botRange: [0, 30],
  view: { len: 0.24, color: '#2c2c30', accent: '#8a6a3a', grip: true } });
def({ id: 'tommy', name: 'Chicago Typewriter', era: 1932, kind: 'hitscan', auto: true, rpm: 780, damage: 13, spread: 0.028, moveSpread: 0.03,
  clip: 50, reserve: 200, reload: 2.2, dual: true, sound: 'smg', recoil: 0.012, botRating: 6, botRange: [0, 25],
  view: { len: 0.6, color: '#27262a', accent: '#6e4526', mag: 'drum', stock: true, foregrip: true } });
def({ id: 'pumpgun', name: 'Speakeasy Pump', era: 1932, kind: 'hitscan', rpm: 70, damage: 12, pellets: 9, spread: 0.075, clip: 6, reserve: 30,
  reload: 2.6, sound: 'shotgun', recoil: 0.07, headMult: 1.5, range: 40, botRating: 6, botRange: [0, 12],
  view: { len: 0.72, color: '#303033', accent: '#7a4a24', stock: true, pump: true, bulky: true } });
def({ id: 'pineapple', name: 'Pineapple Grenade', era: 1932, kind: 'thrown', rpm: 60, damage: 0, clip: 1, reserve: 5, reload: 0.1,
  sound: 'throw', botRating: 4, botRange: [6, 22], ammoPickup: 3,
  projectile: { speed: 17, gravity: 16, bounce: 0.45, fuse: 2.4, splash: 5, splashDamage: 120, size: 0.12, color: '#556b2f' },
  view: { type: 'grenade', color: '#556b2f', accent: '#999' } });

// ---------------------------------------------------------------- Medieval 1348
def({ id: 'crossbow', name: 'Siege Crossbow', era: 1348, kind: 'projectile', rpm: 50, damage: 90, clip: 1, reserve: 20, reload: 0.9,
  sound: 'bow', headMult: 2.5, zoom: 35, botRating: 6, botRange: [8, 60],
  projectile: { speed: 95, gravity: 3, size: 0.05, color: '#8b6b3a', bolt: true },
  view: { type: 'crossbow', len: 0.7, color: '#6b4a2a', accent: '#888' } });
def({ id: 'longbow', name: 'Yew Longbow', era: 1348, kind: 'projectile', rpm: 75, damage: 55, clip: 1, reserve: 30, reload: 0.5,
  sound: 'bow', headMult: 2.5, botRating: 4, botRange: [5, 45],
  projectile: { speed: 70, gravity: 8, size: 0.04, color: '#9b7b4a', bolt: true },
  view: { type: 'bow', len: 0.9, color: '#7b5230', accent: '#ddd' } });
def({ id: 'handgonne', name: 'Plague Handgonne', era: 1348, kind: 'hitscan', rpm: 30, damage: 20, pellets: 6, spread: 0.05, clip: 1, reserve: 15,
  reload: 1.8, sound: 'shotgun', recoil: 0.12, range: 35, botRating: 5, botRange: [0, 14],
  view: { len: 0.55, color: '#4a4036', accent: '#6b4a2a', bulky: true, flared: true } });
def({ id: 'firepot', name: 'Greek Fire Pot', era: 1348, kind: 'thrown', rpm: 55, damage: 0, clip: 1, reserve: 4, reload: 0.1, sound: 'throw',
  botRating: 4, botRange: [6, 20], ammoPickup: 2,
  projectile: { speed: 15, gravity: 16, bounce: 0, fuse: 0, splash: 4.5, splashDamage: 100, size: 0.16, color: '#a0522d', impact: true },
  view: { type: 'grenade', color: '#a0522d', accent: '#e8d8a0', round: true } });

// ---------------------------------------------------------------- Soviet 1967
def({ id: 'volk67', name: 'Volk-67 Assault Rifle', era: 1967, kind: 'hitscan', auto: true, rpm: 600, damage: 19, spread: 0.016, clip: 30, reserve: 150,
  reload: 2.1, sound: 'rifle', recoil: 0.016, botRating: 7, botRange: [0, 45],
  view: { len: 0.8, color: '#2e2b27', accent: '#7a4a24', mag: 'curved', stock: true } });
def({ id: 'tokar', name: 'Tokar Service Pistol', era: 1967, kind: 'hitscan', rpm: 300, damage: 20, spread: 0.01, clip: 10, reserve: 60, reload: 1.3,
  dual: true, sound: 'pistol', recoil: 0.02, botRating: 3, botRange: [0, 30],
  view: { len: 0.22, color: '#3a3a3e', accent: '#553322', grip: true } });
def({ id: 'krasny', name: 'Krasny Scope Rifle', era: 1967, kind: 'hitscan', rpm: 55, damage: 75, spread: 0.002, moveSpread: 0.05, clip: 5, reserve: 25,
  reload: 2.5, sound: 'rifle', headMult: 3, zoom: 20, recoil: 0.05, botRating: 6, botRange: [12, 90],
  view: { len: 1.0, color: '#2a2622', accent: '#6b4020', stock: true, scope: true } });
def({ id: 'sputnik', name: 'Sputnik Rocket Launcher', era: 1967, kind: 'projectile', rpm: 55, damage: 40, clip: 1, reserve: 8, reload: 1.3,
  sound: 'rocket', botRating: 8, botRange: [6, 50], ammoPickup: 3,
  projectile: { speed: 32, gravity: 0, splash: 5, splashDamage: 105, size: 0.14, color: '#d33', trail: true, rocket: true },
  view: { type: 'tube', len: 1.0, color: '#45502f', accent: '#c33', bulky: true } });
def({ id: 'tesla', name: 'Tesla Arc Projector', era: 1967, kind: 'hitscan', auto: true, rpm: 900, damage: 8, spread: 0.02, clip: 80, reserve: 160,
  reload: 2.4, range: 16, sound: 'laser', tracer: '#8cf', beam: true, headMult: 1, botRating: 6, botRange: [0, 14],
  view: { len: 0.6, color: '#555c66', accent: '#6cf', coils: true, bulky: true } });

// ---------------------------------------------------------------- California 1997
def({ id: 'raduzi', name: 'Rad-Uzi', era: 1997, kind: 'hitscan', auto: true, rpm: 950, damage: 10, spread: 0.04, clip: 32, reserve: 192, reload: 1.7,
  dual: true, sound: 'smg', recoil: 0.01, botRating: 6, botRange: [0, 20],
  view: { len: 0.3, color: '#1f1f22', accent: '#ff3fa4', mag: 'box', grip: true } });
def({ id: 'boomstick', name: 'Boomstick 97', era: 1997, kind: 'hitscan', rpm: 140, damage: 13, pellets: 10, spread: 0.1, clip: 2, reserve: 30,
  reload: 1.9, sound: 'shotgun', recoil: 0.09, headMult: 1.5, range: 30, botRating: 7, botRange: [0, 10],
  view: { len: 0.6, color: '#333', accent: '#8a5a2a', stock: true, double: true, bulky: true } });
def({ id: 'malltuber', name: 'Mall-Tuber Grenade Launcher', era: 1997, kind: 'projectile', rpm: 90, damage: 20, clip: 6, reserve: 18, reload: 2.6,
  sound: 'shotgun', botRating: 7, botRange: [6, 28], ammoPickup: 6,
  projectile: { speed: 24, gravity: 14, bounce: 0.5, fuse: 1.6, splash: 4.5, splashDamage: 90, size: 0.1, color: '#2a6', impactPlayers: true },
  view: { type: 'tube', len: 0.6, color: '#3a3f44', accent: '#2c6', drumMag: true, bulky: true } });
def({ id: 'nailer', name: 'Nail Driver 5000', era: 1997, kind: 'projectile', auto: true, rpm: 700, damage: 11, spread: 0.02, clip: 60, reserve: 180,
  reload: 2.0, sound: 'smg', botRating: 5, botRange: [0, 30],
  projectile: { speed: 85, gravity: 1, size: 0.025, color: '#ccc', bolt: true },
  view: { len: 0.45, color: '#e7b21a', accent: '#333', bulky: true } });
def({ id: 'lasertag', name: 'Laser Tagger Pro', era: 1997, kind: 'hitscan', auto: true, rpm: 420, damage: 12, spread: 0.004, clip: 40, reserve: 200,
  reload: 1.4, sound: 'laser', tracer: '#f0f', beam: true, botRating: 5, botRange: [0, 50],
  view: { len: 0.45, color: '#35e', accent: '#f3f', glow: '#f0f' } });

// ---------------------------------------------------------------- Neo-Tokyo 2145
def({ id: 'photon', name: 'Photon SMG', era: 2145, kind: 'projectile', auto: true, rpm: 720, damage: 12, spread: 0.02, clip: 45, reserve: 180,
  reload: 1.8, dual: true, sound: 'plasma', botRating: 7, botRange: [0, 30],
  projectile: { speed: 60, gravity: 0, size: 0.07, color: '#3ff', glow: true },
  view: { len: 0.4, color: '#dde', accent: '#0ff', glow: '#0ff' } });
def({ id: 'raildriver', name: 'Rail Driver', era: 2145, kind: 'hitscan', rpm: 40, damage: 95, spread: 0, moveSpread: 0.02, clip: 4, reserve: 20,
  reload: 2.6, sound: 'laser', tracer: '#4af', beam: true, pierce: true, zoom: 18, headMult: 2.5, recoil: 0.06, botRating: 8, botRange: [10, 120],
  view: { len: 1.05, color: '#2a2d36', accent: '#4af', scope: true, glow: '#4af', bulky: true } });
def({ id: 'monoblade', name: 'Katana-7 Monoblade', era: 2145, kind: 'melee', rpm: 140, damage: 70, range: 2.8, clip: 0, reserve: 0,
  sound: 'melee', headMult: 1.5, botRating: 3, botRange: [0, 3],
  view: { type: 'blade', len: 0.9, color: '#dff', accent: '#222', glow: '#0ff' } });
def({ id: 'swarm', name: 'Swarm Launcher', era: 2145, kind: 'projectile', rpm: 180, damage: 18, clip: 6, reserve: 24, reload: 2.4,
  sound: 'rocket', botRating: 8, botRange: [6, 45], ammoPickup: 6,
  projectile: { speed: 26, gravity: 0, splash: 3, splashDamage: 45, size: 0.08, color: '#f84', trail: true, rocket: true, homing: 3.2 },
  view: { type: 'tube', len: 0.8, color: '#222', accent: '#f84', quad: true, bulky: true } });
def({ id: 'pulseshot', name: 'Pulse Scattergun', era: 2145, kind: 'projectile', rpm: 80, damage: 11, pellets: 8, spread: 0.08, clip: 8, reserve: 32,
  reload: 2.2, sound: 'plasma', range: 30, botRating: 7, botRange: [0, 12],
  projectile: { speed: 55, gravity: 0, size: 0.05, color: '#9f3', glow: true, life: 0.6 },
  view: { len: 0.65, color: '#2e3', accent: '#9f3', bulky: true, glow: '#9f3' } });

// ---------------------------------------------------------------- Deep Space 2670
def({ id: 'voidcannon', name: 'Void Cannon', era: 2670, kind: 'projectile', rpm: 35, damage: 60, clip: 2, reserve: 8, reload: 2.8,
  sound: 'plasma', botRating: 9, botRange: [8, 50], ammoPickup: 2,
  projectile: { speed: 16, gravity: 0, splash: 7, splashDamage: 140, size: 0.35, color: '#a3f', glow: true },
  view: { type: 'tube', len: 0.9, color: '#212', accent: '#a3f', glow: '#a3f', bulky: true } });
def({ id: 'graviton', name: 'Graviton Pistol', era: 2670, kind: 'projectile', rpm: 240, damage: 24, clip: 12, reserve: 60, reload: 1.5,
  dual: true, sound: 'plasma', botRating: 5, botRange: [0, 30],
  projectile: { speed: 50, gravity: 0, size: 0.08, color: '#6f6', glow: true },
  view: { len: 0.28, color: '#445', accent: '#6f6', glow: '#6f6', grip: true } });
def({ id: 'spikerifle', name: 'Xeno Spike Rifle', era: 2670, kind: 'projectile', auto: true, rpm: 360, damage: 24, spread: 0.01, clip: 24, reserve: 96,
  reload: 2.0, sound: 'bow', botRating: 7, botRange: [0, 40],
  projectile: { speed: 75, gravity: 4, size: 0.04, color: '#dd4', bolt: true },
  view: { len: 0.75, color: '#563', accent: '#dd4', organic: true, bulky: true } });
def({ id: 'disruptor', name: 'Chrono Disruptor', era: 2670, kind: 'hitscan', auto: true, rpm: 1200, damage: 7, spread: 0.008, clip: 100, reserve: 200,
  reload: 2.5, range: 45, sound: 'laser', tracer: '#fd4', beam: true, botRating: 8, botRange: [0, 40], headMult: 1.5,
  view: { len: 0.7, color: '#ccb', accent: '#fd4', glow: '#fd4', coils: true, bulky: true } });
def({ id: 'singularity', name: 'Singularity Grenade', era: 2670, kind: 'thrown', rpm: 50, damage: 0, clip: 1, reserve: 3, reload: 0.1,
  sound: 'throw', botRating: 5, botRange: [6, 22], ammoPickup: 2,
  projectile: { speed: 18, gravity: 14, bounce: 0.3, fuse: 1.8, splash: 6.5, splashDamage: 150, size: 0.13, color: '#60f', glow: true },
  view: { type: 'grenade', color: '#222', accent: '#60f', round: true } });
def({ id: 'paradox', name: 'Paradox Minigun', era: 2670, kind: 'hitscan', auto: true, rpm: 1500, damage: 9, spread: 0.045, clip: 200, reserve: 200,
  reload: 3.5, sound: 'smg', recoil: 0.006, botRating: 9, botRange: [0, 35], spinUp: 0.5,
  view: { type: 'minigun', len: 0.85, color: '#555', accent: '#fc3', bulky: true } });

export const WEAPONS = Object.fromEntries(W.map((w) => [w.id, w]));
export const WEAPON_LIST = W;

/** Weapon sets used by arcade matches (TS-style themed loadouts). */
export const WEAPON_SETS = {
  classic: { name: 'Gangland', weapons: ['mobpistol', 'tommy', 'pumpgun', 'pineapple', 'sputnik'] },
  medieval: { name: 'Olde Worlde', weapons: ['crossbow', 'longbow', 'handgonne', 'firepot', 'fists'] },
  cold: { name: 'Cold War', weapons: ['tokar', 'volk67', 'krasny', 'sputnik', 'tesla'] },
  mall: { name: 'Mall Rats', weapons: ['raduzi', 'boomstick', 'malltuber', 'nailer', 'lasertag'] },
  future: { name: 'Neo-Tokyo', weapons: ['photon', 'raildriver', 'swarm', 'pulseshot', 'monoblade'] },
  space: { name: 'Deep Space', weapons: ['graviton', 'spikerifle', 'voidcannon', 'disruptor', 'singularity'] },
  explosive: { name: 'Boom Town', weapons: ['sputnik', 'malltuber', 'swarm', 'voidcannon', 'pineapple'] },
  snipers: { name: 'Snipers', weapons: ['krasny', 'raildriver', 'crossbow', 'tokar', 'longbow'] },
  melee: { name: 'Fisticuffs', weapons: ['fists', 'monoblade'] },
  random: { name: 'Random', weapons: null },
  all: { name: 'Everything', weapons: W.filter((w) => w.id !== 'fists').map((w) => w.id) },
};
