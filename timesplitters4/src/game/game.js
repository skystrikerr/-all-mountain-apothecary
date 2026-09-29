// Game: owns one running match or mission. Builds the level, spawns actors, runs the simulation,
// resolves combat and renders every local player's viewport (split-screen).
import * as THREE from 'three';
import { LevelBuilder } from '../engine/levelBuilder.js';
import { NavGrid } from '../engine/nav.js';
import { rayBox } from '../engine/collision.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { Actor, TEAM_COLORS } from './actor.js';
import { BotBrain } from './bot.js';
import { Effects } from './effects.js';
import { Projectiles } from './projectiles.js';
import { Pickups } from './pickups.js';
import { createMode } from './modes.js';
import { MissionMode } from './mission.js';
import { PlayerView } from './playerView.js';
import { Hud } from '../ui/hud.js';
import { LEVELS } from '../content/levels/index.js';
import { CHARACTER_MAP, CHARACTERS } from '../content/characters.js';
import { WEAPONS, WEAPON_SETS } from '../content/weapons.js';

const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Vector3();

export class Game {
  /**
   * config: {
   *   type: 'story' | 'arcade' | 'challenge',
   *   level: level id (or 'custom' with customMap), mode: mode id, difficulty,
   *   players: [{ character, name, source: {kbm, pad} }],
   *   bots: [{ character, skill, team }], scoreLimit, timeLimit, weaponSet, teamSplit
   * }
   */
  constructor(app, config) {
    this.app = app;
    this.config = config;
    this.renderer = app.renderer;
    this.scene = new THREE.Scene();
    this.time = 0;
    this.paused = false;
    this.actors = [];
    this.localActors = [];
    this.views = [];
    this.noises = [];
    this.pendingRemovals = [];
    this.objectiveMarker = null;
    this.endT = null;
    this.timeScale = 1;

    // ---- Level
    const levelDef = config.customMap ? LEVELS.custom : LEVELS[config.level];
    this.levelDef = levelDef;
    const L = new LevelBuilder({ id: levelDef.id });
    levelDef.build(L, { story: config.type === 'story', map: config.customMap, mode: config.mode });
    L.finish({ env: levelDef.env || {} });
    this.level = L;
    this.world = L.world;
    this.scene.add(L.group);
    this._setupEnvironment(levelDef.env || {});

    // ---- Systems
    this.effects = new Effects(this.scene);
    this.projectiles = new Projectiles(this);
    this.pickups = new Pickups(this);
    this.nav = new NavGrid(this.world, L.bounds, { maxFloor: levelDef.navMaxFloor ?? 0.6 });
    this._pruneNav();

    // ---- Mode
    this.mode = config.type === 'story' ? new MissionMode(this, config) : createMode(config.mode || 'deathmatch', this, config);
    this.weaponSet = this._resolveWeaponSet(config.weaponSet);

    // ---- Pickups from level (weapon slots are mapped onto the weapon set)
    for (const p of L.pickups) {
      if (p.type === 'weapon' && p.id.startsWith('slot')) {
        const idx = parseInt(p.id.slice(4), 10) - 1;
        const wid = this.weaponSet[idx % this.weaponSet.length];
        if (!wid || wid === 'fists') continue;
        this.pickups.add({ ...p, id: wid });
      } else this.pickups.add(p);
    }

    // ---- Local players
    const teamMode = this.mode.teams;
    config.players.forEach((pc, i) => {
      const team = teamMode ? (config.teamSplit === 'versus' ? i % 2 : 0) : (config.type === 'story' || this.mode.coop ? 0 : -1);
      const a = new Actor(this, {
        character: CHARACTER_MAP[pc.character] || CHARACTERS[0], name: pc.name || (config.players.length > 1 ? `P${i + 1}` : 'You'),
        team, isPlayer: true, localIndex: i,
      });
      a.model.setLayer(1 + i);
      this.actors.push(a);
      this.localActors.push(a);
    });
    // ---- Bots
    const botTeams = [0, 0];
    for (const a of this.localActors) if (a.team >= 0) botTeams[a.team]++;
    for (const b of config.bots || []) {
      let team = -1;
      if (teamMode) { team = b.team ?? (botTeams[0] <= botTeams[1] ? 0 : 1); botTeams[team]++; }
      this.addBot({ character: b.character, skill: b.skill, team, behaviour: 'arcade', weapons: this._spawnLoadout(), spawn: null, deferSpawn: true });
    }

    this.mode.setup();

    // ---- Spawn everyone
    for (const a of this.actors) {
      if (a.alive) continue;
      if (a.isPlayer && config.type === 'story') {
        const s = L.spawns.find((sp) => sp.team === 0 || sp.team === -1) || L.spawns[0];
        const diff = this.mode.diff;
        a.spawn(s, { weapons: levelDef.mission.startWeapons || ['fists', 'mobpistol'], armor: diff.playerArmor });
      } else if (!a.isEnemyNPC) a.spawn(this.pickSpawn(a), { weapons: this._spawnLoadout() });
    }
    if (config.type === 'story') this.mode.saveCheckpoint();

    // ---- Views + HUD
    const n = this.localActors.length;
    this.localActors.forEach((a, i) => {
      const src = config.players[i].source || { kbm: true, pad: 0 };
      this.views.push(new PlayerView(this, a, i, n, src));
    });
    this.hud = new Hud(app.hudRoot, this);
    audio.playMusic(levelDef.music || 'arena');
    if (config.type === 'story') this.centerMessage(`${levelDef.mission.title}\n${levelDef.era}`, 3.5);
    else this.centerMessage(`${this.mode.name.toUpperCase()}\n${levelDef.name}`, 2.5);
    for (const [text, t] of this._pendingCenter || []) this.centerMessage(text, t);
    this._pendingCenter = null;
  }

