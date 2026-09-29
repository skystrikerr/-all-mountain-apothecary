import { createServer } from 'vite';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { chromium } = req('/opt/node22/lib/node_modules/playwright');
const server = await createServer({ root: process.cwd(), logLevel: 'error', server: { port: 5196 } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(server.resolvedUrls.local[0]);
const out = await page.evaluate(() => {
  window.__ts4.startGame({ type: 'story', level: 'chicago', difficulty: 'normal', players: [{ character: 'ada', source: { kbm: true, pad: 0 } }], bots: [] });
  const g = window.__game;
  const log = [];
  const orig = g.onKill.bind(g);
  g.onKill = (v, k, info) => { log.push(`${v.name} died at (${v.pos.x.toFixed(1)},${v.pos.y.toFixed(1)},${v.pos.z.toFixed(1)}) fall=${!!info.fall} vy=${v.vel.y.toFixed(1)} t=${g.time.toFixed(2)}`); orig(v, k, info); };
  const start = g.actors.map((a) => `${a.name} (${a.pos.x.toFixed(1)},${a.pos.y.toFixed(2)},${a.pos.z.toFixed(1)})`);
  const trace = new Map();
  for (let i = 0; i < 50; i++) { g.update(1 / 30); for (const a of g.actors) { if (!trace.has(a)) trace.set(a, []); trace.get(a).push(`${a.pos.x.toFixed(1)},${a.pos.y.toFixed(1)},${a.pos.z.toFixed(1)} v${a.vel.y.toFixed(0)} g${a.body.onGround?1:0}`); } }
  for (const [a, t] of trace) if (!a.alive || a.pos.y < -1) log.push(a.name + ': ' + t.join(' | '));
  return { log, start: start.slice(0, 40) };
});
console.log(out.log.map(l=>l.slice(0,200)).join("\n")); console.log(out.start.join("\n"));
await browser.close(); await server.close();
