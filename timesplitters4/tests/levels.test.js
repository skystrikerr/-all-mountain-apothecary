import './dom-stub.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { LevelBuilder } from '../src/engine/levelBuilder.js';
import { NavGrid } from '../src/engine/nav.js';
import { LEVELS } from '../src/content/levels/index.js';
import { defaultMap } from '../src/content/levels/custom.js';

const R = 0.35, H = 1.8;

function build(id, opts) {
  const L = new LevelBuilder({ id });
  LEVELS[id].build(L, opts);
  L.finish();
  return L;
}

function standable(L, x, y, z) {
  const w = L.world;
  const g0 = w.groundHeight(x, z, y + 0.5);
  if (Number.isFinite(g0) && g0 > y) y = g0; // spawns slightly below a low surface are lifted onto it at runtime
  // body box must be free (tiny lift so resting exactly on a surface counts) and there must be ground below.
  const free = w.boxFree(x - R, y + 0.06, z - R, x + R, y + H, z + R);
  const ground = w.groundHeight(x, z, y + 0.5);
  return { free, grounded: Number.isFinite(ground) && y - ground < 1.2 && y - ground > -0.5 };
}

const variants = [
  ['chicago', { story: true }], ['chicago', { story: false }], ['galleria', {}], ['castle', {}], ['custom', { map: defaultMap() }],
];

for (const [id, opts] of variants) {
  test(`${id}${opts.story ? ' (story)' : ''}: spawns, enemies and pickups are placed in open space`, () => {
    const L = build(id, opts);
    const problems = [];
    for (const s of L.spawns) { const r = standable(L, s.x, s.y, s.z); if (!r.free || !r.grounded) problems.push(`spawn ${s.x},${s.z} ${JSON.stringify(r)}`); }
    for (const e of L.enemies) { const y = e.y ?? 0; const r = standable(L, e.x, y, e.z); if (!r.free || !r.grounded) problems.push(`enemy ${e.name} ${e.x},${e.z} ${JSON.stringify(r)}`); }
    for (const p of L.pickups) {
      const inside = !L.world.boxFree(p.x - 0.1, p.y + 0.3, p.z - 0.1, p.x + 0.1, p.y + 0.9, p.z + 0.1);
      if (inside) problems.push(`pickup ${p.type}:${p.id} at ${p.x},${p.y},${p.z} is inside geometry`);
    }
    assert.deepEqual(problems, []);
    assert.ok(L.spawns.length >= (opts.story ? 1 : 4));
  });

  test(`${id}${opts.story ? ' (story)' : ''}: all spawns are connected on the nav grid`, () => {
    const L = build(id, opts);
    const nav = new NavGrid(L.world, L.bounds, { maxFloor: LEVELS[id].navMaxFloor ?? 0.6 });
    const pts = [...L.spawns, ...L.enemies.map((e) => ({ x: e.x, z: e.z }))];
    const from = pts[0];
    const unreachable = [];
    for (const p of pts.slice(1)) if (!nav.findPath(from.x, from.z, p.x, p.z, 50000)) unreachable.push(`${p.x},${p.z}`);
    assert.deepEqual(unreachable, []);
  });
}

test('chicago story: mission items and triggers exist', () => {
  const L = build('chicago', { story: true });
  const items = L.pickups.filter((p) => p.type === 'item').map((p) => p.itemId);
  assert.deepEqual(items.sort(), ['crystal', 'ledger']);
  for (const t of ['lobby', 'portal']) assert.ok(L.triggers.find((x) => x.name === t), t);
  const mission = LEVELS.chicago.mission;
  for (const o of mission.objectives) if (o.marker) assert.ok(L.markers[o.marker], o.marker);
  assert.ok(L.enemies.some((e) => e.tag === 'sal'), 'boss exists');
});
