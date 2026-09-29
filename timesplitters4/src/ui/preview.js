// Rotating 3D character preview for the roster screen (own small WebGL renderer).
import * as THREE from 'three';
import { CharacterModel } from '../game/characterModel.js';
import { WEAPONS } from '../content/weapons.js';

export class CharacterPreview {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    this.camera.position.set(0, 1.2, 4.2);
    this.camera.lookAt(0, 0.95, 0);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#443366', 2));
    const d = new THREE.DirectionalLight('#ffe0c0', 2); d.position.set(2, 3, 3); this.scene.add(d);
    this.model = null;
    this.t = 0;
    this._raf = 0;
    const loop = () => { this._raf = requestAnimationFrame(loop); this._tick(); };
    loop();
    this._last = performance.now();
  }

  setCharacter(c, silhouette = false) {
    if (this.model) this.scene.remove(this.model.root);
    this.model = new CharacterModel(c);
    this.model.setWeapon(WEAPONS[['tommy', 'volk67', 'photon', 'crossbow', 'raduzi', 'graviton'][c.id.length % 6]], false);
    if (silhouette) this.model.root.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: '#111' }); });
    this.model.root.rotation.y = Math.PI;
    this.scene.add(this.model.root);
  }

  _tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.t += dt;
    if (this.model) {
      this.model.root.rotation.y += dt * 0.8;
      this.model.animate(dt, { speed: 0, crouch: false, pitch: 0, alive: true, airborne: false });
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}
