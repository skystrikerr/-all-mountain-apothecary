// Visual effects: pooled tracers/beams, CPU particles, bullet decals, explosion fireballs and flash lights.
import * as THREE from 'three';

const MAX_PARTICLES = 1400;

class ParticleSystem {
  constructor(scene, size, additive) {
    this.pos = new Float32Array(MAX_PARTICLES * 3);
    this.col = new Float32Array(MAX_PARTICLES * 3);
    this.vel = new Float32Array(MAX_PARTICLES * 3);
    this.life = new Float32Array(MAX_PARTICLES);
    this.maxLife = new Float32Array(MAX_PARTICLES);
    this.grav = new Float32Array(MAX_PARTICLES);
    this.baseCol = new Float32Array(MAX_PARTICLES * 3);
    this.count = 0;
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, MAX_PARTICLES);
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: additive ? 1 : 0.8,
    }));
    this.points.frustumCulled = false;
    this.geo = geo;
    for (let i = 0; i < MAX_PARTICLES; i++) this.pos[i * 3 + 1] = -9999;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, color, life, grav = 9) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.baseCol[i * 3] = color.r; this.baseCol[i * 3 + 1] = color.g; this.baseCol[i * 3 + 2] = color.b;
    this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav;
  }

  update(dt) {
    const p = this.pos, v = this.vel, c = this.col, bc = this.baseCol;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { p[i * 3 + 1] = -9999; continue; }
      v[i * 3 + 1] -= this.grav[i] * dt;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      const k = this.life[i] / this.maxLife[i];
      c[i * 3] = bc[i * 3] * k; c[i * 3 + 1] = bc[i * 3 + 1] * k; c[i * 3 + 2] = bc[i * 3 + 2] * k;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.sparks = new ParticleSystem(scene, 0.09, true);
    this.puffs = new ParticleSystem(scene, 0.45, false);
    this.tracers = [];
    this.beams = [];
    this.flashes = [];
    this.fireballs = [];
    this.decals = [];
    this.decalCursor = 0;
    // Tracer pool
    for (let i = 0; i < 48; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      line.visible = false; line.frustumCulled = false;
      scene.add(line);
      this.tracers.push({ line, t: 0 });
    }
    // Beam pool (thick glowing boxes)
    const beamGeo = new THREE.BoxGeometry(1, 1, 1); beamGeo.translate(0, 0, -0.5);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false; m.frustumCulled = false;
      scene.add(m);
      this.beams.push({ m, t: 0, max: 0.12 });
    }
    // Flash lights (fixed count so shaders never recompile)
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 10, 1.5);
      scene.add(l);
      this.flashes.push({ l, t: 0, max: 0.1, i0: 0 });
    }
    // Fireballs
    const fbGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(fbGeo, new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false;
      scene.add(m);
      this.fireballs.push({ m, t: 0, max: 0.5, r: 1 });
    }
    // Decals
    const decalGeo = new THREE.PlaneGeometry(0.12, 0.12);
    const decalMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(decalGeo, decalMat);
      m.visible = false;
      m.matrixAutoUpdate = true;
      scene.add(m);
      this.decals.push(m);
    }
    this._c = new THREE.Color();
  }

  tracer(from, to, color = 0xffe9a0) {
    const tr = this.tracers.find((t) => t.t <= 0) || this.tracers[0];
    const a = tr.line.geometry.attributes.position.array;
    // Draw only the far part of the tracer so it looks like a streak rather than a laser.
    const k = 0.25 + Math.random() * 0.2;
    a[0] = from.x + (to.x - from.x) * k; a[1] = from.y + (to.y - from.y) * k; a[2] = from.z + (to.z - from.z) * k;
    a[3] = to.x; a[4] = to.y; a[5] = to.z;
    tr.line.geometry.attributes.position.needsUpdate = true;
    tr.line.material.color.set(color);
    tr.line.visible = true; tr.t = 0.05;
  }

  beam(from, to, color = 0x66ccff, width = 0.05, life = 0.14) {
    const b = this.beams.find((x) => x.t <= 0) || this.beams[0];
    const len = from.distanceTo(to);
    b.m.position.copy(from);
    b.m.lookAt(to);
    b.m.scale.set(width, width, len);
    b.m.material.color.set(color);
    b.m.material.opacity = 1;
    b.m.visible = true; b.t = life; b.max = life;
  }

  flash(pos, color = 0xffaa55, intensity = 3, dist = 10, life = 0.07) {
    let f = this.flashes.find((x) => x.t <= 0);
    if (!f) f = this.flashes.reduce((a, b) => (a.t < b.t ? a : b));
    f.l.position.copy(pos); f.l.color.set(color); f.l.distance = dist;
    f.i0 = intensity; f.l.intensity = intensity; f.t = life; f.max = life;
  }

  impact(pos, normal, color = 0xffd080, decal = true) {
    const c = this._c.set(color);
    for (let i = 0; i < 6; i++) {
      this.sparks.emit(pos.x, pos.y, pos.z,
        normal.x * 3 + (Math.random() - 0.5) * 4, normal.y * 3 + Math.random() * 3, normal.z * 3 + (Math.random() - 0.5) * 4, c, 0.25 + Math.random() * 0.2, 12);
    }
    const g = this._c.setRGB(0.55, 0.52, 0.48);
    this.puffs.emit(pos.x, pos.y, pos.z, normal.x * 0.8, normal.y * 0.8 + 0.3, normal.z * 0.8, g, 0.5, -0.5);
    if (decal) {
      const d = this.decals[this.decalCursor];
      this.decalCursor = (this.decalCursor + 1) % this.decals.length;
      d.position.set(pos.x + normal.x * 0.01, pos.y + normal.y * 0.01, pos.z + normal.z * 0.01);
      d.lookAt(pos.x + normal.x, pos.y + normal.y, pos.z + normal.z);
      d.rotation.z = Math.random() * 6;
      d.visible = true;
    }
  }

  blood(pos, dir, robotic = false) {
    const c = this._c.set(robotic ? 0xffd040 : 0xb01010);
    for (let i = 0; i < 10; i++) {
      this.puffs.emit(pos.x, pos.y, pos.z,
        dir.x * 2 + (Math.random() - 0.5) * 3, Math.random() * 2.5, dir.z * 2 + (Math.random() - 0.5) * 3, c, 0.4 + Math.random() * 0.3, 9);
    }
  }

  explosion(pos, radius) {
    const fb = this.fireballs.find((f) => f.t <= 0) || this.fireballs[0];
    fb.m.position.copy(pos); fb.t = 0.55; fb.max = 0.55; fb.r = radius * 0.7; fb.m.visible = true;
    fb.m.material.color.set(0xffc050);
    this.flash(pos, 0xff9933, 8, radius * 4, 0.35);
    const c = this._c;
    for (let i = 0; i < 40; i++) {
      c.setHSL(0.05 + Math.random() * 0.08, 1, 0.5 + Math.random() * 0.2);
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2, s = 4 + Math.random() * 10;
      this.sparks.emit(pos.x, pos.y, pos.z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 2, Math.sin(a) * Math.cos(e) * s, c, 0.5 + Math.random() * 0.5, 14);
    }
    for (let i = 0; i < 16; i++) {
      c.setRGB(0.25, 0.23, 0.22);
      this.puffs.emit(pos.x + (Math.random() - 0.5) * radius * 0.6, pos.y + Math.random() * radius * 0.4, pos.z + (Math.random() - 0.5) * radius * 0.6,
        (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2, c, 1.2 + Math.random(), -1);
    }
  }

  trail(pos, color = 0x999999) {
    this.puffs.emit(pos.x, pos.y, pos.z, (Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4, this._c.set(color), 0.5, -0.2);
  }

  glowTrail(pos, color) {
    this.sparks.emit(pos.x, pos.y, pos.z, 0, 0, 0, this._c.set(color), 0.15, 0);
  }

  sparkle(pos, color, n = 12, speed = 3) {
    const c = this._c.set(color);
    for (let i = 0; i < n; i++) this.sparks.emit(pos.x, pos.y, pos.z, (Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed, c, 0.6, 3);
  }

  update(dt) {
    this.sparks.update(dt);
    this.puffs.update(dt);
    for (const t of this.tracers) if (t.t > 0) { t.t -= dt; if (t.t <= 0) t.line.visible = false; }
    for (const b of this.beams) if (b.t > 0) {
      b.t -= dt;
      b.m.material.opacity = Math.max(0, b.t / b.max);
      if (b.t <= 0) b.m.visible = false;
    }
    for (const f of this.flashes) if (f.t > 0) { f.t -= dt; f.l.intensity = f.t > 0 ? f.i0 * (f.t / f.max) : 0; }
    for (const f of this.fireballs) if (f.t > 0) {
      f.t -= dt;
      const k = 1 - f.t / f.max;
      f.m.scale.setScalar(0.2 + f.r * Math.sqrt(k));
      f.m.material.opacity = 1 - k;
      f.m.material.color.setHSL(0.1 - k * 0.08, 1, 0.6 - k * 0.3);
      if (f.t <= 0) f.m.visible = false;
    }
  }
}
