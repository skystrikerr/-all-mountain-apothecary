// Story missions: sequential objectives defined in data by each level, with script hooks,
// checkpoints on objective completion, difficulty scaling and TS-style medals.
import * as THREE from 'three';
import { audio } from '../engine/audio.js';

export const DIFFICULTY = {
  easy: { name: 'Easy', skill: 0.25, enemyHealth: 0.7, enemyDamage: 0.35, medal: 'bronze', playerArmor: 50 },
  normal: { name: 'Normal', skill: 0.5, enemyHealth: 1, enemyDamage: 0.45, medal: 'silver', playerArmor: 0 },
  hard: { name: 'Hard', skill: 0.82, enemyHealth: 1.25, enemyDamage: 0.65, medal: 'gold', playerArmor: 0 },
};

export class MissionMode {
  constructor(game, cfg) {
    this.game = game;
    this.cfg = cfg;
    this.mission = game.levelDef.mission;
    this.diff = DIFFICULTY[cfg.difficulty || 'normal'];
    this.over = false;
    this.success = false;
    this.failed = false;
    this.elapsed = 0;
    this.index = -1;
    this.done = [];
    this.checkpoint = null;
    this.respawnDelay = Infinity;
    this.teamScores = [0, 0];
    this.spawnedGroups = new Set();
    this.flags = {};
    this.scripts = (this.mission.scripts || []).map((sc) => ({ ...sc, fired: false }));
  }

  get id() { return 'story'; }
  get name() { return this.mission.title; }
  get teams() { return false; }
  get current() { return this.mission.objectives[this.index]; }

  setup() {
    this.spawnGroup(null);
    this._advance();
    this.saveCheckpoint();
  }

  /** Spawn every level enemy belonging to `group` (null = the initial, non-dormant enemies). */
  spawnGroup(group) {
    const g = this.game;
    if (group && this.spawnedGroups.has(group)) return;
    if (group) this.spawnedGroups.add(group);
    for (const e of g.level.enemies) {
      if ((group === null && e.dormant) || (group !== null && e.dormant !== group)) continue;
      const a = g.addBot({
        character: e.character, name: e.name, team: 1, enemyNPC: true, tag: e.tag,
        skill: Math.min(1, this.diff.skill + (e.skillBonus ?? 0)),
        behaviour: e.patrol ? 'patrol' : (e.dormant ? 'hunter' : 'guard'),
        post: { x: e.x, z: e.z, yaw: e.yaw ?? 0 }, patrol: e.patrol?.map(([x, z]) => ({ x, z })), group: e.group || 'default',
        weapons: e.weapons || ['fists', 'mobpistol'],
        maxHealth: Math.round((e.health ?? 70) * this.diff.enemyHealth),
        damageScale: this.diff.enemyDamage * (e.damage ?? 1),
        armor: e.armor ?? 0,
        spawn: { x: e.x, y: e.y ?? 0, z: e.z, yaw: e.yaw ?? 0 },
      });
      if (e.dormant) a.brain.alert(g.localActors[0]?.pos ?? a.pos, g.localActors[0]);
    }
  }

  ctx() {
    const g = this.game;
    return {
      game: g, mission: this, flags: this.flags,
      spawnGroup: (name) => this.spawnGroup(name),
      message: (text, t = 3) => g.centerMessage(text, t),
      sound: (name) => audio.play(name, null, 0.7),
      alertAll: () => { for (const a of g.actors) if (a.brain && a.alive) a.brain.alert(g.localActors[0].pos, g.localActors[0], false); },
    };
  }

  _advance() {
    this.index++;
    const obj = this.current;
    if (!obj) { this._complete(); return; }
    obj.onStart?.(this.ctx());
    this.game.centerMessage(`NEW OBJECTIVE\n${obj.text}`, 3.2);
    this.game.objectiveMarker = obj.marker ? this.game.level.markers[obj.marker] : null;
  }

