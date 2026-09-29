// Input: keyboard + mouse (pointer lock) and the Gamepad API.
// Every local player reads a normalized "command" per frame. Bots emit the same command structure,
// so actors are driven identically whether a human or the AI is in control.

export function emptyCommand() {
  return {
    moveX: 0, moveY: 0, lookX: 0, lookY: 0,
    fire: false, fireAlt: false, firePressed: false, fireAltPressed: false,
    jump: false, crouch: false, reload: false, use: false,
    nextWeapon: false, prevWeapon: false, slot: -1,
    scoreboard: false, pause: false, analogLook: false,
  };
}

export const settings = {
  mouseSens: 1.0,
  padSens: 1.0,
  invertY: false,
  fov: 80,
  aimAssist: true,
  pixelMode: true,
  showFps: false,
};

try {
  const saved = JSON.parse(localStorage.getItem('ts4.settings') || 'null');
  if (saved) Object.assign(settings, saved);
} catch { /* storage unavailable */ }

export function saveSettings() {
  try { localStorage.setItem('ts4.settings', JSON.stringify(settings)); } catch { /* ignore */ }
}

class InputManager {
  constructor() {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouseButtons = new Set();
    this.pressedMouse = new Set();
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    this.locked = false;
    this.canvas = null;
    this.padPrev = new Map(); // index -> previous buttons array
    this.onPauseRequest = null;
    this.enabled = false;
  }

  attach(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (!this.keys.has(e.code)) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
      if (this.enabled && ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ControlLeft'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseButtons.clear(); });
    canvas.addEventListener('mousedown', (e) => {
      if (this.enabled && !this.locked) this.requestLock();
      if (!this.mouseButtons.has(e.button)) this.pressedMouse.add(e.button);
      this.mouseButtons.add(e.button);
    });
    window.addEventListener('mouseup', (e) => this.mouseButtons.delete(e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX; this.mouseDY += e.movementY;
    });
    window.addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked && this.enabled && this.onPauseRequest) this.onPauseRequest();
    });
  }

  requestLock() {
    if (!this.canvas || this.locked) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch { /* ignore */ }
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  pads() {
    return navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  }

  /** Read a command for a source description: { kbm: bool, pad: index|-1 }. */
  read(source, dt) {
    const c = emptyCommand();
    if (source.kbm) this._readKbm(c);
    if (source.pad >= 0) this._readPad(c, source.pad, dt);
    return c;
  }

  /** Must be called once per frame after all players have read input. */
  endFrame() {
    this.pressedKeys.clear();
    this.pressedMouse.clear();
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    for (const p of this.pads()) this.padPrev.set(p.index, p.buttons.map((b) => b.pressed));
  }

  _readKbm(c) {
    const k = this.keys;
    c.moveY += (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    c.moveX += (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const sens = 0.0022 * settings.mouseSens;
    c.lookX += -this.mouseDX * sens;
    c.lookY += -this.mouseDY * sens * (settings.invertY ? -1 : 1);
    c.fire = c.fire || this.mouseButtons.has(0);
    c.fireAlt = c.fireAlt || this.mouseButtons.has(2);
    c.firePressed = c.firePressed || this.pressedMouse.has(0);
    c.fireAltPressed = c.fireAltPressed || this.pressedMouse.has(2);
    c.jump = c.jump || this.pressedKeys.has('Space');
    c.crouch = c.crouch || k.has('ControlLeft') || k.has('KeyC');
    c.reload = c.reload || this.pressedKeys.has('KeyR');
    c.use = c.use || this.pressedKeys.has('KeyE');
    c.nextWeapon = c.nextWeapon || this.wheel > 0 || this.pressedKeys.has('KeyQ');
    c.prevWeapon = c.prevWeapon || this.wheel < 0;
    for (let i = 1; i <= 9; i++) if (this.pressedKeys.has('Digit' + i)) c.slot = i - 1;
    c.scoreboard = c.scoreboard || k.has('Tab');
    c.pause = c.pause || this.pressedKeys.has('Escape') || this.pressedKeys.has('KeyP');
  }

  _readPad(c, index, dt) {
    const pad = this.pads().find((p) => p.index === index);
    if (!pad) return;
    const prev = this.padPrev.get(index) || [];
    const btn = (i) => !!pad.buttons[i]?.pressed;
    const pressed = (i) => btn(i) && !prev[i];
    const dz = (v, d = 0.18) => (Math.abs(v) < d ? 0 : Math.sign(v) * (Math.abs(v) - d) / (1 - d));
    const lx = dz(pad.axes[0] || 0), ly = dz(pad.axes[1] || 0);
    const rx = dz(pad.axes[2] || 0, 0.14), ry = dz(pad.axes[3] || 0, 0.14);
    c.moveX += lx; c.moveY += -ly;
    // Response curve: precise near centre, fast turns at full deflection.
    const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2.2);
    const speed = 3.6 * settings.padSens;
    c.lookX += -curve(rx) * speed * dt;
    c.lookY += -curve(ry) * speed * 0.7 * dt * (settings.invertY ? -1 : 1);
    if (rx || ry) c.analogLook = true;
    const rt = (pad.buttons[7]?.value ?? 0) > 0.3, lt = (pad.buttons[6]?.value ?? 0) > 0.3;
    const prt = !!prev[7], plt = !!prev[6];
    c.fire = c.fire || rt; c.firePressed = c.firePressed || (rt && !prt);
    c.fireAlt = c.fireAlt || lt; c.fireAltPressed = c.fireAltPressed || (lt && !plt);
    c.jump = c.jump || pressed(0);
    c.crouch = c.crouch || btn(1) || btn(10);
    c.reload = c.reload || pressed(2);
    c.use = c.use || pressed(2);
    c.nextWeapon = c.nextWeapon || pressed(3) || pressed(5);
    c.prevWeapon = c.prevWeapon || pressed(4);
    c.scoreboard = c.scoreboard || btn(8);
    c.pause = c.pause || pressed(9);
    c.usingPad = true;
  }

  /** Menu navigation from any pad: returns {up,down,left,right,accept,back}. */
  menuNav() {
    const r = { up: false, down: false, left: false, right: false, accept: false, back: false };
    for (const pad of this.pads()) {
      const prev = this.padPrev.get(pad.index) || [];
      const pressed = (i) => !!pad.buttons[i]?.pressed && !prev[i];
      r.up ||= pressed(12); r.down ||= pressed(13); r.left ||= pressed(14); r.right ||= pressed(15);
      r.accept ||= pressed(0) || pressed(9); r.back ||= pressed(1);
      // stick as d-pad with repeat handled by caller
      const ay = pad.axes[1] || 0, ax = pad.axes[0] || 0;
      const st = this._stick.get(pad.index) || { y: 0, x: 0 };
      if (ay < -0.6 && st.y >= -0.6) r.up = true;
      if (ay > 0.6 && st.y <= 0.6) r.down = true;
      if (ax < -0.6 && st.x >= -0.6) r.left = true;
      if (ax > 0.6 && st.x <= 0.6) r.right = true;
      this._stick.set(pad.index, { y: ay, x: ax });
    }
    return r;
  }
}
InputManager.prototype._stick = new Map();

export const input = new InputManager();
