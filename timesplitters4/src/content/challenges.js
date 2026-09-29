// Arcade challenges: preset matches with a scoring metric and bronze/silver/gold thresholds.
// Each medal can unlock characters (see content/characters.js `unlock: { challenge }`).

const bots = (n, chars, skill) => Array.from({ length: n }, (_, i) => ({ character: chars[i % chars.length], skill }));

export const CHALLENGES = [
  {
    id: 'typewriter', name: 'Chicago Typewriter', desc: 'Tommy guns only. Rack up kills in two minutes at the Hotel Stiletto.',
    config: { level: 'chicago', mode: 'deathmatch', weaponSet: 'classic', timeLimit: 2, scoreLimit: 999, bots: bots(7, ['vinnie', 'bookie', 'flapper', 'chef'], 0.35),
      challenge: { loadout: ['fists', { id: 'tommy', dual: true, ammo: 400 }] } },
    metric: (r) => r.localStats[0].kills, unit: 'kills', thresholds: { bronze: 6, silver: 10, gold: 15 },
  },
  {
    id: 'bones', name: 'Rattle Their Bones', desc: 'Fisticuffs in Castle Morrow against the undead. Knock out as many as you can.',
    config: { level: 'castle', mode: 'deathmatch', weaponSet: 'melee', timeLimit: 2, scoreLimit: 999, bots: bots(6, ['skeleton', 'mobzombie'], 0.3),
      challenge: { loadout: ['fists'] } },
    metric: (r) => r.localStats[0].kills, unit: 'kills', thresholds: { bronze: 5, silver: 9, gold: 13 },
  },
  {
    id: 'sniper', name: 'Cold War Marksman', desc: 'Krasny scope rifle only. Every headshot counts.',
    config: { level: 'castle', mode: 'deathmatch', weaponSet: 'snipers', timeLimit: 3, scoreLimit: 999, bots: bots(5, ['sergei', 'agent', 'robot67'], 0.45),
      challenge: { loadout: ['fists', { id: 'krasny', ammo: 60 }] } },
    metric: (r) => r.localStats[0].headshots, unit: 'headshots', thresholds: { bronze: 4, silver: 8, gold: 12 },
  },
  {
    id: 'arcade', name: 'Mall Rats', desc: 'Mall weapons, 7 hard bots, first to 20. Finish on the podium.',
    config: { level: 'galleria', mode: 'deathmatch', weaponSet: 'mall', timeLimit: 6, scoreLimit: 20, bots: bots(7, ['skater', 'mallcop', 'grunge', 'foodcourt', 'surfer', 'arcadequeen', 'idol'], 0.72) },
    metric: (r) => { const i = r.ranking.findIndex((x) => x.isPlayer); return i < 0 ? 0 : 4 - Math.min(4, i + 1) + 1; },
    unit: 'place', display: (v) => ['—', '4th+', '3rd', '2nd', '1st'][v] ?? '—', thresholds: { bronze: 2, silver: 3, gold: 4 },
  },
  {
    id: 'survival', name: 'Last Stand', desc: 'Survive endless waves of time-mutants in the Galleria. 3 lives.',
    config: { level: 'galleria', mode: 'survival', weaponSet: 'all', timeLimit: 0, bots: [] },
    metric: (r) => Math.max(0, (r.wave ?? 1) - 1), unit: 'waves', thresholds: { bronze: 3, silver: 5, gold: 8 },
  },
  {
    id: 'melee', name: 'Duck Season', desc: 'Monoblade vs a flock of Sgt. Quackers. Two minutes.',
    config: { level: 'galleria', mode: 'deathmatch', weaponSet: 'melee', timeLimit: 2, scoreLimit: 999, bots: bots(6, ['duck'], 0.35),
      challenge: { loadout: ['fists', 'monoblade'] } },
    metric: (r) => r.localStats[0].kills, unit: 'kills', thresholds: { bronze: 5, silver: 9, gold: 14 },
  },
  {
    id: 'elimination', name: 'Last Splitter Standing', desc: 'Elimination with 3 lives against 7 bots. Outlast them.',
    config: { level: 'castle', mode: 'elimination', weaponSet: 'medieval', lives: 3, timeLimit: 0, bots: bots(7, ['knight', 'archer', 'jester', 'monk', 'peasant', 'plaguedoc', 'queen'], 0.55) },
    metric: (r) => { const i = r.ranking.findIndex((x) => x.isPlayer); return i < 0 ? 0 : Math.max(0, 4 - i); },
    unit: 'place', display: (v) => ['—', '4th', '3rd', '2nd', '1st'][v] ?? '—', thresholds: { bronze: 2, silver: 3, gold: 4 },
  },
  {
    id: 'infection', name: 'Patient Zero', desc: 'Infection on the Hotel Stiletto. Stay clean as long as you can.',
    config: { level: 'chicago', mode: 'infection', weaponSet: 'classic', timeLimit: 4, bots: bots(9, ['vinnie', 'bookie', 'flapper', 'copper', 'chef', 'bellhop'], 0.5) },
    metric: (r) => r.localStats[0].score, unit: 'points', thresholds: { bronze: 6, silver: 12, gold: 20 },
  },
  {
    id: 'neon', name: 'Neon Overdrive', desc: 'Neo-Tokyo arsenal, team deathmatch, you and 3 bots vs 4 expert bots.',
    config: { level: 'galleria', mode: 'teamdeathmatch', weaponSet: 'future', timeLimit: 5, scoreLimit: 30,
      bots: [...bots(3, ['android', 'hacker', 'idol'], 0.6).map((b) => ({ ...b, team: 0 })), ...bots(4, ['ninja', 'enforcer', 'yakuza', 'mecha'], 0.85).map((b) => ({ ...b, team: 1 }))] },
    metric: (r) => r.teamScores[0] - r.teamScores[1], unit: 'kill margin', thresholds: { bronze: 1, silver: 6, gold: 12 },
  },
];

export function medalFor(ch, value) {
  if (value >= ch.thresholds.gold) return 'gold';
  if (value >= ch.thresholds.silver) return 'silver';
  if (value >= ch.thresholds.bronze) return 'bronze';
  return null;
}
