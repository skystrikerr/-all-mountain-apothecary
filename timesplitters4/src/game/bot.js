// Bot AI. Produces the same command structure as a human player, so bots obey identical movement and
// weapon rules. Behaviours: 'arcade' (deathmatch bot), 'guard' / 'patrol' (story enemies), 'hunter' (survival).
//
// Layers:  perception (sight cone + LOS, hearing via game.noise, damage)  ->  goal selection
//          (fight / search / pickup / mode objective / roam)  ->  navigation (A* grid path)  ->  motor
//          (strafe, jump when stuck, aim with skill-based error, trigger discipline).
import * as THREE from 'three';
import { emptyCommand } from '../engine/input.js';
import { WEAPONS } from '../content/weapons.js';

const _v = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3();

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class BotBrain {
  constructor(game, actor, opts = {}) {
    this.game = game;
    this.actor = actor;
    actor.brain = this;
    this.skill = Math.max(0, Math.min(1, opts.skill ?? 0.5));
    this.behaviour = opts.behaviour || 'arcade';
    this.post = opts.post || null;
    this.patrol = opts.patrol || null;
    this.patrolIdx = 0;
    this.group = opts.group || null;
    this.viewDist = opts.viewDist ?? (this.behaviour === 'arcade' ? 80 : 32);
    this.fov = Math.cos((opts.fovDeg ?? (this.behaviour === 'arcade' ? 75 : 60)) * Math.PI / 180);
    this.aggression = opts.aggression ?? (0.4 + Math.random() * 0.5);
    this.alerted = this.behaviour === 'arcade' || this.behaviour === 'hunter';
    this.state = 'idle';
    this.target = null;
    this.targetVisible = false;
    this.lastSeenPos = null;
    this.lastSeenTime = -100;
    this.reactionT = 0;
    this.path = null; this.pathIdx = 0; this.pathGoal = null; this.repathT = 0;
    this.goal = null; this.goalKind = null; this.goalT = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0;
    this.thinkT = Math.random() * 0.2;
    this.stuckT = 0; this.stuckCount = 0; this.lastCheckPos = new THREE.Vector3();
    this.aimErrX = 0; this.aimErrY = 0; this.errT = 0;
    this.weaponT = 0;
    this.triggerT = 0;
    this.lookYaw = null;
    this.scanT = 0;
    this.jumpCooldown = 0;
    this.crouchT = 0;
    this.unstickT = 0;
    this.unstickDir = null;
    this.burstT = 0;
    this.pauseLen = 0.5;
  }

  get turnRate() { return 3 + this.skill * 9; }
  get reactionTime() { return 0.75 - this.skill * 0.6; }

  isEnemy(other) { return this.game.areEnemies(this.actor, other); }

  onDamaged(attacker) {
    if (!attacker || attacker === this.actor || !this.isEnemy(attacker)) return;
    this.alert(attacker.pos, attacker);
    if (!this.targetVisible) { this.target = attacker; this.lastSeenPos = attacker.pos.clone(); this.lastSeenTime = this.game.time; }
  }

  /** Become alert and investigate a position (heard a shot, informed by a squad mate...). */
  alert(pos, source = null, spread = true) {
    const wasAlert = this.alerted;
    this.alerted = true;
    if (!this.targetVisible && pos) {
      this.lastSeenPos = pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z);
      this.lastSeenTime = this.game.time;
      if (source) this.target = source;
    }
    if (!wasAlert && spread && this.group) {
      for (const a of this.game.actors) {
        if (a.brain && a !== this.actor && a.alive && a.brain.group === this.group && a.pos.distanceTo(this.actor.pos) < 22) {
          a.brain.alert(pos, source, false);
        }
      }
    }
  }

  hear(noise) {
    if (noise.source === this.actor || !this.actor.alive) return;
    if (noise.source && !this.isEnemy(noise.source)) return;
    const d = noise.pos.distanceTo(this.actor.pos);
    if (d > noise.radius) return;
    if (this.targetVisible) return;
    if (this.behaviour !== 'arcade' || !this.target || this.game.time - this.lastSeenTime > 2) {
      this.alert(noise.pos, noise.source);
    }
  }

  // ------------------------------------------------------------------ perception
  _canSee(other) {
    const a = this.actor;
    const eye = a.eye(_e);
    const dx = other.pos.x - a.pos.x, dz = other.pos.z - a.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > this.viewDist) return false;
    if (dist > 3.5) {
      const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
      const dot = (dx * fx + dz * fz) / (dist || 1);
      const fov = this.alerted ? Math.min(this.fov, 0.1) : this.fov;
      if (dot < fov) return false;
    }
    const w = this.game.world;
    const c = other.chest(_t);
    if (w.lineOfSight(eye.x, eye.y, eye.z, c.x, c.y, c.z)) return true;
    const h = other.headPos(_t);
    return w.lineOfSight(eye.x, eye.y, eye.z, h.x, h.y, h.z);
  }

  _think() {
    const g = this.game, a = this.actor;
    // Target acquisition
    let best = null, bestScore = Infinity;
    for (const o of g.actors) {
      if (!o.alive || o === a || !this.isEnemy(o)) continue;
      if (o.invuln > 0 && !o.isPlayer && this.behaviour === 'arcade') continue;
      if (!this._canSee(o)) continue;
      let score = o.pos.distanceTo(a.pos);
      if (o === this.target) score *= 0.6; // stickiness
      if (o.carrying) score *= 0.5;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    if (best) {
      if (best !== this.target || !this.targetVisible) {
        this.reactionT = this.reactionTime * (0.7 + Math.random() * 0.6) * (this.alerted ? 1 : 1.6);
        if (!this.alerted) this.alert(best.pos, best);
      }
      this.target = best;
      this.targetVisible = true;
      this.lastSeenPos = best.pos.clone();
      this.lastSeenTime = g.time;
      this.alerted = true;
    } else {
      this.targetVisible = false;
      if (this.target && (!this.target.alive || g.time - this.lastSeenTime > 6)) this.target = null;
    }
    // Weapon choice
    this.weaponT -= 0.15;
    if (this.weaponT <= 0) {
      this.weaponT = 1.5 + Math.random();
      const range = this.target ? this.target.pos.distanceTo(a.pos) : 15;
      const best = a.weapons.bestWeapon(range);
      if (best && best !== a.weapons.currentId && best !== a.weapons.pendingId) a.weapons.select(best);
    }
    // Goal selection when not fighting
    if (!this.targetVisible) this._chooseGoal();
  }

  _chooseGoal() {
    const g = this.game, a = this.actor;
    this.goalT -= 0.15;
    const modeGoal = g.mode.botGoal ? g.mode.botGoal(this) : null;
    if (modeGoal) { this._setGoal(modeGoal.pos, modeGoal.kind || 'mode'); return; }
    // recently lost a target: search
    if (this.lastSeenPos && g.time - this.lastSeenTime < 8 && this.alerted) {
      this._setGoal(this.lastSeenPos, 'search');
      return;
    }
    if (this.behaviour === 'guard' || this.behaviour === 'patrol') {
      if (this.alerted && g.time - this.lastSeenTime < 30) {
        // keep hunting the nearest player
        const p = this._nearestEnemy();
        if (p) { this._setGoal(p.pos, 'hunt'); return; }
      }
      if (this.behaviour === 'patrol' && this.patrol?.length) {
        const pt = this.patrol[this.patrolIdx % this.patrol.length];
        if (Math.hypot(pt.x - a.pos.x, pt.z - a.pos.z) < 1.2) this.patrolIdx++;
        const nx = this.patrol[this.patrolIdx % this.patrol.length];
        this._setGoal(new THREE.Vector3(nx.x, 0, nx.z), 'patrol');
        return;
      }
      if (this.post && Math.hypot(this.post.x - a.pos.x, this.post.z - a.pos.z) > 1.5) {
        this._setGoal(new THREE.Vector3(this.post.x, 0, this.post.z), 'post');
        return;
      }
      this.goal = null; this.goalKind = 'idle';
      return;
    }
    if (this.goal && this.goalT > 0 && this.goalKind !== 'search') return;
    this.goalT = 3 + Math.random() * 3;
    // Pickup desire
    const want = this._pickupGoal();
    if (want) { this._setGoal(want.pos, 'pickup'); return; }
    // Hunt or roam
    const enemy = this._nearestEnemy(true);
    if (enemy && (Math.random() < this.aggression || this.behaviour === 'hunter')) {
      this._setGoal(enemy.pos, 'hunt');
      return;
    }
    const p = g.nav.randomWalkable();
    if (p) this._setGoal(new THREE.Vector3(p.x, p.y, p.z), 'roam');
  }

  _nearestEnemy(randomize = false) {
    const g = this.game, a = this.actor;
    let best = null, bd = Infinity;
    for (const o of g.actors) {
      if (!o.alive || o === a || !this.isEnemy(o)) continue;
      const d = o.pos.distanceTo(a.pos) * (randomize ? 0.5 + Math.random() : 1);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  _pickupGoal() {
    const g = this.game, a = this.actor;
    const ws = a.weapons;
    const cur = WEAPONS[ws.bestWeapon() || 'fists'];
    const needHealth = a.health < 60;
    const needWeapon = cur.botRating < 6 || ws.totalAmmo(cur.id) < WEAPONS[cur.id].clip;
    const needArmor = a.armor < 40;
    let best = null, bestScore = Infinity;
    for (const p of g.pickups.list) {
      if (!p.active) continue;
      let value = 0;
      if (p.type === 'health' && needHealth) value = 3 + (100 - a.health) / 20;
      else if (p.type === 'armor' && needArmor) value = 2;
      else if (p.type === 'weapon') {
        const w = WEAPONS[p.id];
        const have = ws.inv.get(p.id);
        if (!have) value = needWeapon ? 2 + w.botRating / 3 : w.botRating / 5;
        else if (w.dual && !have.dual) value = 2.5;
        else if (have.reserve < w.reserve * 0.3) value = 1;
      }
      if (value <= 0) continue;
      const d = p.pos.distanceTo(a.pos);
      if (d > 45) continue;
      const score = d / value;
      if (score < bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  _setGoal(pos, kind) {
    const changed = !this.goal || this.goal.distanceToSquared(pos) > 4 || this.goalKind !== kind;
    this.goal = pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z);
    this.goalKind = kind;
    if (changed) this.repathT = 0;
  }

  _repath(target) {
    const a = this.actor;
    this.path = this.game.nav.findPath(a.pos.x, a.pos.z, target.x, target.z);
    this.pathIdx = 0;
    this.pathGoal = target.clone();
    this.repathT = this.goalKind === 'hunt' || this.goalKind === 'mode' ? 1.2 : 3;
  }

  /** Returns a world-space XZ direction to follow the path to the current goal, or null if arrived. */
  _followPath(dt) {
    const a = this.actor;
    if (!this.goal) return null;
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) this._repath(this.goal);
    if (!this.path || this.path.length === 0) return null;
    while (this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      const d = Math.hypot(wp.x - a.pos.x, wp.z - a.pos.z);
      if (d < (this.pathIdx === this.path.length - 1 ? 0.8 : 0.6)) this.pathIdx++;
      else break;
    }
    if (this.pathIdx >= this.path.length) {
      if (this.goalKind === 'search') { this.lastSeenPos = null; this.goal = null; }
      if (this.goalKind === 'roam' || this.goalKind === 'pickup') { this.goal = null; this.goalT = 0; }
      return null;
    }
    const wp = this.path[this.pathIdx];
    return _v.set(wp.x - a.pos.x, 0, wp.z - a.pos.z).normalize();
  }

  // ------------------------------------------------------------------ main update
  update(dt) {
    const g = this.game, a = this.actor;
    const cmd = emptyCommand();
    if (!a.alive) return cmd;
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 0.15; this._think(); }
    this.reactionT -= dt;
    this.jumpCooldown -= dt;

    let moveDir = null;       // world XZ direction
    let moveMag = 1;
    let desiredYaw = null, desiredPitch = 0;
    const t = this.target;

    if (t && this.targetVisible && t.alive) {
      // ---------------- combat
      const w = a.weapons.current;
      const toT = _t.subVectors(t.pos, a.pos);
      const dist = Math.hypot(toT.x, toT.z);
      const [minR, maxR] = w.botRange;
      const pref = Math.min(maxR * 0.6, Math.max(minR + 2, 8));
      const fwd = _e.set(toT.x, 0, toT.z).normalize();
      // strafe
      this.strafeT -= dt;
      if (this.strafeT <= 0) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeT = 0.5 + Math.random() * 1.3; }
      let mx = -fwd.z * this.strafeDir * (0.5 + this.skill * 0.5), mz = fwd.x * this.strafeDir * (0.5 + this.skill * 0.5);
      if (dist > pref + 3) { mx += fwd.x; mz += fwd.z; } else if (dist < pref - 3 || dist < minR) { mx -= fwd.x; mz -= fwd.z; }
      if (w.kind === 'melee') { mx = fwd.x; mz = fwd.z; }
      if (this.behaviour !== 'arcade' && dist < pref && Math.random() < 0.3 * dt) this.crouchT = 1.2;
      moveDir = new THREE.Vector3(mx, 0, mz);
      if (moveDir.lengthSq() > 1) moveDir.normalize();
      moveMag = moveDir.length();
      moveDir.normalize();
      // Leave the fight to grab health when very weak (arcade)
      if (this.behaviour === 'arcade' && a.health < 30 && this.aggression < 0.7) {
        const hp = this._pickupGoal();
        if (hp && hp.type === 'health') { this._setGoal(hp.pos, 'pickup'); const d = this._followPath(dt); if (d) { moveDir = d.clone(); moveMag = 1; } }
      }
      // Aim
      const aim = this._aimPoint(t, w, dist);
      const eye = a.eye();
      const dx = aim.x - eye.x, dy = aim.y - eye.y, dz = aim.z - eye.z;
      const hd = Math.hypot(dx, dz);
      desiredYaw = Math.atan2(-dx, -dz);
      desiredPitch = Math.atan2(dy, hd);
      if (w.projectile && w.projectile.gravity > 0) desiredPitch = this._ballistic(w, hd, dy) ?? desiredPitch;
      // error that shrinks while tracking
      this.errT -= dt;
      if (this.errT <= 0) {
        this.errT = 0.3 + Math.random() * 0.4;
        const e = (1 - this.skill) * 0.16 + 0.01;
        this.aimErrX = (Math.random() - 0.5) * e * 2;
        this.aimErrY = (Math.random() - 0.5) * e;
      }
      desiredYaw += this.aimErrX * Math.min(1, 6 / Math.max(dist, 1));
      desiredPitch += this.aimErrY * Math.min(1, 6 / Math.max(dist, 1));
      // Fire?
      const yawErr = Math.abs(angleDiff(desiredYaw, a.yaw)), pitchErr = Math.abs(desiredPitch - a.pitch);
      const tol = 0.06 + w.spread + Math.atan2(0.5, dist);
      const inRange = dist <= (w.kind === 'melee' ? w.range + 0.6 : Math.min(w.range, maxR * 1.6 + 5));
      const splashSafe = !w.projectile?.splash || dist > w.projectile.splash * 0.8;
      if (this.reactionT <= 0 && yawErr < tol && pitchErr < tol + 0.05 && inRange && splashSafe) {
        this.triggerT -= dt;
        if (w.auto) {
          // Burst discipline: skilled bots hold the trigger longer and pause less.
          this.burstT -= dt;
          if (this.burstT <= -this.pauseLen) { this.burstT = 0.2 + this.skill * 0.4 + Math.random() * 0.2; this.pauseLen = 1.0 - this.skill * 0.5 + Math.random() * 0.4; }
          if (this.burstT > 0 || w.spinUp) { cmd.fire = true; cmd.fireAlt = true; }
        }
        else if (this.triggerT <= 0) {
          cmd.fire = cmd.firePressed = true;
          const slot = a.weapons.slot;
          if (slot?.dual) { cmd.fireAlt = cmd.fireAltPressed = true; }
          this.triggerT = 60 / w.rpm + (1 - this.skill) * 0.45 + 0.1 + Math.random() * 0.15;
        }
        // zoom with scoped weapons at range
        if (w.zoom && dist > 15 && !a.weapons.slot?.dual) cmd.fireAlt = true;
      }
      if (w.clip > 0 && a.weapons.slot && a.weapons.slot.clip === 0 && !a.weapons.reloading) cmd.reload = true;
      // Occasional combat jumps from skilled bots
      if (this.behaviour === 'arcade' && this.skill > 0.5 && Math.random() < dt * 0.4 * this.skill && this.jumpCooldown <= 0) { cmd.jump = true; this.jumpCooldown = 1.5; }
    } else {
      // ---------------- navigation / idle
      const dir = this._followPath(dt);
      if (dir) {
        moveDir = dir.clone();
        moveMag = (this.goalKind === 'patrol' || this.goalKind === 'post' || (!this.alerted && this.behaviour !== 'arcade')) ? 0.45 : 1;
        desiredYaw = Math.atan2(-moveDir.x, -moveDir.z);
        if (this.goalKind === 'search' && this.lastSeenPos) {
          const d = this.lastSeenPos.distanceTo(a.pos);
          if (d < 12) desiredYaw = Math.atan2(-(this.lastSeenPos.x - a.pos.x), -(this.lastSeenPos.z - a.pos.z));
        }
      } else if (this.goalKind === 'idle' || !this.goal) {
        // Idle scan
        this.scanT += dt;
        const baseYaw = this.post?.yaw ?? a.yaw;
        desiredYaw = baseYaw + Math.sin(this.scanT * 0.5) * (this.alerted ? 1.4 : 0.6);
      }
      desiredPitch = 0;
      // Reload while not fighting
      const s = a.weapons.slot, w = a.weapons.current;
      if (s && w.clip > 0 && s.clip < w.clip * 0.5 && s.reserve > 0) cmd.reload = true;
    }

    // Stuck detection
    this.stuckT += dt;
    if (this.stuckT > 0.7) {
      const moved = Math.hypot(a.pos.x - this.lastCheckPos.x, a.pos.z - this.lastCheckPos.z);
      if (moveDir && moveMag > 0.3 && moved < 0.35 * moveMag) {
        this.stuckCount++;
        if (this.jumpCooldown <= 0) { cmd.jump = true; this.jumpCooldown = 0.8; }
        this.strafeDir *= -1;
        if (this.stuckCount >= 2) {
          // Unstick: step back towards the centre of our nav cell (away from the corner we're wedged on), then repath.
          const nav = g.nav, c = nav.nearest(a.pos.x, a.pos.z, 3);
          const ctr = c ? nav.center(c[0], c[1]) : null;
          this.unstickDir = ctr && Math.hypot(ctr.x - a.pos.x, ctr.z - a.pos.z) > 0.15
            ? new THREE.Vector3(ctr.x - a.pos.x, 0, ctr.z - a.pos.z).normalize()
            : new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          this.unstickT = 0.45;
          this.path = null; this.repathT = 0.5; this.stuckCount = 0;
          if (this.goalKind === 'roam') this.goal = null;
        }
      } else this.stuckCount = 0;
      this.lastCheckPos.copy(a.pos);
      this.stuckT = 0;
    }

    if (this.unstickT > 0) { this.unstickT -= dt; moveDir = this.unstickDir; moveMag = 1; }
    if (this.crouchT > 0) { this.crouchT -= dt; cmd.crouch = true; }

    // Motor: convert world move direction into local stick input.
    if (moveDir) {
      const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
      const rx = Math.cos(a.yaw), rz = -Math.sin(a.yaw);
      cmd.moveY = (moveDir.x * fx + moveDir.z * fz) * moveMag;
      cmd.moveX = (moveDir.x * rx + moveDir.z * rz) * moveMag;
    }
    if (desiredYaw != null) {
      const maxTurn = this.turnRate * dt;
      const dy = angleDiff(desiredYaw, a.yaw);
      cmd.lookX = Math.max(-maxTurn, Math.min(maxTurn, dy));
    }
    const dp = desiredPitch - a.pitch;
    cmd.lookY = Math.max(-this.turnRate * dt, Math.min(this.turnRate * dt, dp));
    return cmd;
  }

  _aimPoint(t, w, dist) {
    const p = (this.skill > 0.7 && w.headMult >= 2 && Math.random() < 0.5 ? t.headPos() : t.chest()).clone();
    if (w.projectile && w.projectile.speed) {
      const lead = dist / w.projectile.speed * (0.4 + this.skill * 0.6);
      p.x += t.vel.x * lead; p.z += t.vel.z * lead;
      if (w.projectile.splash) p.y = t.pos.y + 0.3; // aim at feet with explosives
    }
    return p;
  }

  /** Launch pitch for a projectile with gravity to hit (horizontal dist, height diff). */
  _ballistic(w, x, y) {
    const v = w.projectile.speed, gr = w.projectile.gravity;
    const vy0 = w.kind === 'thrown' ? 3.2 : 0;
    // approximate the thrown upward boost as extra lift
    const v2 = v * v, disc = v2 * v2 - gr * (gr * x * x + 2 * (y - vy0 * x / v) * v2);
    if (disc < 0) return Math.PI / 4;
    return Math.atan2(v2 - Math.sqrt(disc), gr * x);
  }
}
