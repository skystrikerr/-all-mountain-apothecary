import { createServer } from 'vite';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { chromium } = req('/opt/node22/lib/node_modules/playwright');
const server = await createServer({ root: process.cwd(), logLevel: 'error', server: { port: 5198 } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(server.resolvedUrls.local[0]);
const level = process.argv[2] || 'chicago', mode = process.argv[3] || 'capturebag';
await page.evaluate(({ level, mode }) => window.__ts4.startGame({ type: 'arcade', mode, level, weaponSet: 'classic', scoreLimit: 30, timeLimit: 5,
  players: [{ character: 'ada', source: { kbm: true, pad: 0 } }],
  bots: Array.from({ length: 7 }, (_, i) => ({ character: 'vinnie', skill: 0.5 })) }), { level, mode });
for (let k = 0; k < 4; k++) {
  const out = await page.evaluate(() => {
    const g = window.__game;
    for (let i = 0; i < 300; i++) g.update(1 / 30);
    const nav = g.nav; let walk = 0; for (const w of nav.walk) walk += w;
    return { t: g.time.toFixed(0), walk, scores: g.mode.teamScores, bags: g.mode.bags?.map((b) => ({ atHome: b.atHome, carrier: b.carrier?.name, pos: [b.pos.x.toFixed(1), b.pos.z.toFixed(1)] })),
      bots: g.actors.filter((a) => a.brain).map((a) => `${a.team} ${a.alive ? 'A' : 'D'} (${a.pos.x.toFixed(1)},${a.pos.y.toFixed(1)},${a.pos.z.toFixed(1)}) goal=${a.brain.goalKind} path=${a.brain.path ? a.brain.path.length : 'null'} tgt=${a.brain.target?.name ?? '-'} vis=${a.brain.targetVisible} w=${a.weapons.currentId}`) };
  });
  console.log(JSON.stringify(out, null, 1));
}
await browser.close(); await server.close();
