// Physical projectiles: rockets, grenades, bolts, plasma. Swept against world + actor hit boxes each frame.
import * as THREE from 'three';
import { rayBox } from '../engine/collision.js';
import { audio } from '../engine/audio.js';

const _seg = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3(), _t = new THREE.Vector3();
const geoCache = new Map();

function projectileMesh(def) {
  const key = (def.bolt ? 'b' : def.rocket ? 'r' : 's') + def.size + def.color;
  let geo = geoCache.get(key);
  if (!geo) {
    if (def.bolt) { geo = new THREE.BoxGeometry(def.size, def.size, 0.5); }
    else if (def.rocket) { geo = new THREE.CylinderGeometry(def.size * 0.6, def.size * 0.6, def.size * 4, 6); geo.rotateX(Math.PI / 2); }
    else geo = new THREE.IcosahedronGeometry(def.size, 1);
    geoCache.set(key, geo);
  }
  const mat = def.glow || def.rocket
    ? new THREE.MeshBasicMaterial({ color: def.color })
    : new THREE.MeshLambertMaterial({ color: def.color, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false;
  return m;
}

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.stuck = []; // bolts stuck in walls
  }

  spawn(owner, weapon, pos, vel, eyeOrigin) {
    const def = weapon.projectile;
    const g = this.game;
    // If the muzzle is inside a wall (hugging geometry), start from the eye instead.
    if (eyeOrigin && !g.world.lineOfSight(eyeOrigin.x, eyeOrigin.y, eyeOrigin.z, pos.x, pos.y, pos.z)) pos = eyeOrigin.clone();
    const mesh = projectileMesh(def);
    mesh.position.copy(pos);
    g.scene.add(mesh);
    let homingTarget = null;
    if (def.homing) homingTarget = g.findAimTarget(owner, eyeOrigin || pos, vel.clone().normalize(), 0.35, 80, true);
    this.list.push({
      owner, weapon, def, mesh, pos: pos.clone(), vel: vel.clone(), age: 0,
      fuse: def.fuse ?? 0, life: def.life ?? 6, homingTarget, dead: false, bounces: 0,
    });
  }

  update(dt) {
    const g = this.game;
    for (const p of this.list) {
      if (p.dead) continue;
      p.age += dt;
      const def = p.def;
      if (def.homing && p.homingTarget && p.homingTarget.alive && p.age > 0.12) {
        const target = p.homingTarget.chest(_t);
        const want = target.sub(p.pos).normalize().multiplyScalar(p.vel.length());
        p.vel.lerp(want, Math.min(1, def.homing * dt));
      }
      p.vel.y -= (def.gravity ?? 0) * dt;
      _seg.copy(p.vel).multiplyScalar(dt);
      const len = _seg.length();
      if (len > 1e-6) {
        const dx = _seg.x / len, dy = _seg.y / len, dz = _seg.z / len;
        // Actors
        let hitActor = null, hitT = len, hitHead = false;
        {
          for (const a of g.actors) {
            if (!a.alive || (a === p.owner && p.age < 0.25)) continue;
            if (a === p.owner && def.fuse) continue;
            for (const hb of a.hitBoxes()) {
              const pad = def.size * 0.5;
              const b = { minX: hb.minX - pad, minY: hb.minY - pad, minZ: hb.minZ - pad, maxX: hb.maxX + pad, maxY: hb.maxY + pad, maxZ: hb.maxZ + pad };
              const h = rayBox(p.pos.x, p.pos.y, p.pos.z, 1 / dx, 1 / dy, 1 / dz, b, hitT);
              if (h && h.t < hitT) { hitT = h.t; hitActor = a; hitHead = hb.head; }
            }
          }
        }
        const wh = g.world.raycast(p.pos.x, p.pos.y, p.pos.z, dx, dy, dz, hitT);
        if (wh && wh.t <= hitT) {
          p.pos.x += dx * wh.t; p.pos.y += dy * wh.t; p.pos.z += dz * wh.t;
          _n.set(wh.nx, wh.ny, wh.nz);
          if (def.bounce && !def.impact) {
            // Reflect and damp
            const vn = p.vel.dot(_n);
            p.vel.addScaledVector(_n, -2 * vn).multiplyScalar(def.bounce);
            p.pos.addScaledVector(_n, 0.02);
            p.bounces++;
            if (p.vel.length() > 3) audio.play('step', p.pos, 0.5);
            if (wh.ny > 0.7 && p.vel.length() < 1) p.vel.set(0, 0, 0);
          } else {
            this._detonate(p, null, false, _n);
            continue;
          }
        } else if (hitActor) {
          p.pos.x += dx * hitT; p.pos.y += dy * hitT; p.pos.z += dz * hitT;
          if (def.bounce && !def.impactPlayers && !def.impact) {
            // grenades bounce off people
            p.vel.multiplyScalar(-0.3);
          } else {
            this._detonate(p, hitActor, hitHead, null);
            continue;
          }
        } else {
          p.pos.add(_seg);
        }
      }
      if (def.fuse && p.age >= p.fuse) { this._detonate(p, null, false, null); continue; }
      if (p.age > p.life) { p.dead = true; continue; }
      p.mesh.position.copy(p.pos);
      if (def.bolt || def.rocket) p.mesh.lookAt(_p.copy(p.pos).add(p.vel));
      else { p.mesh.rotation.x += dt * 8; p.mesh.rotation.y += dt * 5; }
      if (def.trail) g.effects.trail(p.pos, 0xbbbbbb);
      if (def.glow) g.effects.glowTrail(p.pos, def.color);
    }
    // Cleanup
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.dead) { g.scene.remove(p.mesh); p.mesh.material.dispose(); this.list.splice(i, 1); }
    }
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      const s = this.stuck[i];
      s.t -= dt;
      if (s.t <= 0) { g.scene.remove(s.m); s.m.material.dispose(); this.stuck.splice(i, 1); }
    }
  }

  _detonate(p, actor, head, normal) {
    const g = this.game, def = p.def, w = p.weapon;
    p.dead = true;
    if (actor && w.damage > 0) {
      const dmg = w.damage * (head ? w.headMult : 1);
      const dir = p.vel.clone().normalize();
      g.applyHit(p.owner, actor, dmg, { weapon: w, headshot: head, dir, point: p.pos.clone() });
    }
    if (def.splash) {
      g.explode(p.pos, def.splash, def.splashDamage, p.owner, w, actor);
    } else if (!actor && normal) {
      g.effects.impact(p.pos, normal, def.glow ? def.color : 0xffd080, !def.glow);
      if (def.bolt) {
        // leave the bolt sticking out of the wall for a while
        p.mesh.position.copy(p.pos).addScaledVector(p.vel.clone().normalize(), -0.2);
        this.stuck.push({ m: p.mesh, t: 8 });
        p.mesh = new THREE.Object3D(); // detach so cleanup doesn't remove the stuck bolt
        p.mesh.material = { dispose() {} };
      }
    } else if (actor) {
      g.effects.sparkle(p.pos, def.color, 4, 2);
    }
  }

  clear() {
    for (const p of this.list) this.game.scene.remove(p.mesh);
    for (const s of this.stuck) this.game.scene.remove(s.m);
    this.list = []; this.stuck = [];
  }
}
