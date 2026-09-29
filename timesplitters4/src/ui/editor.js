// Map Maker: a TimeSplitters-style tile editor. Paint tiles & items on a grid, save to localStorage,
// export/import JSON, and test-play instantly against bots.
import { TILES, ITEMS, THEMES, defaultMap, validateMap } from '../content/levels/custom.js';
import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';

const KEY = 'ts4.maps';
const CELL = 32;

export class Editor {
  static savedMaps() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  static saveMaps(maps) { try { localStorage.setItem(KEY, JSON.stringify(maps)); } catch { /* ignore */ } }

  constructor(host, app) {
    this.app = app;
    this.map = app.editorMap || defaultMap();
    this.slot = app.editorSlot ?? -1;
    this.brush = { kind: 'tile', id: 2 };
    this.cursor = { x: 1, z: 1 };
    this.painting = false;
    this.root = document.createElement('div');
    this.root.className = 'editor';
    host.appendChild(this.root);
    this._build();
    this.draw();
  }

  _build() {
    const r = this.root;
    r.innerHTML = `
      <div class="panel palette-panel"><h3>Tiles</h3><div class="palette tiles"></div><h3 style="margin-top:10px">Items</h3><div class="palette items"></div>
        <div style="font-family:Arial;font-size:11px;opacity:.75;margin-top:8px">Left-drag paints · right-click erases items / clears to floor · gamepad: D-pad moves, A paints, LB/RB change brush</div></div>
      <canvas></canvas>
      <div class="panel">
        <h3>Map</h3>
        <div class="form" style="grid-template-columns:1fr">
          <input type="text" class="name" maxlength="24">
          <select class="theme">${Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('')}</select>
          <label>Size</label>
          <select class="size">${[8, 10, 12, 14, 16, 20, 24].map((n) => `<option value="${n}">${n} × ${n} tiles (${n * 4}m)</option>`).join('')}</select>
          <label>Saved maps</label>
          <select class="slots"></select>
        </div>
        <div class="btn-row" style="justify-content:flex-start">
          <button class="btn small go" data-a="play">Test Play</button>
          <button class="btn small" data-a="save">Save</button>
          <button class="btn small" data-a="new">New</button>
          <button class="btn small" data-a="delete">Delete</button>
          <button class="btn small" data-a="export">Export</button>
          <button class="btn small" data-a="import">Import</button>
        </div>
        <div class="problems"></div>
        <input type="file" accept=".json,application/json" style="display:none">
      </div>`;
    this.canvas = r.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    const tiles = r.querySelector('.tiles'), items = r.querySelector('.items');
    for (const t of TILES) tiles.appendChild(this._paletteBtn('tile', t.id, t.name, t.color, ''));
    for (const it of ITEMS) items.appendChild(this._paletteBtn('item', it.id, it.name, it.color, it.glyph));
    items.appendChild(this._paletteBtn('item', 'erase', 'Erase item', '#444', '×'));
    this._syncPalette();
    const name = r.querySelector('.name'), theme = r.querySelector('.theme'), size = r.querySelector('.size');
    name.value = this.map.name; theme.value = this.map.theme; size.value = String(this.map.w);
    name.addEventListener('input', () => { this.map.name = name.value || 'Untitled'; });
    theme.addEventListener('change', () => { this.map.theme = theme.value; });
    size.addEventListener('change', () => this._resize(+size.value));
    this._refreshSlots();
    r.querySelector('.slots').addEventListener('change', (e) => {
      const i = +e.target.value;
      if (i >= 0) { this.map = JSON.parse(JSON.stringify(Editor.savedMaps()[i])); this.slot = i; name.value = this.map.name; theme.value = this.map.theme; size.value = String(this.map.w); this.draw(); }
    });
    r.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => this._action(b.dataset.a)));
    r.querySelector('input[type=file]').addEventListener('change', (e) => this._import(e.target.files[0]));
    const cell = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / rect.width * this.map.w);
      const z = Math.floor((e.clientY - rect.top) / rect.height * this.map.h);
      return { x, z };
    };
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mousedown', (e) => { this.painting = e.button === 0 ? 'paint' : 'erase'; const c = cell(e); this.cursor = c; this._apply(c.x, c.z, this.painting === 'erase'); });
    this.canvas.addEventListener('mousemove', (e) => { const c = cell(e); this.cursor = c; if (this.painting) this._apply(c.x, c.z, this.painting === 'erase'); this.draw(); });
    this._up = () => { this.painting = false; };
    window.addEventListener('mouseup', this._up);
  }

  _paletteBtn(kind, id, label, color, glyph) {
    const b = document.createElement('button');
    b.dataset.kind = kind; b.dataset.id = id;
    b.innerHTML = `<span class="sw" style="background:${color}">${glyph}</span>${label}`;
    b.addEventListener('click', () => { this.brush = { kind, id: kind === 'tile' ? +id : id }; this._syncPalette(); audio.play('menu'); });
    return b;
  }

  _syncPalette() {
    this.root.querySelectorAll('.palette button').forEach((b) => {
      const id = b.dataset.kind === 'tile' ? +b.dataset.id : b.dataset.id;
      b.classList.toggle('sel', b.dataset.kind === this.brush.kind && id === this.brush.id);
    });
  }

  _refreshSlots() {
    const maps = Editor.savedMaps();
    const s = this.root.querySelector('.slots');
    s.innerHTML = `<option value="-1">— unsaved —</option>` + maps.map((m, i) => `<option value="${i}">${m.name}</option>`).join('');
    s.value = String(this.slot);
  }

  _resize(n) {
    const old = this.map;
    const tiles = new Array(n * n).fill(1);
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
      if (x === 0 || z === 0 || x === n - 1 || z === n - 1) tiles[z * n + x] = 2;
      else if (x < old.w - 1 && z < old.h - 1) tiles[z * n + x] = old.tiles[z * old.w + x];
    }
    this.map = { ...old, w: n, h: n, tiles, items: old.items.filter((i) => i.x < n - 1 && i.z < n - 1) };
    this.draw();
  }

  _apply(x, z, erase) {
    const m = this.map;
    if (x < 0 || z < 0 || x >= m.w || z >= m.h) return;
    const idx = z * m.w + x;
    if (erase) {
      const before = m.items.length;
      m.items = m.items.filter((i) => !(i.x === x && i.z === z));
      if (m.items.length === before) m.tiles[idx] = 1;
    } else if (this.brush.kind === 'tile') {
      m.tiles[idx] = this.brush.id;
    } else if (this.brush.id === 'erase') {
      m.items = m.items.filter((i) => !(i.x === x && i.z === z));
    } else {
      const unique = this.brush.id === 'baseRed' || this.brush.id === 'baseBlue';
      if (unique) m.items = m.items.filter((i) => i.type !== this.brush.id);
      m.items = m.items.filter((i) => !(i.x === x && i.z === z));
      m.items.push({ type: this.brush.id, x, z });
    }
    this.draw();
  }

  _action(a) {
    audio.play('select');
    const maps = Editor.savedMaps();
    if (a === 'save') {
      if (this.slot >= 0 && this.slot < maps.length) maps[this.slot] = this.map;
      else { maps.push(this.map); this.slot = maps.length - 1; }
      Editor.saveMaps(maps);
      this._refreshSlots();
      this._msg(`Saved "${this.map.name}".`);
    } else if (a === 'new') {
      this.map = defaultMap(); this.slot = -1;
      this.root.querySelector('.name').value = this.map.name;
      this.root.querySelector('.theme').value = this.map.theme;
      this.root.querySelector('.size').value = String(this.map.w);
      this._refreshSlots(); this.draw();
    } else if (a === 'delete') {
      if (this.slot >= 0) { maps.splice(this.slot, 1); Editor.saveMaps(maps); this.slot = -1; this._refreshSlots(); this._msg('Deleted.'); }
    } else if (a === 'export') {
      const blob = new Blob([JSON.stringify(this.map)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${this.map.name.replace(/\W+/g, '_') || 'map'}.ts4map.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (a === 'import') {
      this.root.querySelector('input[type=file]').click();
    } else if (a === 'play') {
      const problems = validateMap(this.map);
      if (problems.length) { this._msg(problems.join('<br>')); return; }
      this.app.editorMap = this.map;
      this.app.editorSlot = this.slot;
      this.app.startGame({
        type: 'arcade', mode: 'deathmatch', level: 'custom', customMap: JSON.parse(JSON.stringify(this.map)), weaponSet: 'classic',
        scoreLimit: 10, timeLimit: 5, fromEditor: true,
        players: [{ character: 'ada', name: 'You', source: { kbm: true, pad: input.pads()[0]?.index ?? 0 } }],
        bots: [0, 1, 2].map(() => ({ character: ['vinnie', 'knight', 'ninja', 'marine', 'skater'][Math.floor(Math.random() * 5)], skill: 0.45 })),
      });
    }
  }

  async _import(file) {
    if (!file) return;
    try {
      const m = JSON.parse(await file.text());
      if (!m.tiles || !m.w || !m.h || !Array.isArray(m.items)) throw new Error('not a map');
      this.map = m; this.slot = -1; this.draw(); this._refreshSlots();
      this.root.querySelector('.name').value = m.name || 'Imported';
      this._msg('Imported.');
    } catch { this._msg('Could not read that file.'); }
  }

  _msg(html) { this.root.querySelector('.problems').innerHTML = html; }

  update() {
    // Gamepad / arrow-key cursor
    const nav = input.menuNav();
    let moved = false;
    const k = input.pressedKeys;
    if (nav.left || k.has('ArrowLeft')) { this.cursor.x = Math.max(0, this.cursor.x - 1); moved = true; }
    if (nav.right || k.has('ArrowRight')) { this.cursor.x = Math.min(this.map.w - 1, this.cursor.x + 1); moved = true; }
    if (nav.up || k.has('ArrowUp')) { this.cursor.z = Math.max(0, this.cursor.z - 1); moved = true; }
    if (nav.down || k.has('ArrowDown')) { this.cursor.z = Math.min(this.map.h - 1, this.cursor.z + 1); moved = true; }
    const pads = input.pads();
    const held = pads.some((p) => p.buttons[0]?.pressed) || k.has('Enter');
    if (held || (moved && pads.some((p) => p.buttons[0]?.pressed))) this._apply(this.cursor.x, this.cursor.z, false);
    for (const p of pads) {
      const prev = input.padPrev.get(p.index) || [];
      const cyc = (d) => {
        const all = [...TILES.map((t) => ({ kind: 'tile', id: t.id })), ...ITEMS.map((i) => ({ kind: 'item', id: i.id }))];
        let i = all.findIndex((b) => b.kind === this.brush.kind && b.id === this.brush.id);
        i = (i + d + all.length) % all.length;
        this.brush = all[i]; this._syncPalette();
      };
      if (p.buttons[5]?.pressed && !prev[5]) cyc(1);
      if (p.buttons[4]?.pressed && !prev[4]) cyc(-1);
    }
    if (moved) this.draw();
  }

  draw() {
    const m = this.map, c = this.canvas, ctx = this.ctx;
    c.width = m.w * CELL; c.height = m.h * CELL;
    for (let z = 0; z < m.h; z++) for (let x = 0; x < m.w; x++) {
      const t = TILES[m.tiles[z * m.w + x]] || TILES[0];
      ctx.fillStyle = t.color;
      ctx.fillRect(x * CELL, z * CELL, CELL, CELL);
      if (t.id === 3) { ctx.fillStyle = '#6a3a1a'; ctx.fillRect(x * CELL + 8, z * CELL + 8, 16, 16); }
      if (t.id === 6) { ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(x * CELL + 16, z * CELL + 16, 7, 0, Math.PI * 2); ctx.fill(); }
      if (t.id === 7) { ctx.fillStyle = '#e0c060'; ctx.fillRect(x * CELL, z * CELL, CELL, 8); ctx.fillRect(x * CELL, z * CELL + 24, CELL, 8); }
      if (t.id === 8) { ctx.fillStyle = '#fff8'; ctx.beginPath(); ctx.arc(x * CELL + 16, z * CELL + 16, 5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i <= m.w; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, m.h * CELL); ctx.stroke(); }
    for (let i = 0; i <= m.h; i++) { ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(m.w * CELL, i * CELL); ctx.stroke(); }
    for (const it of m.items) {
      const d = ITEMS.find((i) => i.id === it.type);
      if (!d) continue;
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(it.x * CELL + 16, it.z * CELL + 16, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.glyph, it.x * CELL + 16, it.z * CELL + 17);
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(this.cursor.x * CELL + 1, this.cursor.z * CELL + 1, CELL - 2, CELL - 2);
    ctx.lineWidth = 1;
  }

  dispose() {
    window.removeEventListener('mouseup', this._up);
    this.app.editorMap = this.map;
    this.app.editorSlot = this.slot;
  }
}