  completeObjective() {
    const obj = this.current;
    if (!obj) return;
    this.done.push(obj.id);
    audio.play('objective', null, 0.8);
    this.game.feed(`Objective complete: ${obj.text}`, '#8f8');
    obj.onComplete?.(this.ctx());
    this._advance();
    if (!this.over) this.saveCheckpoint();
  }

  _complete() {
    this.over = true;
    this.success = true;
    this.game.objectiveMarker = null;
  }

  saveCheckpoint() {
    const p = this.game.localActors[0];
    if (!p || !p.alive) return;
    this.checkpoint = {
      pos: p.pos.clone(), yaw: p.yaw, armor: p.armor,
      weapons: [...p.weapons.inv.values()].map((s) => ({ id: s.id, dual: s.dual, ammo: s.reserve + s.clip + s.clipL })),
    };
  }

  retryFromCheckpoint() {
    const g = this.game;
    const c = this.checkpoint;
    this.failed = false;
    this.over = false;
    for (const p of g.localActors) {
      g.views[p.localIndex]?.respawned();
      p.spawn({ x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw }, { weapons: c.weapons, armor: Math.max(c.armor, this.diff.playerArmor), invuln: 2 });
    }
    // Enemies calm down a little so the player isn't instantly swarmed.
    for (const a of g.actors) if (a.brain) { a.brain.targetVisible = false; a.brain.reactionT = 1.5; }
    this.retries = (this.retries || 0) + 1;
  }

  update(dt) {
    if (this.over) return;
    this.elapsed += dt;
    const obj = this.current;
    if (!obj) return;
    const g = this.game;
    if (obj.type === 'reach') {
      const trig = g.level.triggers.find((t) => t.name === obj.trigger);
      if (trig && g.localActors.some((p) => p.alive && inside(trig, p.pos))) this.completeObjective();
    } else if (obj.type === 'killGroup') {
      const left = g.actors.filter((a) => a.alive && a.isEnemyNPC && a.brain?.group === obj.group).length;
      if (left === 0 && (!obj.requireSpawned || this.spawnedGroups.has(obj.group))) this.completeObjective();
    } else if (obj.type === 'custom') {
      if (obj.check?.(this.ctx())) this.completeObjective();
    }
    // Scripted triggers (non-objective): e.g. ambushes
    for (const s of this.scripts) {
      if (s.fired) continue;
      const trig = g.level.triggers.find((t) => t.name === s.trigger);
      if (trig && g.localActors.some((p) => p.alive && inside(trig, p.pos))) { s.fired = true; s.run(this.ctx()); }
    }
  }

  onKill(victim, killer) {
    const g = this.game;
    if (victim.isPlayer) {
      if (g.localActors.every((p) => !p.alive)) { this.failed = true; }
      return;
    }
    if (killer?.isPlayer) killer.stats.score++;
    const obj = this.current;
    if (obj && obj.type === 'kill' && victim.tag === obj.target) this.completeObjective();
  }

  onItemCollected(actor, pickup) {
    const obj = this.current;
    this.flags[pickup.itemId] = true;
    if (obj && obj.type === 'collect' && obj.item === pickup.itemId) this.completeObjective();
  }

  canPickup(actor, p) {
    if (p.type === 'item') {
      // mission items can only be collected once they are the current objective (or are optional)
      const obj = this.current;
      return !!(obj && obj.type === 'collect' && obj.item === p.itemId) || p.optional;
    }
    return true;
  }

  canRespawn(a) { return false; }
  timeLeft() { return null; }
  ranking() { return this.game.localActors; }
  winnerText() { return this.success ? 'MISSION COMPLETE' : 'MISSION FAILED'; }
  hudLine() { return ''; }
  objectiveText() { return this.current ? this.current.text : 'Mission complete'; }
  botGoal() { return null; }

  medal() {
    if (!this.success) return null;
    return this.diff.medal;
  }
}

function inside(t, p) {
  return p.x >= t.minX && p.x <= t.maxX && p.z >= t.minZ && p.z <= t.maxZ && p.y >= t.minY && p.y <= t.maxY;
}

export { inside, THREE };
