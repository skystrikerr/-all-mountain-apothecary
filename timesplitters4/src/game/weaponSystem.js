// Per-actor weapon inventory and firing logic (switching, reloading, dual-wield, zoom, spin-up, aim assist).
import * as THREE from 'three';
import { WEAPONS } from '../content/weapons.js';
import { audio } from '../engine/audio.js';
import { settings } from '../engine/input.js';

const SWITCH_TIME = 0.32;
const _dir = new THREE.Vector3(), _o = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3();
const _tmp = new THREE.Vector3();

export function spreadDir(dir, spread, out = new THREE.Vector3()) {
  if (spread <= 0) return out.copy(dir);
  // orthonormal basis around dir
  const up = Math.abs(dir.y) < 0.99 ? _up.set(0, 1, 0) : _up.set(1, 0, 0);
  const r = _right.crossVectors(dir, up).normalize();
  const u = _tmp.crossVectors(r, dir).normalize();
  const a = Math.random() * Math.PI * 2;
  const m = Math.sqrt(Math.random()) * spread;
  return out.copy(dir).addScaledVector(r, Math.cos(a) * m).addScaledVector(u, Math.sin(a) * m).normalize();
}

export class WeaponState {
  constructor(actor) {
    this.actor = actor;
    this.inv = new Map();
    this.order = [];
    this.currentId = 'fists';
    this.pendingId = null;
    this.cooldown = [0, 0];
    this.reloadT = 0;
    this.switchT = 0;
    this.zoomed = false;
    this.spin = 0;
    this.bloom = 0;
    this.flash = [0, 0];
    this.lastHand = 1;
    this.kick = 0; // camera kick for local players
    this.onChange = null;
  }

  get current() { return WEAPONS[this.currentId]; }
  get slot() { return this.inv.get(this.currentId); }
  get reloading() { return this.reloadT > 0; }
  get switching() { return this.switchT > 0; }

  reset(list) {
    this.inv.clear();
    this.order = [];
    for (const item of list) {
      const id = typeof item === 'string' ? item : item.id;
      this.give(id, { quiet: true, dual: typeof item === 'object' && item.dual, ammo: typeof item === 'object' ? item.ammo : undefined });
    }
    if (!this.inv.has('fists')) this.give('fists', { quiet: true });
    this.currentId = this.bestWeapon() || 'fists';
    this.reloadT = 0; this.switchT = 0; this.pendingId = null; this.zoomed = false; this.spin = 0; this.bloom = 0;
    this.cooldown[0] = this.cooldown[1] = 0;
    this._changed();
  }

  _changed() {
    const s = this.slot;
    this.actor.model.setWeapon(this.current, s?.dual);
    if (this.onChange) this.onChange();
  }

  /**
   * Give a weapon or ammo. Returns 'new' | 'dual' | 'ammo' | null (nothing taken).
   */
  give(id, { ammo, dual = false, quiet = false } = {}) {
    const w = WEAPONS[id];
    if (!w) return null;
    const infinite = w.clip === 0;
    const have = this.inv.get(id);
    if (!have) {
      const reserve = infinite ? 0 : Math.min(w.reserve, ammo ?? Math.ceil(w.reserve * 0.5));
      const slot = { id, clip: w.clip, clipL: dual && w.dual ? w.clip : 0, reserve, dual: dual && w.dual };
      this.inv.set(id, slot);
      this.order.push(id);
      this.order.sort((a, b) => WEAPON_ORDER(a) - WEAPON_ORDER(b));
      if (!quiet) this._maybeAutoSwitch(id);
      return 'new';
    }
    if (infinite) return null;
    if (w.dual && !have.dual) {
      have.dual = true;
      have.clipL = w.clip;
      have.reserve = Math.min(w.reserve, have.reserve + (ammo ?? w.ammoPickup) * 0.5);
      if (id === this.currentId) this._changed();
      else if (!quiet) this._maybeAutoSwitch(id);
      return 'dual';
    }
    if (have.reserve >= w.reserve) return null;
    have.reserve = Math.min(w.reserve, have.reserve + (ammo ?? w.ammoPickup));
    return 'ammo';
  }

