// Game modes. A mode decides teams, scoring, respawning, win conditions and optional bot objectives.
import * as THREE from 'three';
import { TEAM_COLORS, TEAM_NAMES } from './actor.js';
import { audio } from '../engine/audio.js';

export const MODE_INFO = {
  deathmatch: { name: 'Deathmatch', desc: 'Every splitter for themselves. Most kills wins.', teams: false },
  teamdeathmatch: { name: 'Team Deathmatch', desc: 'Red vs Blue. Pool your kills.', teams: true },
  capturebag: { name: 'Capture the Bag', desc: 'Steal the enemy bag and bring it home while yours is safe.', teams: true, needsBases: true },
  elimination: { name: 'Elimination', desc: 'Limited lives. Last one standing wins.', teams: false },
  infection: { name: 'Infection', desc: 'One player starts infected. Every infected kill spreads it. Survive!', teams: false },
  survival: { name: 'Survival', desc: 'Co-op against endless waves of time-mutants.', teams: false, coop: true },
};

class Mode {
  constructor(game, cfg) {
    this.game = game;
    this.cfg = cfg;
    this.over = false;
    this.winner = null;
    this.timeLimit = (cfg.timeLimit ?? 5) * 60;
    this.scoreLimit = cfg.scoreLimit ?? 15;
    this.elapsed = 0;
    this.teamScores = [0, 0];
    this.respawnDelay = 2.5;
  }
  get teams() { return false; }
  get name() { return MODE_INFO[this.id]?.name ?? this.id; }
  setup() {}
  canPickup() { return true; }
  canRespawn() { return true; }
  onKill(victim, killer) {
    if (killer && killer !== victim) killer.stats.score++;
    else victim.stats.score--;
  }
  update(dt) {
    this.elapsed += dt;
    if (this.timeLimit > 0 && this.elapsed >= this.timeLimit) this.end();
  }
  timeLeft() { return this.timeLimit > 0 ? Math.max(0, this.timeLimit - this.elapsed) : null; }
  end(winner) {
    if (this.over) return;
    this.over = true;
    this.winner = winner ?? this.leader();
  }
  leader() {
    const list = this.ranking();
    return list[0] ?? null;
  }
  ranking() {
    return [...this.game.actors].filter((a) => !a.isEnemyNPC).sort((a, b) => b.stats.score - a.stats.score || b.stats.kills - a.stats.kills || a.stats.deaths - b.stats.deaths);
  }
  winnerText() {
    const w = this.winner;
    if (w == null) return 'DRAW';
    if (typeof w === 'number') return `${TEAM_NAMES[w].toUpperCase()} TEAM WINS`;
    return w.isPlayer && w.name === 'You' ? 'YOU WIN!' : `${w.name.toUpperCase()} WINS`;
  }
  hudLine(player) { return `${player.stats.score} pts`; }
  botGoal() { return null; }
}

export class Deathmatch extends Mode {
  get id() { return 'deathmatch'; }
  onKill(victim, killer) {
    super.onKill(victim, killer);
    if (killer && killer.stats.score >= this.scoreLimit) this.end(killer);
  }
  hudLine(p) {
    const r = this.ranking();
    const pos = r.indexOf(p) + 1;
    return `${ordinal(pos)} · ${p.stats.score}/${this.scoreLimit}`;
  }
}

export class TeamDeathmatch extends Mode {
  get id() { return 'teamdeathmatch'; }
  get teams() { return true; }
  onKill(victim, killer) {
    super.onKill(victim, killer);
    if (killer && killer !== victim && killer.team >= 0) this.teamScores[killer.team]++;
    else if (victim.team >= 0) this.teamScores[victim.team] = Math.max(0, this.teamScores[victim.team] - 1);
    for (const t of [0, 1]) if (this.teamScores[t] >= this.scoreLimit) this.end(t);
  }
  leader() { return this.teamScores[0] === this.teamScores[1] ? null : this.teamScores[0] > this.teamScores[1] ? 0 : 1; }
  hudLine(p) { return `<span style="color:${TEAM_COLORS[0]}">${this.teamScores[0]}</span> : <span style="color:${TEAM_COLORS[1]}">${this.teamScores[1]}</span>`; }
}

