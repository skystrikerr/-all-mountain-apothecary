// Pickups: weapons (incl. dropped weapons), health, armour and mission items.
import * as THREE from 'three';
import { WEAPONS } from '../content/weapons.js';
import { buildWeaponModel } from './weaponModel.js';
import { audio } from '../engine/audio.js';

function padMesh(color) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.08, 12), new THREE.MeshLambertMaterial({ color: '#333' }));
  base.position.y = 0.04;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 4, 16), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.09;
  g.add(base, ring);
  return g;
}

function itemMesh(p) {
  const g = new THREE.Group();
  if (p.type === 'weapon') {
    const m = buildWeaponModel(WEAPONS[p.id]);
    m.scale.setScalar(1.7);
    m.rotation.y = Math.PI / 2;
    g.add(m);
    if (p.dual) { const m2 = buildWeaponModel(WEAPONS[p.id]); m2.scale.setScalar(1.7); m2.rotation.y = Math.PI / 2; m2.position.z = 0.2; g.add(m2); }
  } else if (p.type === 'health') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: '#f4f4f4' }));
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.31), new THREE.MeshBasicMaterial({ color: '#e11' }));
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.31), new THREE.MeshBasicMaterial({ color: '#e11' }));
    g.add(box, c1, c2);
  } else if (p.type === 'armor') {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.2), new THREE.MeshLambertMaterial({ color: '#2a5bd8' }));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.21), new THREE.MeshBasicMaterial({ color: '#9cf' }));
    g.add(vest, strip);
  } else if (p.type === 'item') {
    const shape = p.shape || 'box';
    let m;
    if (shape === 'crystal') m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: p.color || '#a3f' }));
    else if (shape === 'book') m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.26), new THREE.MeshLambertMaterial({ color: p.color || '#5a2a1a' }));
    else m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: p.color || '#fc3' }));
    g.add(m);
  }
  return g;
}

export class Pickups {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  add(def) {
    const p = { respawn: 20, active: true, respawnT: 0, ttl: Infinity, ...def, pos: new THREE.Vector3(def.x, def.y, def.z) };
    p.root = new THREE.Group();
    p.root.position.copy(p.pos);
    if (!p.dropped && p.type !== 'item') {
      const color = p.type === 'health' ? '#f33' : p.type === 'armor' ? '#39f' : '#fc3';
      p.pad = padMesh(color);
      p.root.add(p.pad);
    }
    p.item = itemMesh(p);
    p.item.position.y = p.dropped ? 0.25 : 0.7;
    p.root.add(p.item);
    this.game.scene.add(p.root);
    this.list.push(p);
    return p;
  }

  drop(actor) {
    const s = actor.weapons.slot, w = actor.weapons.current;
    if (!s || !w || w.clip === 0) return;
    const ammo = s.clip + s.clipL + s.reserve;
    if (ammo <= 0) return;
    const gy = this.game.world.groundHeight(actor.pos.x, actor.pos.z, actor.pos.y + 1);
    this.add({ type: 'weapon', id: w.id, x: actor.pos.x, y: Number.isFinite(gy) ? gy : actor.pos.y, z: actor.pos.z,
      dropped: true, ammo: Math.max(ammo, 1), dual: s.dual, respawn: 0, ttl: 25 });
  }

  update(dt, t) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.dropped) {
        p.ttl -= dt;
        if (p.ttl <= 0) { g.scene.remove(p.root); this.list.splice(i, 1); continue; }
      }
      if (!p.active) {
        p.respawnT -= dt;
        if (p.respawnT <= 0 && p.respawn > 0) { p.active = true; p.item.visible = true; g.effects.sparkle(p.pos.clone().setY(p.pos.y + 0.7), '#fff', 10); }
        continue;
      }
      p.item.rotation.y += dt * 1.8;
      p.item.position.y = (p.dropped ? 0.25 : 0.7) + Math.sin(t * 2.5 + i) * 0.08;
      if (p.dropped && p.ttl < 5) p.item.visible = Math.floor(t * 8) % 2 === 0;
      for (const a of g.actors) {
        if (!a.alive) continue;
        const dx = a.pos.x - p.pos.x, dz = a.pos.z - p.pos.z, dy = a.pos.y - p.pos.y;
        const item = p.type === 'item';
        if (dx * dx + dz * dz > (item ? 2.6 : 1.2) || dy < (item ? -1.8 : -1) || dy > 1.6) continue;
        if (this._take(p, a)) {
          if (p.respawn > 0 && !p.dropped) { p.active = false; p.respawnT = p.respawn; p.item.visible = false; }
          else { g.scene.remove(p.root); this.list.splice(i, 1); }
          break;
        }
      }
    }
  }

  _take(p, a) {
    const g = this.game;
    if (!g.mode.canPickup(a, p)) return false;
    switch (p.type) {
      case 'weapon': {
        const r = a.weapons.give(p.id, { ammo: p.ammo, dual: p.dual });
        if (!r) return false;
        const w = WEAPONS[p.id];
        g.notify(a, r === 'dual' ? `DUAL ${w.name.toUpperCase()}!` : r === 'new' ? w.name : `${w.name} ammo`);
        audio.play('pickup', a.isPlayer ? null : a.pos, 0.8);
        return true;
      }
      case 'health':
        if (a.health >= a.maxHealth) return false;
        a.health = Math.min(a.maxHealth, a.health + (p.amount ?? 50));
        g.notify(a, 'Health'); audio.play('health', a.isPlayer ? null : a.pos, 0.8);
        return true;
      case 'armor':
        if (a.armor >= 100) return false;
        a.armor = Math.min(100, a.armor + (p.amount ?? 50));
        g.notify(a, 'Body Armour'); audio.play('pickup', a.isPlayer ? null : a.pos, 0.8);
        return true;
      case 'item':
        if (!a.isPlayer) return false;
        g.notify(a, p.name || 'Item');
        audio.play('objective', null, 0.8);
        g.onItemCollected(a, p);
        return true;
    }
    return false;
  }

  clear() {
    for (const p of this.list) this.game.scene.remove(p.root);
    this.list = [];
  }
}
