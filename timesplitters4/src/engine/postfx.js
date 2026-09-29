// Post-processing pipeline for the PS2 look.
//   1. ViewsPass     – every split-screen view (world + first-person viewmodel) into one low-res HDR buffer
//   2. Bloom         – soft glow on lights, neon, muzzle flashes and explosions
//   3. Grade         – saturation boost + vignette (in linear light)
//   4. Output        – ACES tone mapping + sRGB
//   5. Dither        – faint 4×4 ordered dither, like the PS2's 16-bit framebuffer output
// The buffer is rendered at console resolution (480 lines by default) and upscaled with bilinear filtering,
// which gives the soft, slightly blurry TV look of the era instead of chunky pixels.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const RESOLUTIONS = {
  ps2: { name: 'PS2 (480p, soft)', lines: 480 },
  ps2hi: { name: 'PS2 Progressive (576p)', lines: 576 },
  hd: { name: 'HD (720p)', lines: 720 },
  native: { name: 'Native', lines: 0 },
};

class ViewsPass extends Pass {
  constructor() {
    super();
    this.needsSwap = false;
    this.scene = null;
    this.views = [];
  }

  render(renderer, writeBuffer, readBuffer) {
    const t = readBuffer;
    const W = t.width, H = t.height;
    for (const v of this.views) {
      const vp = v.viewportPx(W, H);
      t.viewport.set(vp.x, vp.y, vp.w, vp.h);
      t.scissor.set(vp.x, vp.y, vp.w, vp.h);
      t.scissorTest = true;
      renderer.setRenderTarget(t);
      renderer.clear();
      renderer.render(this.scene, v.camera);
      if (v.actor.alive && !v.actor.weapons.zoomed) {
        renderer.clearDepth();
        renderer.render(v.vmScene, v.vmCamera);
      }
    }
    t.viewport.set(0, 0, W, H);
    t.scissor.set(0, 0, W, H);
    t.scissorTest = false;
  }
}

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1.18 }, uVignette: { value: 0.9 }, uLift: { value: new THREE.Color(0.012, 0.01, 0.022) } },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uSat; uniform float uVignette; uniform vec3 uLift;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = max(mix(vec3(l), c.rgb, uSat), 0.0) + uLift;
      vec2 d = vUv - 0.5;
      c.rgb *= clamp(1.0 - dot(d, d) * uVignette, 0.0, 1.0);
      gl_FragColor = c;
    }`,
};

const DitherShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 1 / 48 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uAmount;
    varying vec2 vUv;
    float bayer(vec2 p) {
      int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
      int i = x + y * 4;
      int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
      return float(m[i]) / 16.0;
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb += (bayer(gl_FragCoord.xy) - 0.5) * uAmount;
      gl_FragColor = c;
    }`,
};

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(1);
    this.views = new ViewsPass();
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.35, 0.86);
    this.grade = new ShaderPass(GradeShader);
    this.output = new OutputPass();
    this.dither = new ShaderPass(DitherShader);
    for (const p of [this.views, this.bloom, this.grade, this.output, this.dither]) this.composer.addPass(p);
    this.resolution = 'ps2';
    this.lastSize = '';
  }

  configure({ resolution = 'ps2', bloom = true, dither = true } = {}) {
    this.resolution = resolution;
    this.bloom.enabled = bloom;
    this.dither.enabled = dither;
    this.lastSize = '';
  }

  _resize() {
    const c = this.renderer.domElement;
    const cw = c.clientWidth || 1, ch = c.clientHeight || 1;
    const lines = RESOLUTIONS[this.resolution]?.lines || 0;
    let w, h;
    if (lines && ch * this.renderer.getPixelRatio() > lines) { h = lines; w = Math.round(lines * cw / ch); }
    else { w = Math.round(cw * this.renderer.getPixelRatio()); h = Math.round(ch * this.renderer.getPixelRatio()); }
    const key = `${w}x${h}`;
    if (key === this.lastSize) return;
    this.lastSize = key;
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
  }

  get internalSize() { return this.lastSize; }

  render(scene, views) {
    this._resize();
    this.views.scene = scene;
    this.views.views = views;
    this.composer.render();
  }
}
