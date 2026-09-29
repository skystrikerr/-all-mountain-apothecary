import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld } from '../src/engine/collision.js';
import { NavGrid } from '../src/engine/nav.js';

function room() {
  const w = new CollisionWorld();
  w.add(-10, -1, -10, 10, 0, 10);
  // wall across the middle with a door at x in [3,5]
  w.add(-10, 0, -0.2, 3, 4, 0.2);
  w.add(5, 0, -0.2, 10, 4, 0.2);
  return w;
}

test('finds a path through the door', () => {
  const w = room();
  const nav = new NavGrid(w, { minX: -10, minZ: -10, maxX: 10, maxZ: 10 });
  const path = nav.findPath(-6, -6, -6, 6);
  assert.ok(path && path.length >= 2, 'path exists');
  const crossing = path.some((p) => p.x > 2.5 && p.x < 5.5 && Math.abs(p.z) < 1.5);
  assert.ok(crossing, 'path goes via the door: ' + JSON.stringify(path));
  const last = path[path.length - 1];
  assert.ok(Math.hypot(last.x + 6, last.z - 6) < 1);
});

test('no path into a sealed room', () => {
  const w = room();
  w.add(3, 0, -0.2, 5, 4, 0.2); // close the door
  const nav = new NavGrid(w, { minX: -10, minZ: -10, maxX: 10, maxZ: 10 });
  assert.equal(nav.findPath(-6, -6, -6, 6), null);
});

test('cells next to walls are not walkable (agent clearance)', () => {
  const w = room();
  const nav = new NavGrid(w, { minX: -10, minZ: -10, maxX: 10, maxZ: 10 });
  const [i, j] = nav.cellOf(0, 0.5);
  assert.equal(nav.isWalkable(i, j), false);
});
