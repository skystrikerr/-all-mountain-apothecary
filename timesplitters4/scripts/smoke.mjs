// Headless smoke test: boots the game in Chromium (SwiftShader WebGL), runs every arena × mode and the
// story mission with bots in accelerated simulation, and fails on any console/page error.
//   npm run smoke            (screenshots go to scripts/shots/)
//   SMOKE_FAST=1 npm run smoke   (fewer combinations)
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'scripts', 'shots');
mkdirSync(shots, { recursive: true });

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through */ }
  const req = createRequire(import.meta.url);
  for (const p of ['/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return req(p); } catch { /* next */ }
  }
  throw new Error('playwright not found — npm i -D playwright');
}

const { chromium } = await loadPlaywright();
const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
const exe = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });

const report = [];
const check = (label) => {
  if (errors.length) { console.error(`✗ ${label}\n  ${errors.join('\n  ')}`); process.exitCode = 1; errors.length = 0; }
  else console.log(`✓ ${label}`);
};

/** Simulate `seconds` of game time with fixed steps (renders only occasionally, for speed). */
async function simulate(seconds, step = 1 / 30) {
  return page.evaluate(({ seconds, step }) => {
    const g = window.__game;
    const n = Math.round(seconds / step);
    for (let i = 0; i < n && window.__game === g; i++) {
      g.update(step);
      if (i % 120 === 0) g.render();
    }
    g.render();
    const m = g.mode;
    return {
      t: g.time.toFixed(1), actors: g.actors.length, alive: g.actors.filter((a) => a.alive).length,
      kills: g.actors.reduce((s, a) => s + a.stats.kills, 0), shots: g.actors.reduce((s, a) => s + a.stats.shots, 0),
      damage: Math.round(g.actors.reduce((s, a) => s + a.stats.damage, 0)),
      over: m.over, mode: m.id, team: m.teamScores?.join(':'), wave: m.wave, objective: m.objectiveText?.(),
    };
  }, { seconds, step });
}

// 1. Title + menus
await page.goto(url);
await page.waitForSelector('.press-start');
await page.screenshot({ path: path.join(shots, '01-title.png') });
await page.mouse.click(640, 360);
await page.waitForSelector('.btn');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(shots, '02-main.png') });
for (const screen of ['story', 'arcade', 'challenges', 'characters', 'options', 'help', 'editor']) {
  await page.evaluate((s) => window.__ts4.menu.show(s), screen);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(shots, `03-menu-${screen}.png`) });
  check(`menu: ${screen}`);
}

// 2. Arcade: every arena × mode
const fast = !!process.env.SMOKE_FAST;
const levels = ['galleria', 'castle', 'chicago'];
const modes = fast ? ['deathmatch', 'capturebag'] : ['deathmatch', 'teamdeathmatch', 'capturebag', 'elimination', 'infection', 'survival'];
for (const level of levels) {
  for (const mode of modes) {
    await page.evaluate(({ level, mode }) => {
      window.__ts4.startGame({
        type: 'arcade', mode, level, weaponSet: mode === 'survival' ? 'all' : 'random', scoreLimit: 30, timeLimit: 5, lives: 3,
        players: [{ character: 'ada', name: 'You', source: { kbm: true, pad: 0 } }],
        bots: mode === 'survival' ? [] : Array.from({ length: 7 }, (_, i) => ({ character: ['vinnie', 'knight', 'ninja', 'marine', 'skater', 'sergei', 'greys'][i], skill: 0.3 + i * 0.1 })),
      });
    }, { level, mode });
    const r = await simulate(fast ? 20 : 45);
    report.push({ level, mode, ...r });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(shots, `10-${level}-${mode}.png`) });
    check(`arcade ${level}/${mode}: t=${r.t}s actors=${r.actors} shots=${r.shots} kills=${r.kills}${r.team ? ` teams=${r.team}` : ''}${r.wave ? ` wave=${r.wave}` : ''}`);
    if (r.shots === 0 && r.damage === 0) { console.error(`  ! no combat happened in ${level}/${mode}`); process.exitCode = 1; }
  }
}

// 3. Split-screen 2 players
await page.evaluate(() => window.__ts4.startGame({
  type: 'arcade', mode: 'teamdeathmatch', level: 'galleria', weaponSet: 'classic', scoreLimit: 30, timeLimit: 5, teamSplit: 'versus',
  players: [{ character: 'ada', name: 'P1', source: { kbm: true, pad: -1 } }, { character: 'rook', name: 'P2', source: { kbm: false, pad: 0 } }],
  bots: [{ character: 'vinnie', skill: 0.5 }, { character: 'knight', skill: 0.5 }],
}));
await simulate(5);
await page.screenshot({ path: path.join(shots, '20-splitscreen.png') });
check('split-screen 2P');