  _maybeAutoSwitch(id) {
    const cur = this.current;
    const w = WEAPONS[id];
    if (!cur || cur.botRating < w.botRating || cur.id === 'fists') this.select(id);
  }

  has(id) { return this.inv.has(id); }

  select(id) {
    if (!this.inv.has(id) || (id === this.currentId && !this.pendingId)) return;
    if (id === this.currentId && this.pendingId) { this.pendingId = null; return; }
    this.pendingId = id;
    this.switchT = SWITCH_TIME;
    this.reloadT = 0;
    this.zoomed = false;
  }

  cycle(dirn) {
    const usable = this.order.filter((id) => this._hasAmmo(id));
    if (usable.length === 0) return;
    const curId = this.pendingId || this.currentId;
    let i = usable.indexOf(curId);
    i = (i + dirn + usable.length) % usable.length;
    this.select(usable[i]);
  }

  _hasAmmo(id) {
    const w = WEAPONS[id], s = this.inv.get(id);
    return w.clip === 0 || s.clip > 0 || s.clipL > 0 || s.reserve > 0;
  }

  totalAmmo(id = this.currentId) {
    const s = this.inv.get(id);
    return s ? s.clip + s.clipL + s.reserve : 0;
  }

  bestWeapon(range = null) {
    let best = null, bestScore = -Infinity;
    for (const id of this.order) {
      if (!this._hasAmmo(id)) continue;
      const w = WEAPONS[id];
      let score = w.botRating + (this.inv.get(id).dual ? 1.5 : 0);
      if (range != null) {
        if (range < w.botRange[0]) score -= 3 + (w.projectile?.splash ? 5 : 0);
        if (range > w.botRange[1]) score -= 4;
      }
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
  }

  startReload() {
    const w = this.current, s = this.slot;
    if (!s || w.clip === 0 || this.reloadT > 0 || this.switchT > 0) return;
    const need = (w.clip - s.clip) + (s.dual ? w.clip - s.clipL : 0);
    if (need <= 0 || s.reserve <= 0) return;
    this.reloadT = w.reload;
    this.zoomed = false;
    if (w.kind !== 'thrown') audio.play('reload', this.actor.pos, this.actor.isPlayer ? 0.7 : 0.5);
  }

  _finishReload() {
    const w = this.current, s = this.slot;
    const fill = (k) => {
      const take = Math.min(w.clip - s[k], s.reserve);
      s[k] += take; s.reserve -= take;
    };
    fill('clip');
    if (s.dual) fill('clipL');
  }

  update(cmd, dt) {
    const a = this.actor;
    this.cooldown[0] -= dt; this.cooldown[1] -= dt;
    this.flash[0] = Math.max(0, this.flash[0] - dt);
    this.flash[1] = Math.max(0, this.flash[1] - dt);
    this.bloom = Math.max(0, this.bloom - dt * 0.12);
    this.kick = Math.max(0, this.kick - dt * 0.35);
    // Switching
    if (cmd.slot >= 0 && cmd.slot < this.order.length) this.select(this.order[cmd.slot]);
    if (cmd.nextWeapon) this.cycle(1);
    if (cmd.prevWeapon) this.cycle(-1);
    if (this.switchT > 0) {
      this.switchT -= dt;
      if (this.pendingId && this.switchT <= SWITCH_TIME / 2) {
        this.currentId = this.pendingId;
        this.pendingId = null;
        this.cooldown[0] = this.cooldown[1] = 0;
        this.spin = 0;
        this._changed();
      }
      return;
    }
    const w = this.current, s = this.slot;
    if (!w || !s) return;
    // Reloading
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) { this.reloadT = 0; this._finishReload(); }
      return;
    }
    if (cmd.reload) { this.startReload(); if (this.reloadT > 0) return; }
    // Zoom (single-wield scoped weapons)
    this.zoomed = !!(w.zoom && !s.dual && cmd.fireAlt);
    // Spin-up weapons
    if (w.spinUp) {
      this.spin = cmd.fire ? Math.min(w.spinUp, this.spin + dt) : Math.max(0, this.spin - dt * 0.5);
    }
    const wantR = w.auto ? cmd.fire : cmd.firePressed;
    const wantL = s.dual && (w.auto ? cmd.fireAlt : cmd.fireAltPressed);
    const infinite = w.clip === 0;
    if (wantR && this.cooldown[0] <= 0 && (!w.spinUp || this.spin >= w.spinUp)) {
      if (infinite || s.clip > 0) {
        this._fire(0);
        if (!infinite) s.clip--;
      } else this._dry(0);
    }
    if (wantL && this.cooldown[1] <= 0) {
      if (s.clipL > 0) { this._fire(1); s.clipL--; } else this._dry(1);
    }
    // Auto reload / auto switch when empty
    if (!infinite && s.clip <= 0 && (!s.dual || s.clipL <= 0)) {
      if (s.reserve > 0) this.startReload();
      else {
        this.inv.delete(w.id);
        this.order = this.order.filter((id) => id !== w.id);
        this.select(this.bestWeapon() || 'fists');
        if (!this.inv.has(this.pendingId)) { this.currentId = 'fists'; this._changed(); }
      }
    }
  }

  _dry(hand) {
    this.cooldown[hand] = 0.25;
    if (this.actor.isPlayer) audio.play('empty', null, 0.6);
  }

  _fire(hand) {
    const a = this.actor, g = a.game, w = this.current, s = this.slot;
    this.cooldown[hand] = 60 / w.rpm;
    this.flash[hand] = 0.06;
    this.lastHand = hand;
    this.shotCount = (this.shotCount || 0) + 1;
    a.model.flash = 0.08;
    a.stats.shots += w.kind === 'melee' ? 0 : 1;
    const origin = a.eye(_o);
    const dir = a.forward(_dir);
    // Aim assist for gamepad users (classic console auto-aim): bend towards a target near the crosshair.
    if (a.isPlayer && a.cmd?.usingPad && settings.aimAssist && w.kind !== 'thrown') {
      const t = g.findAimTarget(a, origin, dir, 0.09, w.range);
      if (t) dir.copy(t).sub(origin).normalize();
    }
    const speed = a.speed;
    let spread = w.spread + w.moveSpread * Math.min(1, speed / 7) + this.bloom;
    if (a.crouching) spread *= 0.6;
    if (s.dual) spread *= 1.25;
    if (this.zoomed) spread *= 0.25;
    if (!a.body.onGround) spread += 0.02;
    if (a.brain) spread += (1 - a.brain.skill) * 0.045 + 0.008; // AI is never laser-accurate
    const side = hand === 0 ? 1 : -1;
    const muzzle = new THREE.Vector3(Math.cos(a.yaw) * 0.18 * side, -0.14, -Math.sin(a.yaw) * 0.18 * side).add(origin).addScaledVector(dir, 0.55);
    if (w.kind === 'melee') {
      g.melee(a, w, origin, dir);
    } else if (w.kind === 'hitscan') {
      for (let i = 0; i < w.pellets; i++) g.hitscan(a, w, origin, spreadDir(dir, spread), muzzle);
    } else {
      for (let i = 0; i < w.pellets; i++) {
        const d = spreadDir(dir, spread);
        const p = w.projectile;
        const start = w.kind === 'thrown' ? origin.clone().addScaledVector(d, 0.4) : muzzle.clone();
        const vel = d.clone().multiplyScalar(p.speed);
        if (w.kind === 'thrown') { vel.y += 3.2; vel.x += a.vel.x * 0.4; vel.z += a.vel.z * 0.4; }
        g.projectiles.spawn(a, w, start, vel, origin);
      }
    }
    if (w.recoil) { this.bloom = Math.min(0.08, this.bloom + w.recoil * 0.25); this.kick = Math.min(0.12, this.kick + w.recoil); }
    audio.play(w.sound, a.isPlayer ? null : a.pos, a.isPlayer ? 0.55 : 0.9);
    if (w.kind !== 'melee') g.noise(a.pos, w.kind === 'thrown' ? 8 : 40, a);
  }
}

const ORDER = ['fists', 'monoblade'];
function WEAPON_ORDER(id) {
  const i = ORDER.indexOf(id);
  if (i >= 0) return i - 10;
  const w = WEAPONS[id];
  return w.kind === 'thrown' ? 100 + w.era / 10000 : w.botRating + w.era / 10000;
}
