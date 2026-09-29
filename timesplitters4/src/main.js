// App shell: renderer, main loop, screen flow (menus <-> game), progression hooks.
import * as THREE from 'three';
import './ui/styles.css';
import { input, settings } from './engine/input.js';
import { audio } from './engine/audio.js';
import { Game } from './game/game.js';
import { Menu } from './ui/menu.js';
import { MenuScene } from './ui/menuScene.js';
import { Progress } from './game/progress.js';
import { CHALLENGES, medalFor } from './content/challenges.js';

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.hudRoot = document.getElementById('hud-root');
    this.progress = new Progress();
    this.progress.takeNewUnlocks();
    try { Object.assign(audio.volume, JSON.parse(localStorage.getItem('ts4.volume') || '{}')); } catch { /* ignore */ }
    input.attach(this.canvas);
    // Browsers only start audio after a user gesture; resume on the first one (covers ?quick= URLs too).
    for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => audio.init(), { passive: true });
    input.onPauseRequest = () => { if (this.game && !this.game.paused && this.game.endT === null) this.pause(); };
    this.menu = new Menu(this);
    this.menuScene = new MenuScene();
    this.game = null;
    this.fpsEl = document.getElementById('fps');
    this._frames = 0; this._fpsT = 0;
    this.applySettings();
    window.addEventListener('resize', () => this._resize());
    this._resize();
    this.menu.show('title', {}, false);
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
    this._quickStart();
  }

  _quickStart() {
    const q = new URLSearchParams(location.search);
    if (q.get('unlock')) this.progress.unlockAll = true;
    const quick = q.get('quick');
    if (!quick) return;
    const bots = +(q.get('bots') ?? 5);
    const players = [{ character: q.get('char') || 'ada', name: 'You', source: { kbm: true, pad: 0 } }];
    if (quick === 'story') this.startGame({ type: 'story', level: 'chicago', difficulty: q.get('diff') || 'normal', players, bots: [] });
    else this.startGame({
      type: 'arcade', mode: q.get('mode') || 'deathmatch', level: q.get('level') || 'galleria', weaponSet: q.get('set') || 'classic',
      scoreLimit: 15, timeLimit: 5, players,
      bots: Array.from({ length: bots }, (_, i) => ({ character: ['vinnie', 'knight', 'ninja', 'marine', 'skater', 'sergei', 'greys', 'duck'][i % 8], skill: 0.5 })),
    });
  }

  applySettings() {
    const pr = settings.pixelMode ? 0.5 : Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(pr);
    this.canvas.classList.toggle('pixel', settings.pixelMode);
    this._resize();
    if (this.fpsEl) this.fpsEl.style.display = settings.showFps ? 'block' : 'none';
  }

  _resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    try {
      if (this.game) {
        if (!this.game.paused) this.game.update(dt);
        if (this.game) this.game.render();
      } else {
        this.menuScene.render(this.renderer, dt);
      }
      this.menu.update(dt);
    } catch (e) {
      console.error(e);
    }
    input.endFrame();
    this._frames++; this._fpsT += dt;
    if (this._fpsT >= 0.5) {
      if (this.fpsEl && settings.showFps) this.fpsEl.textContent = `${Math.round(this._frames / this._fpsT)} fps`;
      this._frames = 0; this._fpsT = 0;
    }
  }

  startGame(cfg) {
    audio.init();
    this.menu.hide();
    if (this.game) { this.game.dispose(); this.game = null; }
    this.lastConfig = cfg;
    this.game = new Game(this, cfg);
    window.__game = this.game;
    input.enabled = true;
    input.requestLock();
  }

  pause() {
    if (!this.game) return;
    this.game.paused = true;
    input.releaseLock();
    input.pressedKeys.clear();
    this.menu.show('pause', {}, false);
  }

  resume() {
    if (!this.game) return;
    this.menu.hide();
    this.game.paused = false;
    input.pressedKeys.clear();
    input.requestLock();
  }

  restart() { this.startGame(this.lastConfig); }

  quitToMenu(screen = 'main') {
    if (this.game) { this.game.dispose(); this.game = null; window.__game = null; }
    input.enabled = false;
    input.releaseLock();
    audio.playMusic('menu');
    this.menuScene.shuffle(this.progress.unlockedList());
    this.menu.show('main', {}, false);
    if (this.lastConfig?.fromEditor && screen === 'arcade') screen = 'editor';
    if (screen !== 'main') this.menu.show(screen);
  }

  missionFailed(game) {
    game.paused = true;
    input.releaseLock();
    this.menu.show('failed', {}, false);
  }

  gameOver(game, results) {
    game.paused = true;
    game.hud.container.style.display = 'none';
    input.releaseLock();
    let challengeInfo = null;
    if (results.type === 'story') {
      this.progress.recordMission(game.config.missionId || 'chicago', results.medal, results.time);
    } else {
      this.progress.recordMatch(results.mode);
      if (results.type === 'challenge') {
        const ch = CHALLENGES.find((c) => c.id === game.config.challengeId);
        const value = ch.metric(results);
        const m = medalFor(ch, value);
        this.progress.recordChallenge(ch.id, m, value);
        challengeInfo = { name: ch.name, medal: m, value, display: ch.display ? ch.display(value) : value, unit: ch.display ? '' : ch.unit };
      }
    }
    this.progress.save();
    const unlocks = this.progress.takeNewUnlocks();
    this.menu.show('results', { results, unlocks, challengeInfo }, false);
  }
}

window.__ts4 = new App();
