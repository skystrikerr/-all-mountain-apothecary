// Actor: anything that runs, jumps, shoots and dies — local players, arcade bots and story enemies.
// Driven exclusively by per-frame "commands" (see engine/input.js), so humans and AI share one code path.
import * as THREE from 'three';
import { CharacterModel } from './characterModel.js';
import { WEAPONS } from '../content/weapons.js';
import { WeaponState } from './weaponSystem.js';
import { audio } from '../engine/audio.js';
import { radialTexture } from '../engine/textures.js';

let blobGeo = null, blobMat = null;
function blobShadow() {
  if (!blobGeo) {
    blobGeo = new THREE.PlaneGeometry(1, 1);
    blobGeo.rotateX(-Math.PI / 2);
    blobMat = new THREE.MeshBasicMaterial({
      map: radialTexture('rgba(0,0,0,0.62)', 'rgba(0,0,0,0)', 64, 'rgba(0,0,0,0.45)'), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
  }
  const m = new THREE.Mesh(blobGeo, blobMat);
  m.renderOrder = 1;
  return m;
}

export const TEAM_COLORS = ['#ff3b3b', '#3b8bff', '#3bff6b', '#ffd23b'];
export const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Gold'];

const RUN_SPEED = 7.2;
const GRAVITY = 22;
const JUMP_V = 7.4;
const STAND_H = 1.8, CROUCH_H = 1.15;

let nextId = 1;

export class Actor {
  constructor(game, opts) {
    this.game = game;
    this.id = nextId++;
    this.name = opts.name || opts.character.name;
    this.character = opts.character;
    this.team = opts.team ?? -1;
    this.isPlayer = !!opts.isPlayer;
    this.localIndex = opts.localIndex ?? -1;
    this.tag = opts.tag || null;          // mission tag, e.g. 'boss'
    this.maxHealth = opts.maxHealth ?? 100;
    this.damageScale = opts.damageScale ?? 1; // outgoing damage multiplier (difficulty)
    this.speedScale = (opts.character.stats?.speed ?? 1) * (opts.speedScale ?? 1);
    this.sizeScale = opts.character.stats?.size ?? 1;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.body = { x: 0, y: 0, z: 0, radius: 0.35, height: STAND_H, onGround: false, stepHeight: 0.45 };
    this.health = this.maxHealth;
    this.armor = 0;
    this.alive = false;
    this.crouching = false;
    this.lives = Infinity;
    this.respawnTimer = 0;
    this.invuln = 0;
    this.lastAttacker = null;
    this.lastHurtTime = -10;
    this.lastHurtDir = null;
    this.stats = { kills: 0, deaths: 0, suicides: 0, shots: 0, hits: 0, headshots: 0, score: 0, damage: 0 };
    this.weapons = new WeaponState(this);
    this.cmd = null;
    this.brain = null;
    this.infected = false;
    this.carrying = null; // bag in Capture the Bag
    this.stepT = 0;
    this.model = new CharacterModel(this.character, { teamColor: this.team >= 0 ? TEAM_COLORS[this.team] : null });
    this.model.root.userData.actor = this;
    game.scene.add(this.model.root);
    this.model.root.visible = false;
    this.shadow = blobShadow();
    this.shadow.visible = false;
    game.scene.add(this.shadow);
  }

  get eyeHeight() { return (this.crouching ? 0.98 : 1.62) * Math.min(1.1, this.sizeScale); }
  eye(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z); }
  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }

  /** Hit boxes (world-space AABBs): body and head. */
  hitBoxes() {
    const s = this.sizeScale, r = 0.36 * s, h = this.body.height * s / (this.crouching ? 1 : 1);
    const headH = 0.36 * s;
    const top = this.pos.y + (this.crouching ? CROUCH_H : STAND_H) * s;
    const hr = 0.2 * s;
    return [
      { minX: this.pos.x - r, maxX: this.pos.x + r, minY: this.pos.y, maxY: top - headH, minZ: this.pos.z - r, maxZ: this.pos.z + r, head: false, h },
      { minX: this.pos.x - hr, maxX: this.pos.x + hr, minY: top - headH, maxY: top + 0.05, minZ: this.pos.z - hr, maxZ: this.pos.z + hr, head: true },
    ];
  }

  chest(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + (this.crouching ? 0.75 : 1.2) * this.sizeScale, this.pos.z); }
  headPos(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + (this.crouching ? 1.0 : 1.6) * this.sizeScale, this.pos.z); }

  spawn(point, loadout) {
    this.pos.set(point.x, point.y + 0.05, point.z);
    this.body.x = point.x; this.body.y = point.y + 0.05; this.body.z = point.z;
    this.vel.set(0, 0, 0);
    this.yaw = point.yaw ?? 0; this.pitch = 0;
    this.health = this.maxHealth;
    this.armor = loadout?.armor ?? 0;
    this.alive = true;
    this.crouching = false;
    this.body.height = STAND_H;
    this.invuln = loadout?.invuln ?? 1.2;
    this.weapons.reset(loadout?.weapons || ['fists', 'mobpistol']);
    this.model.root.visible = true;
    this.model.deadT = 0;
    this.model.setInfected(this.infected);
    this.syncModel();
  }

  applyCommand(cmd, dt) {
    this.cmd = cmd;
    if (!this.alive) return;
    // Look
    this.yaw += cmd.lookX;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + cmd.lookY));
    // Crouch
    const wantCrouch = cmd.crouch;
    if (wantCrouch && !this.crouching) { this.crouching = true; this.body.height = CROUCH_H; }
    else if (!wantCrouch && this.crouching) {
      const b = this.body;
      if (this.game.world.boxFree(b.x - b.radius, b.y + 0.01, b.z - b.radius, b.x + b.radius, b.y + STAND_H, b.z + b.radius)) {
        this.crouching = false; b.height = STAND_H;
      }
    }
    // Move
    let mx = cmd.moveX, my = cmd.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    // forward (-sin, -cos), right (cos, -sin)
    const wx = -sy * my + cy * mx;
    const wz = -cy * my - sy * mx;
    let speed = RUN_SPEED * this.speedScale;
    if (this.crouching) speed *= 0.5;
    if (this.weapons.zoomed) speed *= 0.6;
    if (this.infected) speed *= 1.1;
    if (this.carrying) speed *= 0.9;
    const onGround = this.body.onGround;
    const accel = onGround ? 55 : 14;
    const tx = wx * speed, tz = wz * speed;
    const dvx = tx - this.vel.x, dvz = tz - this.vel.z;
    const dl = Math.hypot(dvx, dvz);
    const maxDv = accel * dt;
    if (onGround || len > 0.05) {
      if (dl <= maxDv) { this.vel.x = tx; this.vel.z = tz; }
      else { this.vel.x += dvx / dl * maxDv; this.vel.z += dvz / dl * maxDv; }
    }
    if (cmd.jump && onGround && !this.crouching) {
      this.vel.y = JUMP_V;
      audio.play('jump', this.pos, 0.6);
    }
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -40) this.vel.y = -40;
    const res = this.game.world.moveBody(this.body, this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
    if (res.hitX) this.vel.x = 0;
    if (res.hitZ) this.vel.z = 0;
    if (res.landed) {
      if (this.vel.y < -16) this.takeDamage(Math.round((-this.vel.y - 16) * 4), null, { fall: true });
      this.vel.y = 0;
    }
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    this.pos.set(this.body.x, this.body.y, this.body.z);
    // Footsteps
    if (this.body.onGround && this.speed > 3) {
      this.stepT -= dt * this.speed;
      if (this.stepT <= 0) { this.stepT = 2.6; audio.play('step', this.pos, this.isPlayer ? 0.5 : 0.8); this.game.noise(this.pos, 7, this); }
    }
    if (this.pos.y < (this.game.level.killY ?? -25)) this.takeDamage(9999, null, { fall: true });
    // Weapons
    this.weapons.update(cmd, dt);
    if (this.invuln > 0) this.invuln -= dt;
  }

  takeDamage(amount, attacker, info = {}) {
    if (!this.alive || amount <= 0) return 0;
    if (this.invuln > 0 && !info.fall) return 0;
    const g = this.game;
    if (attacker && attacker !== this && !g.canDamage(attacker, this)) return 0;
    if (attacker && attacker !== this && attacker.alive === false && !info.posthumous) { /* projectiles still count */ }
    let dmg = amount * (attacker && attacker !== this ? attacker.damageScale : 1);
    if (this.armor > 0 && !info.fall) {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor -= absorbed;
      dmg -= absorbed;
    }
    this.health -= dmg;
    this.lastHurtTime = g.time;
    if (attacker && attacker !== this) {
      this.lastAttacker = attacker;
      attacker.stats.damage += dmg;
      this.lastHurtDir = new THREE.Vector3().subVectors(attacker.pos, this.pos).setY(0).normalize();
    }
    if (info.dir && !this.lastHurtDir) this.lastHurtDir = info.dir.clone().negate();
    if (this.brain) this.brain.onDamaged(attacker, dmg);
    g.onDamage(this, attacker, dmg, info);
    if (this.health <= 0) this.die(attacker, info);
    else if (this.isPlayer) audio.play('hurt', null, 0.6);
    return dmg;
  }

  die(killer, info = {}) {
    if (!this.alive) return;
    this.alive = false;
    this.health = 0;
    this.stats.deaths++;
    this.model.deathDir = Math.random() < 0.5 ? 1 : -1;
    this.weapons.zoomed = false;
    audio.play('death', this.pos, 0.8);
    this.game.onKill(this, killer, info);
  }

  syncModel() {
    const m = this.model;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.yaw;
    m.root.scale.setScalar(this.sizeScale);
  }

  updateModel(dt) {
    this.syncModel();
    // Blob shadow on the ground below (fades/shrinks with height)
    const g = this.game.world.groundHeight(this.pos.x, this.pos.z, this.pos.y + 0.3, 0.2);
    const h = this.pos.y - g;
    const show = this.model.root.visible && Number.isFinite(g) && h < 4 && this.model.deadT < 2.5;
    this.shadow.visible = show;
    if (show) {
      const s = (this.alive ? 1.0 : 1.6) * this.sizeScale * Math.max(0.3, 1 - h * 0.2);
      this.shadow.scale.set(s, 1, s);
      this.shadow.position.set(this.pos.x, g + 0.02, this.pos.z);
    }
    this.model.animate(dt, {
      speed: this.speed, crouch: this.crouching, pitch: this.pitch, alive: this.alive,
      airborne: !this.body.onGround && this.alive,
    });
  }

  dispose() {
    this.game.scene.remove(this.model.root);
    this.game.scene.remove(this.shadow);
  }
}

export { WEAPONS };
