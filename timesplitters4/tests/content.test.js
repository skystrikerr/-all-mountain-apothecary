import './dom-stub.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPON_LIST, WEAPONS, WEAPON_SETS } from '../src/content/weapons.js';
import { CHARACTERS } from '../src/content/characters.js';
import { CAMPAIGN } from '../src/content/campaign.js';
import { MODE_INFO } from '../src/game/modes.js';
import { CHALLENGES } from '../src/content/challenges.js';

test('at least 30 distinct weapons with valid archetypes', () => {
  assert.ok(WEAPON_LIST.length >= 30);
  assert.equal(new Set(WEAPON_LIST.map((w) => w.id)).size, WEAPON_LIST.length);
  for (const w of WEAPON_LIST) {
    assert.ok(['melee', 'hitscan', 'projectile', 'thrown'].includes(w.kind), w.id);
    assert.ok(w.rpm > 0, w.id);
    if (w.kind === 'projectile' || w.kind === 'thrown') assert.ok(w.projectile?.speed > 0, w.id);
    if (w.kind !== 'melee') assert.ok(w.clip > 0 && w.reserve > 0, w.id);
  }
  assert.ok(WEAPON_LIST.filter((w) => w.dual).length >= 6, 'several dual-wieldable weapons');
});

test('weapon sets reference real weapons', () => {
  for (const [k, s] of Object.entries(WEAPON_SETS)) if (s.weapons) for (const id of s.weapons) assert.ok(WEAPONS[id], `${k}:${id}`);
});

test('at least 50 unique playable characters', () => {
  assert.ok(CHARACTERS.length >= 50);
  assert.equal(new Set(CHARACTERS.map((c) => c.id)).size, CHARACTERS.length);
  assert.ok(CHARACTERS.filter((c) => c.unlock === 'default').length >= 8, 'a decent starting roster');
});

test('six campaign eras and all required modes', () => {
  assert.equal(CAMPAIGN.length, 6);
  for (const m of ['deathmatch', 'teamdeathmatch', 'capturebag', 'elimination', 'infection', 'survival']) assert.ok(MODE_INFO[m], m);
});

test('challenges have thresholds in increasing order', () => {
  for (const c of CHALLENGES) assert.ok(c.thresholds.bronze <= c.thresholds.silver && c.thresholds.silver <= c.thresholds.gold, c.id);
});
