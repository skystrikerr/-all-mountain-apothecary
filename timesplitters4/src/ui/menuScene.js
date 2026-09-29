// Animated 3D backdrop for menus: a spinning time-vortex tunnel with a line-up of characters.
import * as THREE from 'three';
import { CharacterModel } from '../game/characterModel.js';
import { CHARACTERS } from '../content/characters.js';
import { WEAPON_LIST } from '../content/weapons.js';

function vortexTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0420'; ctx.fillRect(0, 0, 128, 128);
  const cols = ['#ff2bd6', '#29f0ff', '#ffd23b', '#7a2aff'];
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = cols[i % cols.length]; ctx.globalAlpha = 0.35 + (i % 3) * 0.2; ctx.lineWidth = 2 + (i % 3) * 2;
    ctx.beginPath(); ctx.moveTo(i * 10, 0); ctx.lineTo(i * 10 + 64, 128); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MenuScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#05020f');
    this.scene.fog = new THREE.Fog('#05020f', 10, 60);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    this.camera.position.set(0, 1.6, 6);
    this.tex = vortexTexture();
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 120, 24, 1, true), new THREE.MeshBasicMaterial({ map: this.tex, side: THREE.BackSide }));
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.z = -50;
    this.tunnel = tunnel;
    this.scene.add(tunnel);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#442266', 1.8));
    const key = new THREE.DirectionalLight('#ffd0a0', 2); key.position.set(3, 5, 6); this.scene.add(key);
    const rim = new THREE.PointLight('#29f0ff', 20, 20, 1.2); rim.position.set(-4, 3, -2); this.scene.add(rim);
    this.lineup = new THREE.Group();
    this.scene.add(this.lineup);
    this.models = [];
    this.shuffle();
    this.t = 0;
  }

  shuffle(pool = CHARACTERS) {
    for (const m of this.models) this.lineup.remove(m.root);
    this.models = [];
    const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    const guns = WEAPON_LIST.filter((w) => w.kind !== 'melee' && w.kind !== 'thrown');
    picks.forEach((c, i) => {
      const m = new CharacterModel(c);
      const w = guns[Math.floor(Math.random() * guns.length)];
      m.setWeapon(w, w.dual && Math.random() < 0.5);
      m.root.position.set((i - 1) * 2.2, 0, -i % 2 * 0.8);
      m.root.rotation.y = Math.PI + (i - 1) * -0.35;
      m.phase = i;
      this.lineup.add(m.root);
      this.models.push(m);
    });
    this.lineup.position.set(2.2, -0.1, 0);
  }

  render(renderer, dt) {
    this.t += dt;
    this.tex.offset.y -= dt * 0.25;
    this.tex.offset.x += dt * 0.05;
    this.tunnel.rotation.y += dt * 0.1;
    for (const m of this.models) {
      m.animate(dt, { speed: 0, crouch: false, pitch: Math.sin(this.t + m.phase) * 0.15, alive: true, airborne: false });
      m.root.position.y = Math.abs(Math.sin(this.t * 2 + m.phase)) * 0.05;
    }
    this.lineup.rotation.y = Math.sin(this.t * 0.3) * 0.25;
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, W, H);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.render(this.scene, this.camera);
  }
}