  _resolveWeaponSet(setId) {
    if (this.config.type === 'story') return ['mobpistol', 'tommy', 'pumpgun', 'pineapple', 'sputnik'];
    const set = WEAPON_SETS[setId || 'classic'] || WEAPON_SETS.classic;
    if (set.weapons) return set.weapons;
    const all = Object.keys(WEAPONS).filter((id) => id !== 'fists');
    const out = [];
    while (out.length < 5) { const w = all[Math.floor(Math.random() * all.length)]; if (!out.includes(w)) out.push(w); }
    return out;
  }

  _spawnLoadout() {
    if (this.config.challenge?.loadout) return this.config.challenge.loadout;
    const first = this.weaponSet[0];
    return ['fists', first];
  }

  _setupEnvironment(env) {
    const s = this.scene;
    s.background = new THREE.Color(env.sky || '#223');
    if (env.fog) s.fog = new THREE.Fog(env.fog[0], env.fog[1], env.fog[2]);
    const hemi = new THREE.HemisphereLight(env.hemiSky || '#aabbdd', env.hemiGround || '#443322', env.hemi ?? 0.9);
    s.add(hemi);
    s.add(new THREE.AmbientLight(env.ambient || '#404050', env.ambientIntensity ?? 0.6));
    if (env.sun) {
      const sun = new THREE.DirectionalLight(env.sun.color || '#fff', env.sun.intensity ?? 1.5);
      sun.position.set(...(env.sun.dir || [30, 50, 20]));
      if (false) { // shadow maps disabled: static shadows are baked, actors use blob shadows
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const r = env.sun.shadowRange ?? 50;
        Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 200 });
        sun.shadow.bias = -0.0008;
        sun.shadow.normalBias = 0.03;
        sun.target.position.set(...(env.sun.target || [0, 0, 0]));
        s.add(sun.target);
      }
      s.add(sun);
    }
    if (env.skyDome) s.add(env.skyDome());
  }

  /** Remove nav cells not reachable from any spawn (table tops, sealed voids...). */
  _pruneNav() {
    const nav = this.nav;
    const seen = new Uint8Array(nav.w * nav.h);
    const queue = [];
    const seeds = [...this.level.spawns, ...this.level.enemies];
    for (const s of seeds) {
      const c = nav.nearest(s.x, s.z, 3);
      if (c) { const i = nav.idx(c[0], c[1]); if (!seen[i]) { seen[i] = 1; queue.push(i); } }
    }
    while (queue.length) {
      const cur = queue.pop();
      const ci = cur % nav.w, cj = (cur / nav.w) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = ci + di, nj = cj + dj;
        if (!nav.isWalkable(ni, nj)) continue;
        const n = nav.idx(ni, nj);
        if (seen[n] || Math.abs(nav.height[n] - nav.height[cur]) > nav.maxClimb) continue;
        seen[n] = 1; queue.push(n);
      }
    }
    if (queue.length === 0 && seeds.length === 0) return;
    for (let i = 0; i < seen.length; i++) if (!seen[i]) nav.walk[i] = 0;
  }

  charName(id) { return CHARACTER_MAP[id]?.name ?? id; }

  addBot(opts) {
    const character = CHARACTER_MAP[opts.character] || CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    const a = new Actor(this, {
      character, name: opts.name || character.name, team: opts.team ?? -1, tag: opts.tag,
      maxHealth: opts.maxHealth, damageScale: opts.damageScale,
    });
    a.isEnemyNPC = !!opts.enemyNPC;
    a.model.setLayer(0);
    a.loadout = opts.weapons;
    new BotBrain(this, a, { skill: opts.skill, behaviour: opts.behaviour, post: opts.post, patrol: opts.patrol, group: opts.group });
    this.actors.push(a);
    if (!opts.deferSpawn) {
      a.spawn(opts.spawn || this.pickSpawn(a), { weapons: opts.weapons || this._spawnLoadout(), armor: opts.armor ?? 0, invuln: opts.enemyNPC ? 0 : 1.2 });
    }
    return a;
  }

  removeActorLater(actor, t) { this.pendingRemovals.push({ actor, t }); }

  pickSpawn(actor, avoid = null) {
    const spawns = this.level.spawns;
    if (spawns.length === 0) return { x: 0, y: 1, z: 0, yaw: 0 };
    let cands = spawns;
    if (actor && actor.team >= 0 && this.mode.teams) {
      const t = spawns.filter((s) => s.team === actor.team);
      if (t.length) cands = t;
    }
    const threats = avoid || this.actors.filter((o) => o.alive && o !== actor && (!actor || this.areEnemies(actor, o)));
    const scored = cands.map((s) => {
      let md = 999;
      for (const o of threats) md = Math.min(md, Math.hypot(o.pos.x - s.x, o.pos.z - s.z));
      // penalise spawns occupied by anyone
      for (const o of this.actors) if (o.alive && Math.hypot(o.pos.x - s.x, o.pos.z - s.z) < 1.5) md -= 50;
      return { s, score: md + Math.random() * 6 };
    }).sort((a, b) => b.score - a.score);
    return scored[0].s;
  }

  // ------------------------------------------------------------------ relations
  areEnemies(a, b) {
    if (a === b) return false;
    if (this.mode.id === 'infection') return a.infected !== b.infected;
    if (this.mode.id === 'story' || this.mode.coop) return !!a.isEnemyNPC !== !!b.isEnemyNPC;
    if (this.mode.teams) return a.team !== b.team;
    return true;
  }

  canDamage(att, vic) { return att === vic || this.areEnemies(att, vic); }

  // ------------------------------------------------------------------ combat resolution
  hitscan(shooter, w, origin, dir, muzzle) {
    const range = w.range;
    const wh = this.world.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, range);
    const maxT = wh ? wh.t : range;
    const ix = 1 / dir.x, iy = 1 / dir.y, iz = 1 / dir.z;
    const hits = [];
    for (const a of this.actors) {
      if (!a.alive || a === shooter) continue;
      let best = null;
      for (const hb of a.hitBoxes()) {
        const h = rayBox(origin.x, origin.y, origin.z, ix, iy, iz, hb, maxT);
        if (h && (!best || h.t < best.t || (hb.head && Math.abs(h.t - best.t) < 0.05))) best = { t: h.t, head: hb.head };
      }
      if (best) hits.push({ a, ...best });
    }
    hits.sort((p, q) => p.t - q.t);
    let endT = maxT;
    let stoppedByActor = false;
    for (const h of hits) {
      const falloff = w.pellets > 1 ? 1 - Math.min(0.7, Math.max(0, (h.t - range * 0.25) / range)) : 1;
      const dmg = w.damage * (h.head ? w.headMult : 1) * falloff;
      const point = _p.copy(origin).addScaledVector(dir, h.t).clone();
      this.applyHit(shooter, h.a, dmg, { weapon: w, headshot: h.head, dir: dir.clone(), point });
      if (!w.pierce) { endT = h.t; stoppedByActor = true; break; }
    }
    const end = _c.copy(origin).addScaledVector(dir, endT);
    if (w.beam) this.effects.beam(muzzle, end, w.tracer || 0x66ccff, w.pierce ? 0.07 : 0.03, w.pierce ? 0.35 : 0.08);
    else if (Math.random() < (w.pellets > 1 ? 0.35 : 0.7)) this.effects.tracer(muzzle, end, w.tracer || 0xffe9a0);
    if (!stoppedByActor && wh) this.effects.impact(end, _d.set(wh.nx, wh.ny, wh.nz), w.beam ? w.tracer : 0xffd080, !w.beam);
    if (shooter.isPlayer || Math.random() < 0.3) this.effects.flash(muzzle, w.beam ? (w.tracer || 0x66ccff) : 0xffaa55, 2.2, 7, 0.05);
  }

  melee(attacker, w, origin, dir) {
    let best = null, bestD = Infinity;
    for (const a of this.actors) {
      if (!a.alive || a === attacker || !this.areEnemies(attacker, a)) continue;
      const c = a.chest(_c);
      const to = _p.subVectors(c, origin);
      const d = to.length();
      if (d > w.range + 0.4) continue;
      if (to.normalize().dot(dir) < 0.6 && d > 1.0) continue;
      if (!this.world.lineOfSight(origin.x, origin.y, origin.z, c.x, c.y, c.z)) continue;
      if (d < bestD) { bestD = d; best = a; }
    }
    if (best) {
      const back = new THREE.Vector3(-Math.sin(best.yaw), 0, -Math.cos(best.yaw)).dot(dir) > 0.5;
      this.applyHit(attacker, best, w.damage * (back ? 2 : 1), { weapon: w, headshot: false, dir: dir.clone(), point: best.chest(), melee: true });
      best.vel.x += dir.x * 5; best.vel.z += dir.z * 5;
    } else {
      const wh = this.world.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, w.range);
      if (wh) this.effects.impact(_p.copy(origin).addScaledVector(dir, wh.t), _d.set(wh.nx, wh.ny, wh.nz), 0xcccccc, false);
    }
  }

  applyHit(attacker, victim, dmg, info) {
    if (!victim.alive) return;
    if (attacker && attacker !== victim && !this.canDamage(attacker, victim)) return;
    const dealt = victim.takeDamage(dmg, attacker, info);
    if (dealt <= 0 && victim.invuln > 0) return;
    const robotic = ['robot', 'android', 'dome'].includes(victim.character.look.head);
    this.effects.blood(info.point || victim.chest(), info.dir || _d.set(0, 0, 0), robotic);
    if (attacker && attacker !== victim) {
      attacker.stats.hits++;
      if (info.headshot) attacker.stats.headshots++;
      if (attacker.isPlayer) {
        const v = this.views[attacker.localIndex];
        v?.hitMarker(info.headshot, !victim.alive);
        audio.play(info.headshot ? 'headshot' : 'hit', null, 0.7);
      }
    }
  }

  explode(pos, radius, damage, owner, weapon, direct) {
    this.effects.explosion(pos, radius);
    audio.play('explosion', pos, 1);
    this.noise(pos, 60, owner);
    const origin = _o.copy(pos);
    // nudge origin off the surface so LOS checks aren't blocked by the wall we hit
    origin.y += 0.15;
    for (const a of this.actors) {
      if (!a.alive) continue;
      const c = a.chest(_c);
      const d = c.distanceTo(origin);
      if (d > radius) continue;
      const blocked = !this.world.lineOfSight(origin.x, origin.y, origin.z, c.x, c.y, c.z) &&
        !this.world.lineOfSight(origin.x, origin.y, origin.z, a.pos.x, a.pos.y + 0.3, a.pos.z);
      if (blocked) continue;
      const k = Math.pow(1 - d / radius, 0.75);
      let dmg = damage * k * (a === direct ? 0.5 : 1);
      if (a === owner) dmg *= 0.5;
      const push = _d.subVectors(c, origin).normalize();
      a.vel.x += push.x * 9 * k; a.vel.z += push.z * 9 * k; a.vel.y += 5 * k;
      this.applyHit(owner, a, dmg, { weapon, headshot: false, dir: push.clone(), point: c.clone(), splash: true });
    }
    for (const v of this.views) {
      const d = v.actor.pos.distanceTo(pos);
      if (d < radius * 4) v.shake = Math.max(v.shake, 0.6 * (1 - d / (radius * 4)));
    }
  }

  /** Nearest enemy (chest point or actor) within an angular cone of `dir` from `origin`. */
  findAimTarget(actor, origin, dir, maxAngle, range, returnActor = false) {
    let best = null, bestA = maxAngle;
    for (const a of this.actors) {
      if (!a.alive || a === actor || !this.areEnemies(actor, a)) continue;
      for (const pt of [a.chest(), a.headPos()]) {
        const to = _p.subVectors(pt, origin);
        const d = to.length();
        if (d > range || d < 0.5) continue;
        const ang = Math.acos(Math.max(-1, Math.min(1, to.dot(dir) / d)));
        if (ang >= bestA) continue;
        if (!this.world.lineOfSight(origin.x, origin.y, origin.z, pt.x, pt.y, pt.z)) continue;
        bestA = ang;
        best = returnActor ? a : a.chest();
        break;
      }
    }
    return best;
  }

  noise(pos, radius, source) {
    for (const a of this.actors) if (a.brain && a.alive) a.brain.hear({ pos, radius, source });
  }

  // ------------------------------------------------------------------ events
  onDamage(victim, attacker, dmg, info) {
    if (victim.isPlayer) this.views[victim.localIndex]?.hurt(attacker, dmg, info);
  }

  onKill(victim, killer, info = {}) {
    if (killer && killer !== victim) killer.stats.kills++;
    else victim.stats.suicides++;
    const wname = info.weapon ? info.weapon.name : info.fall ? 'gravity' : '';
    if (killer && killer !== victim) this.feed(`${killer.name} <i>[${wname}${info.headshot ? ' · HEADSHOT' : ''}]</i> ${victim.name}`, killer.team >= 0 ? TEAM_COLORS[killer.team] : '#fff');
    else this.feed(`${victim.name} ${info.fall ? 'fell to their doom' : 'blew themselves up'}`, '#aaa');
    if (!(victim.isEnemyNPC && this.mode.id === 'survival')) this.pickups.drop(victim);
    this.effects.blood(victim.chest(), _d.set(0, 1, 0), false);
    this.mode.onKill(victim, killer, info);
    if (this.mode.canRespawn(victim)) victim.respawnTimer = this.mode.respawnDelay;
    else victim.respawnTimer = Infinity;
    if (victim.isPlayer) this.views[victim.localIndex]?.died(killer);
    if (killer?.isPlayer && killer !== victim) this.app.progress.addKill(info.headshot);
    if (victim.carrying && this.mode._drop) this.mode._drop(victim.carrying);
  }

  onItemCollected(actor, p) { this.mode.onItemCollected?.(actor, p); }

  notify(actor, text) { if (actor.isPlayer) this.hud.notify(actor.localIndex, text); }
  feed(html, color) { this.hud.feed(html, color); }
  centerMessage(text, t = 2) {
    if (this.hud) this.hud.center(text, t);
    else (this._pendingCenter ||= []).push([text, t]);
  }

  // ------------------------------------------------------------------ main loop
  update(rawDt) {
    const dt = Math.min(rawDt, 1 / 20) * this.timeScale;
    // Local input
    for (const v of this.views) {
      const cmd = input.read(v.source, rawDt);
      if (cmd.pause && !this.paused && this.endT === null) { this.app.pause(); return; }
      v.cmd = cmd;
    }
    if (this.paused) return;
    this.time += dt;
    for (const v of this.views) {
      const a = v.actor;
      if (a.alive) a.applyCommand(v.cmd, dt);
      else if (this.mode.id !== 'story') {
        a.respawnTimer -= dt;
        if (a.respawnTimer <= 0 && (v.cmd.firePressed || v.cmd.jump || a.respawnTimer < -4)) this._respawn(a);
      }
    }
    // Bots
    for (const a of this.actors) {
      if (!a.brain) continue;
      if (a.alive) a.applyCommand(a.brain.update(dt), dt);
      else if (Number.isFinite(a.respawnTimer)) {
        a.respawnTimer -= dt;
        if (a.respawnTimer <= 0) this._respawn(a);
      }
    }
    this._separateActors();
    this.projectiles.update(dt);
    this.pickups.update(dt, this.time);
    this.mode.update(dt);
    this.effects.update(dt);
    for (const a of this.actors) a.updateModel(dt);
    for (const o of this.level.animated) o.update(dt, this.time, this);
    for (const l of this.level.lights) {
      if (!l.userData.flicker) continue;
      const k = 1 - l.userData.flicker * Math.random();
      l.intensity = l.userData.baseIntensity * k;
      if (l.userData.glow) l.userData.glow.material.opacity = 0.55 * k;
    }
    for (let i = this.pendingRemovals.length - 1; i >= 0; i--) {
      const r = this.pendingRemovals[i];
      r.t -= dt;
      if (r.t <= 0) {
        r.actor.dispose();
        this.actors.splice(this.actors.indexOf(r.actor), 1);
        this.pendingRemovals.splice(i, 1);
      }
    }
    for (const v of this.views) v.update(rawDt);
    audio.listeners = this.views.map((v) => ({ x: v.camera.position.x, y: v.camera.position.y, z: v.camera.position.z, yaw: v.actor.yaw }));
    this.hud.update(rawDt);

    // Story failure
    if (this.mode.id === 'story' && this.mode.failed && this.endT === null) {
      this.failT = (this.failT ?? 2.5) - rawDt;
      if (this.failT <= 0) { this.failT = null; this.app.missionFailed(this); }
    }
    // Match end
    if (this.mode.over && this.endT === null) {
      this.endT = 3.5;
      this.timeScale = 0.35;
      this.centerMessage(this.mode.winnerText(), 3.5);
      audio.play('objective', null, 0.9);
    }
    if (this.endT !== null) {
      this.endT -= rawDt;
      if (this.endT < 2) this.timeScale = 1;
      if (this.endT <= 0) { this.endT = Infinity; this.app.gameOver(this, this.results()); }
    }
  }

  /** Soft body-vs-body collision so actors can't walk through each other. */
  _separateActors() {
    const list = this.actors;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const min = 0.36 * (a.sizeScale + b.sizeScale);
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || Math.abs(b.pos.y - a.pos.y) > 1.5) continue;
        const d = Math.sqrt(d2) || 0.001;
        const nx = d2 > 1e-6 ? dx / d : Math.random() - 0.5, nz = d2 > 1e-6 ? dz / d : Math.random() - 0.5;
        const push = (min - d) / 2;
        for (const [act, sgn] of [[a, -1], [b, 1]]) {
          const g = act.body.onGround;
          this.world.moveBody(act.body, nx * push * sgn, 0, nz * push * sgn);
          act.body.onGround = g;
          act.pos.set(act.body.x, act.body.y, act.body.z);
        }
      }
    }
  }

  _respawn(a) {
    const loadout = a.loadout || this._spawnLoadout();
    a.spawn(this.pickSpawn(a), { weapons: loadout });
    if (a.isPlayer) this.views[a.localIndex]?.respawned();
    if (a.brain) { a.brain.target = null; a.brain.goal = null; a.brain.path = null; }
  }

  render() {
    const c = this.renderer.domElement;
    const W = c.clientWidth || 1, H = c.clientHeight || 1;
    for (const v of this.views) {
      const vp = v.viewportPx(W, H);
      v.camera.aspect = vp.w / vp.h;
      v.camera.updateProjectionMatrix();
      v.vmCamera.aspect = vp.w / vp.h;
      v.vmCamera.updateProjectionMatrix();
    }
    this.app.post.render(this.scene, this.views);
  }

  results() {
    const m = this.mode;
    return {
      type: this.config.type,
      mode: m.id, modeName: m.name, level: this.levelDef.name, levelId: this.levelDef.id,
      winnerText: m.winnerText(),
      success: m.success, medal: m.medal?.(), time: m.elapsed, difficulty: this.config.difficulty,
      ranking: m.ranking().map((a) => ({
        name: a.name, character: a.character.id, isPlayer: a.isPlayer, team: a.team,
        ...a.stats, lives: a.lives, accuracy: a.stats.shots ? a.stats.hits / a.stats.shots : 0,
      })),
      teamScores: m.teamScores, teams: m.teams,
      wave: m.wave,
      awards: this._awards(),
      localStats: this.localActors.map((a) => ({ ...a.stats })),
      challenge: this.config.challenge,
      winnerIsPlayer: m.winner && typeof m.winner === 'object' ? m.winner.isPlayer : (typeof m.winner === 'number' ? this.localActors.some((a) => a.team === m.winner) : false),
    };
  }

  _awards() {
    const list = this.actors.filter((a) => !a.isEnemyNPC);
    const pick = (fn, min = 1) => { let b = null, bv = -Infinity; for (const a of list) { const v = fn(a); if (v > bv) { bv = v; b = a; } } return bv >= min ? b : null; };
    const out = [];
    const sharp = pick((a) => (a.stats.shots > 10 ? a.stats.hits / a.stats.shots : 0), 0.3);
    if (sharp) out.push(['Sharpshooter', sharp.name, 'Best accuracy']);
    const head = pick((a) => a.stats.headshots, 3);
    if (head) out.push(['Head Hunter', head.name, 'Most headshots']);
    const suicide = pick((a) => a.stats.suicides, 2);
    if (suicide) out.push(['Self Destructive', suicide.name, 'Most suicides']);
    const tank = pick((a) => a.stats.damage, 200);
    if (tank) out.push(['Wrecking Ball', tank.name, 'Most damage dealt']);
    const coward = pick((a) => -a.stats.deaths - a.stats.kills, -3);
    if (coward && list.length > 2) out.push(['Pacifist', coward.name, 'Fewest kills and deaths']);
    return out;
  }

  dispose() {
    audio.stopMusic();
    this.hud.dispose();
    this.projectiles.clear();
    this.pickups.clear();
    this.mode.dispose?.();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    for (const v of this.views) v.dispose();
  }
}