export class Elimination extends Mode {
  get id() { return 'elimination'; }
  setup() {
    this.lives = this.cfg.lives ?? 5;
    for (const a of this.game.actors) a.lives = this.lives;
    this.timeLimit = 0;
  }
  onKill(victim, killer) {
    super.onKill(victim, killer);
    victim.lives--;
    const alive = this.game.actors.filter((a) => a.lives > 0);
    if (alive.length <= 1) this.end(alive[0] ?? killer);
    else if (victim.lives <= 0) this.game.feed(`${victim.name} has been eliminated!`, '#f84');
  }
  canRespawn(a) { return a.lives > 0; }
  ranking() {
    return [...this.game.actors].sort((a, b) => b.lives - a.lives || b.stats.kills - a.stats.kills);
  }
  hudLine(p) {
    const left = this.game.actors.filter((a) => a.lives > 0).length;
    return `Lives ${Math.max(0, p.lives)} · ${left} left`;
  }
}

export class Infection extends Mode {
  get id() { return 'infection'; }
  setup() {
    this.startT = 6;
    this.survivalTick = 0;
    this.started = false;
  }
  _infect(a, announce = true) {
    a.infected = true;
    a.model.setInfected(true);
    if (announce) {
      this.game.feed(`${a.name} is INFECTED!`, '#7f4');
      audio.play('infect', a.isPlayer ? null : a.pos, 0.9);
    }
  }
  update(dt) {
    super.update(dt);
    const actors = this.game.actors;
    if (!this.started) {
      this.startT -= dt;
      if (this.startT <= 0) {
        this.started = true;
        const alive = actors.filter((a) => a.alive);
        const first = alive[Math.floor(Math.random() * alive.length)];
        if (first) { this._infect(first); first.health = first.maxHealth; }
        this.game.centerMessage('THE INFECTION HAS BEGUN', 2);
      }
      return;
    }
    this.survivalTick += dt;
    if (this.survivalTick >= 10) {
      this.survivalTick = 0;
      for (const a of actors) if (!a.infected) a.stats.score++;
    }
    const clean = actors.filter((a) => !a.infected);
    if (clean.length === 1 && !this.lastOne) {
      this.lastOne = clean[0];
      this.game.feed(`${clean[0].name} is the LAST SURVIVOR!`, '#ff4');
    }
    if (clean.length === 0) this.end(this.lastOne || null);
  }
  onKill(victim, killer) {
    if (killer && killer !== victim) {
      killer.stats.score += killer.infected ? 2 : 1;
      if (killer.infected && !victim.infected) this._infect(victim);
    }
    if (!killer || killer === victim) { if (this.started && !victim.infected) this._infect(victim); }
  }
  timeLeft() { return this.started ? super.timeLeft() : this.startT; }
  end(winner) {
    if (!winner) {
      const clean = this.game.actors.filter((a) => !a.infected);
      winner = clean.sort((a, b) => b.stats.score - a.stats.score)[0] ?? this.leader();
    }
    super.end(winner);
  }
  hudLine(p) {
    const clean = this.game.actors.filter((a) => !a.infected).length;
    if (!this.started) return 'Infection begins…';
    return `${p.infected ? '<span style="color:#7f4">INFECTED</span>' : 'CLEAN'} · ${clean} clean`;
  }
}

