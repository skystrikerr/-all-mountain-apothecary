// Renders a line-up of characters for visual review: node scripts/lineup.mjs [startIndex]
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const req = createRequire(import.meta.url);
let pw; try { pw = await import('playwright'); } catch { pw = req('/opt/node22/lib/node_modules/playwright'); }
mkdirSync('scripts/shots/views', { recursive: true });
const server = await createServer({ root: process.cwd(), logLevel: 'error', server: { port: 5193 } });
await server.listen();
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(server.resolvedUrls.local[0]);
const start = +(process.argv[2] || 0);
const close = process.argv[3] === 'close';
await page.evaluate(async ({ start, close }) => {
  const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => import('three'));
  const { CharacterModel } = await import('/src/game/characterModel.js');
  const { CHARACTERS } = await import('/src/content/characters.js');
  const { WEAPON_LIST } = await import('/src/content/weapons.js');
  const app = window.__ts4;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a3050');
  scene.add(new THREE.HemisphereLight('#dde8ff', '#553322', 2.2));
  const d = new THREE.DirectionalLight('#fff0d8', 2.5); d.position.set(2, 4, 5); scene.add(d);
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  if (close) { cam.position.set(0, 1.55, 2.6); cam.lookAt(0, 1.48, 0); } else { cam.position.set(0, 1.3, 9); cam.lookAt(0, 1.0, 0); }
  const guns = WEAPON_LIST.filter((w) => w.kind === 'hitscan');
  CHARACTERS.slice(start, start + (close ? 3 : 7)).forEach((c, i) => {
    const m = new CharacterModel(c);
    m.setWeapon(guns[i % guns.length], i % 3 === 0);
    m.root.position.set(close ? (i - 1) * 0.55 : (i - 3) * 1.25, 0, 0);
    m.root.rotation.y = close ? Math.PI + (i - 1) * 0.35 : Math.PI + 0.35;
    m.animate(0.016, { speed: i === 3 ? 6 : 0, crouch: i === 5, pitch: 0, alive: true, airborne: false });
    m.phase = 1; m.animate(0.1, { speed: i === 3 ? 6 : 0, crouch: i === 5, pitch: 0, alive: true, airborne: false });
    scene.add(m.root);
  });
  app.menu.hide();
  const views = [{ camera: cam, viewportPx: (W, H) => ({ x: 0, y: 0, w: W, h: H }), actor: { alive: false, weapons: {} } }];
  app.game = { paused: true, update() {}, render() { app.post.render(scene, views); }, dispose() {} };
}, { start, close });
await page.waitForTimeout(300);
await page.screenshot({ path: `scripts/shots/views/lineup-${start}${close ? '-close' : ''}.png` });
await browser.close(); await server.close();