// 4. Story mission: run the AI world for a while, then script the objectives to check the mission flow end-to-end.
await page.evaluate(() => window.__ts4.startGame({ type: 'story', level: 'chicago', difficulty: 'easy', players: [{ character: 'ada', name: 'Ada', source: { kbm: true, pad: 0 } }], bots: [] }));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(shots, '30-story-start.png') });
let r = await simulate(2);
check(`story start: actors=${r.actors} objective="${r.objective}"`);
const flow = await page.evaluate(() => {
  const g = window.__game, p = g.localActors[0], log = [];
  p.maxHealth = 1e9; p.health = 1e9; // god mode for the scripted run
  const tp = (x, y, z) => { p.pos.set(x, y, z); p.body.x = x; p.body.y = y; p.body.z = z; p.vel.set(0, 0, 0); };
  const run = (s) => { for (let i = 0; i < s * 30; i++) g.update(1 / 30); };
  tp(0, 0.05, 14); run(1); log.push(g.mode.objectiveText());
  const ledger = g.level.markers.ledger; tp(ledger.x, 0.05, -31.0); run(1); log.push(g.mode.objectiveText());
  const cr = g.level.markers.crystal; tp(cr.x, 0.05, -30.5); run(1); log.push(g.mode.objectiveText());
  const sal = g.actors.find((a) => a.tag === 'sal');
  log.push(`sal spawned: ${!!sal}`);
  if (sal) sal.takeDamage(99999, p, {});
  run(1); log.push(g.mode.objectiveText());
  tp(0, 0.5, -16.5); run(1);
  log.push(`over=${g.mode.over} success=${g.mode.success} medal=${g.mode.medal()}`);
  return log;
});
console.log('  mission flow:', flow.join(' → '));
if (!flow.at(-1).includes('success=true')) { console.error('✗ mission could not be completed'); process.exitCode = 1; }
await page.waitForTimeout(4500);
await page.screenshot({ path: path.join(shots, '31-story-complete.png') });
check('story mission flow');

// 5. Story with AI fighting the (god-mode) player for a while
await page.evaluate(() => window.__ts4.startGame({ type: 'story', level: 'chicago', difficulty: 'hard', players: [{ character: 'ada', name: 'Ada', source: { kbm: true, pad: 0 } }], bots: [] }));
await page.evaluate(() => { const p = window.__game.localActors[0]; p.maxHealth = 1e9; p.health = 1e9; p.pos.set(0, 0.05, 14); p.body.x = 0; p.body.y = 0.05; p.body.z = 14; });
r = await simulate(20);
await page.screenshot({ path: path.join(shots, '32-story-combat.png') });
check(`story combat: shots=${r.shots} kills=${r.kills}`);
if (r.shots === 0) { console.error('  ! story enemies never fired'); process.exitCode = 1; }

// 6. Custom map from the editor + a challenge
await page.evaluate(async () => {
  const { defaultMap } = await import('/src/content/levels/custom.js');
  window.__ts4.startGame({ type: 'arcade', mode: 'deathmatch', level: 'custom', customMap: defaultMap(), weaponSet: 'classic', scoreLimit: 10, timeLimit: 5,
    players: [{ character: 'ada', source: { kbm: true, pad: 0 } }], bots: [{ character: 'vinnie', skill: 0.5 }, { character: 'duck', skill: 0.5 }] });
});
r = await simulate(20);
await page.screenshot({ path: path.join(shots, '40-custom-map.png') });
check(`custom map: shots=${r.shots} kills=${r.kills}`);

await page.evaluate(() => window.__ts4.menu.show('challenges'));
await page.evaluate(() => document.querySelector('.card[data-id=typewriter]').click());
r = await simulate(10);
check(`challenge typewriter: shots=${r.shots}`);

// 7. Results screen via real game-over path
await page.evaluate(() => { const g = window.__game; g.mode.end(g.localActors[0]); });
await simulate(4);
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shots, '50-results.png') });
check('results screen');

console.table(report);
await browser.close();
await server.close();
console.log(process.exitCode ? 'SMOKE FAILED' : 'SMOKE OK');
