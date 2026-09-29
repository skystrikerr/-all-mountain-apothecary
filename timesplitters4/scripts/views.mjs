// Render a set of framed camera views for visual review: node scripts/views.mjs [filter]
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { pw = req('/opt/node22/lib/node_modules/playwright'); }
mkdirSync('scripts/shots/views', { recursive: true });
const server = await createServer({ root: process.cwd(), logLevel: 'error', server: { port: 5197 } });
await server.listen();
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(server.resolvedUrls.local[0]);
const V = [
  // name, level, type, x, y, z, yaw, pitch, weapon
  ['street', 'chicago', 'story', 0, 0, 36, 0, 0.05, 'mobpistol'],
  ['lobby', 'chicago', 'story', 0, 0, 20, 0, 0.1, 'tommy'],
  ['bar', 'chicago', 'story', -12, 0, 20, 2.2, 0, 'pumpgun'],
  ['ballroom', 'chicago', 'story', 0, 0, 4, 0, 0.05, 'tommy'],
  ['kitchen', 'chicago', 'story', 12, 0, 20, -2.3, 0, 'mobpistol'],
  ['office', 'chicago', 'story', -10, 0, -22, 2.4, 0, 'tommy'],
  ['vault', 'chicago', 'story', 10, 0, -22, -2.4, -0.1, 'sputnik'],
  ['galleria', 'galleria', 'arcade', 0, 0, 22, 0, 0.05, 'raduzi'],
  ['galleria2', 'galleria', 'arcade', -22, 0.9, -22, -2.4, -0.05, 'lasertag'],
  ['castle', 'castle', 'arcade', 0, 0, 20, 0, 0.1, 'crossbow'],
  ['castle2', 'castle', 'arcade', -18, 0.9, -4, -1.2, 0, 'handgonne'],
];
const filter = process.argv[2];
for (const [name, level, type, x, y, z, yaw, pitch, weapon] of V) {
  if (filter && !name.includes(filter)) continue;
  await page.evaluate(({ level, type }) => window.__ts4.startGame({ type, level, mode: 'deathmatch', difficulty: 'normal', weaponSet: 'classic',
    players: [{ character: 'ada', source: { kbm: true, pad: 0 } }], bots: type === 'arcade' ? [{ character: 'vinnie', skill: 0 }, { character: 'knight', skill: 0 }, { character: 'ninja', skill: 0 }] : [] }), { level, type });
  await page.evaluate(({ x, y, z, yaw, pitch, weapon, dual }) => {
    const g = window.__game, p = g.localActors[0];
    p.pos.set(x, y, z); p.body.x = x; p.body.y = y + 0.05; p.body.z = z; p.yaw = yaw; p.pitch = pitch;
    p.weapons.give(weapon, { dual: true, quiet: true }); p.weapons.currentId = weapon; p.weapons._changed();
    for (const a of g.actors) if (a.brain) a.brain.skill = 0;
    for (let i = 0; i < 90; i++) g.update(1 / 30);
    p.yaw = yaw; p.pitch = pitch;
    g.hud.centerQueue = []; g.hud._nextCenter();
    g.update(1 / 30); g.render();
  }, { x, y, z, yaw, pitch, weapon });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `scripts/shots/views/${name}.png` });
  console.log('shot', name);
}
await browser.close(); await server.close();
