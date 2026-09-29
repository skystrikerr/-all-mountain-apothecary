import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld } from '../src/engine/collision.js';

const body = (x, y, z) => ({ x, y, z, radius: 0.35, height: 1.8, onGround: false, stepHeight: 0.45 });

test('falls onto the floor and stays grounded', () => {
  const w = new CollisionWorld();
  w.add(-10, -1, -10, 10, 0, 10);
  const b = body(0, 2, 0);
  for (let i = 0; i < 60; i++) w.moveBody(b, 0, -0.2, 0);
  assert.ok(Math.abs(b.y) < 0.01);
  assert.equal(b.onGround, true);
});

test('walls block horizontal movement and slide along the other axis', () => {
  const w = new CollisionWorld();
  w.add(-10, -1, -10, 10, 0, 10);
  w.add(2, 0, -10, 3, 4, 10); // wall at x=2
  const b = body(0, 0.0001, 0);
  b.onGround = true;
  for (let i = 0; i < 30; i++) w.moveBody(b, 0.2, -0.01, 0.1);
  assert.ok(b.x <= 2 - 0.35 + 1e-3, `x=${b.x}`);
  assert.ok(b.z > 2.5, 'slid along the wall');
});

test('steps up onto low obstacles but not high ones', () => {
  const w = new CollisionWorld();
  w.add(-10, -1, -10, 10, 0, 10);
  w.add(1, 0, -5, 3, 0.4, 5); // step
  w.add(5, 0, -5, 7, 1.0, 5); // crate
  const b = body(0, 0.0001, 0); b.onGround = true;
  for (let i = 0; i < 20; i++) w.moveBody(b, 0.1, -0.05, 0);
  assert.ok(b.y > 0.39, `stepped up, y=${b.y}`);
  for (let i = 0; i < 40; i++) w.moveBody(b, 0.1, -0.2, 0);
  assert.ok(b.x < 5 - 0.34, `blocked by crate, x=${b.x}`);
});

test('a body grazing a long wall is not teleported to its far end (regression)', () => {
  const w = new CollisionWorld();
  w.add(-40, -1, -40, 40, 0, 40);
  w.add(-32, 0, 21.75, 32, 14, 22.25); // long facade
  const b = body(-22, 0.0001, 21.45); // penetrating the facade by 0.05
  b.onGround = true;
  w.moveBody(b, -0.1, -0.01, 0);
  assert.ok(b.x > -23 && b.x < -21, `x stayed local: ${b.x}`);
  assert.ok(b.z <= 21.75 - 0.35 + 1e-3, `pushed out of the wall: ${b.z}`);
});

test('raycast hits the nearest box with the right normal', () => {
  const w = new CollisionWorld();
  w.add(5, 0, -1, 6, 2, 1);
  w.add(9, 0, -1, 10, 2, 1);
  const h = w.raycast(0, 1, 0, 1, 0, 0, 100);
  assert.ok(h);
  assert.ok(Math.abs(h.t - 5) < 1e-6);
  assert.equal(h.nx, -1);
  assert.equal(w.raycast(0, 1, 0, -1, 0, 0, 100), null);
  assert.equal(w.lineOfSight(0, 1, 0, 4, 1, 0), true);
  assert.equal(w.lineOfSight(0, 1, 0, 8, 1, 0), false);
});

test('raycast traverses many broadphase cells diagonally', () => {
  const w = new CollisionWorld(4);
  w.add(37, 0, 37, 39, 3, 39);
  const d = Math.SQRT1_2;
  const h = w.raycast(0.5, 1, 0.5, d, 0, d, 200);
  assert.ok(h && h.t > 50 && h.t < 54, `t=${h?.t}`);
});