// ------------------------------------------------------------------ Capture the Bag
export class CaptureTheBag extends Mode {
  get id() { return 'capturebag'; }
  get teams() { return true; }
  setup() {
    const g = this.game;
    this.scoreLimit = this.cfg.scoreLimit ?? 3;
    const bases = g.level.bases.length >= 2 ? g.level.bases : [
      { team: 0, ...g.level.spawns[0] }, { team: 1, ...g.level.spawns[g.level.spawns.length - 1] },
    ];
    this.bags = [0, 1].map((team) => {
      const b = bases.find((x) => x.team === team) || bases[team];
      const home = new THREE.Vector3(b.x, b.y, b.z);
      // base platform
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.1, 16), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[team], transparent: true, opacity: 0.55 }));
      pad.position.copy(home).setY(home.y + 0.05);
      g.scene.add(pad);
      const mesh = new THREE.Group();
      const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), new THREE.MeshLambertMaterial({ color: TEAM_COLORS[team], flatShading: true }));
      sack.scale.set(1, 1.2, 1);
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), new THREE.MeshLambertMaterial({ color: '#d8c080' }));
      knot.position.y = 0.4;
      mesh.add(sack, knot);
      g.scene.add(mesh);
      return { team, home, pos: home.clone(), carrier: null, atHome: true, dropT: 0, mesh, pad };
    });
  }
  canPickup() { return true; }
  update(dt) {
    super.update(dt);
    const g = this.game;
    for (const bag of this.bags) {
      if (bag.carrier) {
        if (!bag.carrier.alive) { this._drop(bag); continue; }
        bag.pos.copy(bag.carrier.pos).add(new THREE.Vector3(Math.sin(bag.carrier.yaw) * 0.35, 1.2, Math.cos(bag.carrier.yaw) * 0.35));
        // Capture: carrier reaches own base while own bag is home
        const own = this.bags[bag.carrier.team];
        if (own.atHome && bag.carrier.pos.distanceTo(own.home) < 1.8) {
          const scorer = bag.carrier;
          scorer.stats.score += 3;
          this.teamScores[scorer.team]++;
          scorer.carrying = null;
          this._return(bag, false);
          g.feed(`${scorer.name} captured the ${TEAM_NAMES[bag.team]} bag!`, TEAM_COLORS[scorer.team]);
          g.centerMessage(`${TEAM_NAMES[scorer.team].toUpperCase()} SCORES!`, 2);
          audio.play('objective', null, 0.7);
          if (this.teamScores[scorer.team] >= this.scoreLimit) this.end(scorer.team);
        }
      } else {
        if (!bag.atHome) {
          bag.dropT -= dt;
          if (bag.dropT <= 0) this._return(bag, true);
        }
        for (const a of g.actors) {
          if (!a.alive || a.pos.distanceTo(bag.pos) > 1.3) continue;
          if (a.team === bag.team) {
            if (!bag.atHome) { this._return(bag, true); a.stats.score++; g.feed(`${a.name} returned the ${TEAM_NAMES[bag.team]} bag`, TEAM_COLORS[a.team]); }
          } else if (!a.carrying) {
            bag.carrier = a; bag.atHome = false; a.carrying = bag;
            g.feed(`${a.name} grabbed the ${TEAM_NAMES[bag.team]} bag!`, TEAM_COLORS[a.team]);
            audio.play('bag', null, 0.7);
            break;
          }
        }
        bag.mesh.rotation.y += dt * 1.5;
      }
      bag.mesh.position.copy(bag.pos);
      if (!bag.carrier) bag.mesh.position.y += 0.45 + Math.sin(g.time * 3) * 0.08;
    }
  }
  _drop(bag) {
    const c = bag.carrier;
    if (c) c.carrying = null;
    bag.carrier = null;
    bag.dropT = 20;
    const gy = this.game.world.groundHeight(bag.pos.x, bag.pos.z, bag.pos.y + 0.5);
    if (Number.isFinite(gy)) bag.pos.y = gy;
    this.game.feed(`The ${TEAM_NAMES[bag.team]} bag was dropped`, '#ccc');
  }
  _return(bag, announce) {
    if (bag.carrier) bag.carrier.carrying = null;
    bag.carrier = null; bag.atHome = true; bag.pos.copy(bag.home);
    if (announce) this.game.feed(`The ${TEAM_NAMES[bag.team]} bag returned home`, TEAM_COLORS[bag.team]);
  }
  onKill(victim, killer) {
    if (killer && killer !== victim) killer.stats.score++;
  }
  leader() { return this.teamScores[0] === this.teamScores[1] ? null : this.teamScores[0] > this.teamScores[1] ? 0 : 1; }
  hudLine(p) {
    const s = (t) => `<span style="color:${TEAM_COLORS[t]}">${this.teamScores[t]}${this.bags[t].atHome ? '' : '!'}</span>`;
    return `${s(0)} : ${s(1)}${p.carrying ? ' · <b>BAG!</b>' : ''}`;
  }
  botGoal(bot) {
    const a = bot.actor;
    if (a.team < 0) return null;
    const own = this.bags[a.team], enemy = this.bags[1 - a.team];
    if (a.carrying) return { pos: own.atHome ? own.home : (own.carrier ? own.carrier.pos : own.pos), kind: 'mode' };
    if (!own.atHome) return { pos: own.carrier ? own.carrier.pos : own.pos, kind: 'mode' };
    if (enemy.carrier && enemy.carrier.team === a.team) return { pos: enemy.carrier.pos, kind: 'mode' }; // escort
    if (!bot._role) bot._role = Math.random() < 0.6 ? 'attack' : 'defend';
    if (bot._role === 'attack') return { pos: enemy.pos, kind: 'mode' };
    if (a.pos.distanceTo(own.home) > 10) return { pos: own.home, kind: 'mode' };
    return null;
  }
  dispose() {
    for (const b of this.bags || []) { this.game.scene.remove(b.mesh); this.game.scene.remove(b.pad); }
  }
}

