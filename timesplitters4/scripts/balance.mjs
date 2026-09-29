// Balance probe: how long does an idle / god-mode player survive, and how do bots fare against each other?
import { createServer } from 'vite';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { chromium } = req('/opt/node22/lib/node_modules/playwright');
const server = await createServer({ root: process.cwd(), logLevel: 'error', server: { port: 5195 } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(server.resolvedUrls.local[0]);
for (const diff of ['easy', 'normal', 'hard']) {
  for (const weapon of ['mobpistol', 'tommy', 'pumpgun']) {
    const out = await page.evaluate(({ diff, weapon }) => {
      window.__ts4.startGame({ type: 'story', level: 'chicago', difficulty: diff, players: [{ character: 'ada', source: { kbm: true, pad: 0 } }], bots: [] });
      const g = window.__game, p = g.localActors[0];
      for (const a of [...g.actors]) if (a.brain) { a.dispose(); g.actors.splice(g.actors.indexOf(a), 1); }
      const e = g.addBot({ character: 'vinnie', team: 1, enemyNPC: true, skill: g.mode.diff.skill, behaviour: 'guard', post: { x: 0, z: 26, yaw: 0 },
        weapons: ['fists', weapon], maxHealth: 1e6, damageScale: g.mode.diff.enemyDamage, spawn: { x: 0, y: 0, z: 28, yaw: 0 } });
      const tp = (x, z) => { p.pos.set(x, 0.05, z); p.body.x = x; p.body.y = 0.05; p.body.z = z; };
      tp(0, 38);
      p.maxHealth = 1e6; p.health = 1e6; p.invuln = 0;
      e.brain.alert(p.pos, p);
      for (let i = 0; i < 600; i++) { g.update(1 / 30); p.health = Math.max(p.health, 1); }
      return { diff, weapon, dps: ((1e6 - p.health) / 20).toFixed(1), shots: e.stats.shots, hits: e.stats.hits, dist: e.pos.distanceTo(p.pos).toFixed(1) };
    }, { diff, weapon });
    console.log(JSON.stringify(out));
  }
}
await browser.close(); await server.close();
