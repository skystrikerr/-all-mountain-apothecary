// PlayerView: a local player's camera, first-person viewmodel and per-view HUD state (split-screen aware).
import * as THREE from 'three';
import { buildWeaponModel } from './weaponModel.js';
import { settings } from '../engine/input.js';

let flashTex = null;
function muzzleTexture() {
  if (flashTex) return flashTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.3, 'rgba(255,200,80,0.9)'); g.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r = i % 2 ? 12 : 32;
    ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  ctx.fill();
  flashTex = new THREE.CanvasTexture(c);
  flashTex.colorSpace = THREE.SRGBColorSpace;
  return flashTex;
}

export function viewportLayout(i, n) {
  if (n === 1) return { x: 0, y: 0, w: 1, h: 1 };
  if (n === 2) return { x: 0, y: i * 0.5, w: 1, h: 0.5 };
  return { x: (i % 2) * 0.5, y: Math.floor(i / 2) * 0.5, w: 0.5, h: 0.5 };
}

export class PlayerView {
  constructor(game, actor, index, count, source) {
    this.game = game;
    this.actor = actor;
    this.index = index;
    this.source = source;
    this.layout = viewportLayout(index, count);
    this.camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.05, 500);
    this.camera.rotation.order = 'YXZ';
    this.camera.layers.enable(0);
    for (let l = 1; l <= 4; l++) { if (l === index + 1) this.camera.layers.disable(l); else this.camera.layers.enable(l); }
    // Viewmodel scene
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(54, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight('#ffffff', '#554433', 1.6));
    const key = new THREE.DirectionalLight('#fff4dd', 1.4); key.position.set(1, 2, 1); this.vmScene.add(key);
    this.vmRoot = new THREE.Group();
    this.vmScene.add(this.vmRoot);
    this.guns = [null, null];
    this.flashes = [0, 1].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: muzzleTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.visible = false; s.scale.setScalar(0.18);
      this.vmScene.add(s);
      return s;
    });
    this.vmKey = '';
    this.bob = 0;
    this.shake = 0;
    this.swayX = 0; this.swayY = 0;
    this.prevYaw = actor.yaw; this.prevPitch = actor.pitch;
    this.cmd = null;
    // HUD-facing state
    this.hitT = 0; this.hitHead = false; this.hitKill = false;
    this.hurtT = 0; this.hurtDirs = [];
    this.deathInfo = null;
    this.deadT = 0;
    this.landDip = 0;
    this.wasGround = true;
  }

  viewportPx(W, H) {
    const l = this.layout;
    const w = Math.floor(l.w * W), h = Math.floor(l.h * H);
    const x = Math.floor(l.x * W);
    const yTop = Math.floor(l.y * H);
    return { x, y: H - yTop - h, w, h };
  }

  hitMarker(head, kill) { this.hitT = 0.2; this.hitHead = head; this.hitKill = this.hitKill || kill; if (kill) this.killT = 0.5; }
  hurt(attacker, dmg, info) {
    this.hurtT = Math.min(1, this.hurtT + dmg / 40);
    this.shake = Math.max(this.shake, Math.min(0.35, dmg / 80));
    const a = this.actor;
    let src = attacker && attacker !== a ? attacker.pos : null;
    if (!src && info.point) src = info.point;
    if (src) {
      const ang = Math.atan2(-(src.x - a.pos.x), -(src.z - a.pos.z));
      this.hurtDirs.push({ ang, t: 1.2 });
      if (this.hurtDirs.length > 6) this.hurtDirs.shift();
    }
  }
  died(killer) { this.deathInfo = { killer, pos: this.actor.pos.clone() }; this.deadT = 0; }
  respawned() { this.deathInfo = null; this.hurtT = 0; this.hurtDirs = []; }

  _rebuildViewmodel() {
    const a = this.actor, ws = a.weapons, w = ws.current, s = ws.slot;
    const key = w.id + (s?.dual ? ':dual' : '');
    if (key === this.vmKey) return;
    this.vmKey = key;
    for (const g of this.guns) if (g) this.vmRoot.remove(g);
    this.guns = [null, null];
    const make = (side) => {
      const m = buildWeaponModel(w);
      const g = new THREE.Group();
      g.add(m);
      g.userData.model = m;
      g.userData.side = side;
      m.traverse((o) => { o.castShadow = false; });
      this.vmRoot.add(g);
      return g;
    };
    this.guns[0] = make(1);
    if (s?.dual || w.view?.type === 'fist') this.guns[1] = make(-1);
  }

  update(dt) {
    const a = this.actor;
    const cam = this.camera;
    // ----- camera
    if (a.alive) {
      const eye = a.eye();
      if (a.body.onGround && !this.wasGround) this.landDip = 0.12;
      this.wasGround = a.body.onGround;
      this.landDip = Math.max(0, this.landDip - dt * 0.6);
      const sp = a.speed;
      if (a.body.onGround && sp > 0.5) this.bob += dt * sp * 1.25;
      const bobAmt = a.body.onGround ? Math.min(1, sp / 7) : 0;
      cam.position.set(eye.x, eye.y + Math.abs(Math.sin(this.bob)) * 0.05 * bobAmt - this.landDip, eye.z);
      cam.rotation.set(a.pitch + a.weapons.kick * 0.5, a.yaw, 0);
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt * 1.5);
        cam.rotation.x += (Math.random() - 0.5) * this.shake * 0.08;
        cam.rotation.y += (Math.random() - 0.5) * this.shake * 0.08;
        cam.position.y += (Math.random() - 0.5) * this.shake * 0.1;
      }
      const w = a.weapons.current;
      const targetFov = a.weapons.zoomed && w.zoom ? w.zoom : settings.fov;
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 14);
    } else if (this.deathInfo) {
      this.deadT += dt;
      const p = this.deathInfo.pos;
      const k = this.deathInfo.killer;
      const t = Math.min(1, this.deadT / 1.5);
      const ang = a.yaw + this.deadT * 0.3;
      cam.position.set(p.x + Math.sin(ang) * (2 + t * 2.5), p.y + 1 + t * 3, p.z + Math.cos(ang) * (2 + t * 2.5));
      const look = k && k.alive && k !== a && this.deadT > 1.2 ? k.chest() : p.clone().setY(p.y + 0.5);
      cam.lookAt(look);
      cam.fov += (settings.fov - cam.fov) * Math.min(1, dt * 5);
    }
    cam.updateProjectionMatrix();
    // ----- HUD timers
    this.hitT = Math.max(0, this.hitT - dt);
    if (this.hitT === 0) this.hitKill = false;
    this.killT = Math.max(0, (this.killT || 0) - dt);
    this.hurtT = Math.max(0, this.hurtT - dt * 0.8);
    for (const d of this.hurtDirs) d.t -= dt;
    this.hurtDirs = this.hurtDirs.filter((d) => d.t > 0);
    // ----- viewmodel
    if (!a.alive) return;
    this._rebuildViewmodel();
    const ws = a.weapons, w = ws.current;
    // sway from look input
    const dyaw = angleWrap(a.yaw - this.prevYaw), dpitch = a.pitch - this.prevPitch;
    this.prevYaw = a.yaw; this.prevPitch = a.pitch;
    this.swayX += (Math.max(-0.08, Math.min(0.08, dyaw * 0.6)) - this.swayX) * Math.min(1, dt * 10);
    this.swayY += (Math.max(-0.08, Math.min(0.08, dpitch * 0.6)) - this.swayY) * Math.min(1, dt * 10);
    const sp = a.speed, bobAmt = a.body.onGround ? Math.min(1, sp / 7) : 0.2;
    const bx = Math.sin(this.bob) * 0.014 * bobAmt, by = -Math.abs(Math.cos(this.bob)) * 0.012 * bobAmt;
    let switchDip = 0;
    if (ws.switchT > 0) { const k = ws.switchT / 0.32; switchDip = Math.sin(k * Math.PI) * 0.35; }
    let reloadRot = 0, reloadDip = 0;
    if (ws.reloadT > 0) { const k = 1 - ws.reloadT / w.reload; reloadRot = Math.sin(k * Math.PI) * 0.9; reloadDip = Math.sin(k * Math.PI) * 0.12; }
    const bulky = w.view?.bulky ? 1.08 : 1;
    const isFist = w.view?.type === 'fist', isThrown = w.kind === 'thrown', isMelee = w.kind === 'melee';
    for (let i = 0; i < 2; i++) {
      const g = this.guns[i];
      const fl = this.flashes[i];
      if (!g) { fl.visible = false; continue; }
      const side = g.userData.side;
      const fire = ws.flash[i] / 0.06;
      let x = 0.21 * side * bulky, y = -0.2 - (w.view?.bulky ? 0.03 : 0), z = -0.5;
      let rx = 0, ry = 0, rz = 0;
      if (isFist) {
        const punch = ((ws.shotCount || 0) % 2 === 0) === (side > 0) ? Math.max(0, ws.cooldown[0]) / (60 / w.rpm) : 0;
        z += -Math.sin(punch * Math.PI) * 0.25;
        x = 0.16 * side; y = -0.2;
      } else if (isMelee) {
        const sw = Math.max(0, ws.cooldown[0]) / (60 / w.rpm);
        rz = Math.sin(sw * Math.PI) * 1.2 * side; ry = Math.sin(sw * Math.PI) * 0.6;
        y = -0.24; rx = 0.4;
      } else if (isThrown) {
        const th = Math.max(0, ws.cooldown[0]) / (60 / w.rpm);
        rx = -Math.sin(th * Math.PI) * 1.2; z -= Math.sin(th * Math.PI) * 0.15;
      }
      z += fire * 0.05; rx += fire * 0.12;
      g.position.set(x + bx - this.swayX * 0.5, y + by - switchDip - reloadDip + this.swayY * 0.4, z);
      g.rotation.set(rx - reloadRot + (w.view?.bulky ? 0.02 : 0), ry + this.swayX, rz + (reloadRot * 0.4 * side));
      const model = g.userData.model;
      if (model.userData.spinner) model.userData.spinner.rotation.z += dt * ws.spin * 40;
      // muzzle flash
      if (ws.flash[i] > 0 && !isMelee && !isThrown && !isFist && w.kind !== 'projectile' || (ws.flash[i] > 0 && w.kind === 'projectile' && !w.projectile.bolt)) {
        const mz = model.userData.muzzle;
        g.updateMatrixWorld(true);
        mz.getWorldPosition(fl.position);
        fl.material.rotation = Math.random() * 6;
        fl.material.color.set(w.beam || w.projectile?.glow ? (w.tracer || w.projectile?.color || '#8cf') : '#ffffff');
        fl.scale.setScalar((w.view?.bulky ? 0.24 : 0.16) * (0.8 + Math.random() * 0.4));
        fl.visible = true;
      } else fl.visible = false;
    }
  }

  dispose() {}
}

function angleWrap(d) {
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