// ------------------------------------------------------------------ Survival (co-op waves)
export class Survival extends Mode {
  get id() { return 'survival'; }
  setup() {
    this.wave = 0;
    this.breakT = 4;
    this.timeLimit = 0;
    this.enemies = [];
    for (const a of this.game.actors) { a.team = 0; a.lives = 3; a.model.setTeamColor(null); }
  }
  get coop() { return true; }
  canRespawn(a) { return a.isEnemyNPC ? false : a.lives > 0; }
  onKill(victim, killer) {
    if (victim.isEnemyNPC) {
      if (killer && !killer.isEnemyNPC) killer.stats.score++;
      this.game.removeActorLater(victim, 3);
    } else {
      victim.lives--;
      if (this.game.actors.filter((a) => !a.isEnemyNPC && a.lives > 0).length === 0) this.end(null);
    }
  }
  update(dt) {
    super.update(dt);
    const g = this.game;
    const living = g.actors.filter((a) => a.isEnemyNPC && a.alive).length;
    if (living === 0) {
      if (this.breakT === null) {
        this.breakT = 5;
        if (this.wave > 0) {
          g.centerMessage(`WAVE ${this.wave} CLEARED`, 2.5);
          for (const a of g.actors) if (!a.isEnemyNPC && a.lives > 0 && !a.alive) a.respawnTimer = 0.1;
        }
      }
      this.breakT -= dt;
      if (this.breakT <= 0) { this.breakT = null; this._spawnWave(); }
    }
  }
  _spawnWave() {
    const g = this.game;
    this.wave++;
    g.centerMessage(`WAVE ${this.wave}`, 2);
    audio.play('alarm', null, 0.5);
    const count = 3 + this.wave * 2;
    const skill = Math.min(0.9, 0.2 + this.wave * 0.06);
    const pool = ['mobzombie', 'skeleton', 'xeno', 'greys', 'enforcer', 'robot67'];
    const weaponPools = [['fists'], ['mobpistol'], ['tommy'], ['pumpgun'], ['volk67'], ['photon'], ['spikerifle']];
    const players = g.actors.filter((a) => !a.isEnemyNPC);
    for (let i = 0; i < count; i++) {
      const charId = pool[(i + this.wave) % pool.length];
      const wlist = weaponPools[Math.min(weaponPools.length - 1, Math.floor(Math.random() * (1 + this.wave * 0.7)))];
      const sp = g.pickSpawn(null, players);
      g.addBot({ character: charId, skill, team: 1, behaviour: 'hunter', weapons: ['fists', ...wlist], enemyNPC: true,
        maxHealth: 60 + this.wave * 8, spawn: sp, name: `${g.charName(charId)} #${i + 1}` });
    }
  }
  ranking() { return [...this.game.actors].filter((a) => !a.isEnemyNPC).sort((a, b) => b.stats.score - a.stats.score); }
  winnerText() { return `SURVIVED ${Math.max(0, this.wave - 1)} WAVES`; }
  hudLine(p) {
    const left = this.game.actors.filter((a) => a.isEnemyNPC && a.alive).length;
    return `Wave ${this.wave} · ${left} left · Lives ${Math.max(0, p.lives)}`;
  }
}

export function createMode(id, game, cfg) {
  switch (id) {
    case 'teamdeathmatch': return new TeamDeathmatch(game, cfg);
    case 'capturebag': return new CaptureTheBag(game, cfg);
    case 'elimination': return new Elimination(game, cfg);
    case 'infection': return new Infection(game, cfg);
    case 'survival': return new Survival(game, cfg);
    default: return new Deathmatch(game, cfg);
  }
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
