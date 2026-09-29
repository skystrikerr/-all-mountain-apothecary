// Menus: DOM screens rendered into #menu-root, navigable with mouse, keyboard or gamepad (spatial nav).
import { CHARACTERS, CHARACTER_MAP } from '../content/characters.js';
import { CAMPAIGN } from '../content/campaign.js';
import { ARENAS, LEVELS } from '../content/levels/index.js';
import { MODE_INFO } from '../game/modes.js';
import { WEAPON_SETS, WEAPON_LIST } from '../content/weapons.js';
import { CHALLENGES, medalFor } from '../content/challenges.js';
import { DIFFICULTY } from '../game/mission.js';
import { settings, saveSettings, input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { fmtTime } from './hud.js';
import { CharacterPreview } from './preview.js';
import { Editor } from './editor.js';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const medal = (m) => `<span class="medal-icon ${m || 'none'}" title="${m || 'no medal'}"></span>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const faceStyle = (c) => { const l = c.look; return `background:linear-gradient(180deg, ${l.hatColor || l.hair || l.skin} 0 32%, ${l.skin} 32% 68%, ${l.top} 68%)`; };

const SKILLS = { easy: 0.2, normal: 0.45, hard: 0.7, expert: 0.92 };

export class Menu {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('menu-root');
    this.current = null;
    this.stack = [];
    this.focusEl = null;
    this.preview = null;
    this.editor = null;
    try { this.arcadeCfg = JSON.parse(localStorage.getItem('ts4.arcade') || 'null'); } catch { this.arcadeCfg = null; }
    this.arcadeCfg = Object.assign({
      mode: 'deathmatch', level: 'galleria', bots: 5, botSkill: 'normal', weaponSet: 'classic', scoreLimit: 15, timeLimit: 5,
      players: 1, teamSplit: 'coop', characters: ['ada', 'rook', 'vinnie', 'knight'], lives: 5, customBots: false, botList: [],
    }, this.arcadeCfg || {});
  }

  // ------------------------------------------------------------------ plumbing
  show(name, params = {}, push = true) {
    if (push && this.current && this.current.name !== name) this.stack.push(this.current);
    this._render(name, params);
  }

  back() {
    audio.play('menu');
    if (this.current?.name === 'pause') { this.app.resume(); return; }
    const prev = this.stack.pop();
    if (prev) this._render(prev.name, prev.params);
  }

  hide() {
    this.root.innerHTML = '';
    this.current = null;
    this.stack = [];
    this.preview?.dispose(); this.preview = null;
    this.editor?.dispose(); this.editor = null;
  }

  _render(name, params) {
    this.preview?.dispose(); this.preview = null;
    this.editor?.dispose(); this.editor = null;
    this.root.innerHTML = '';
    this.current = { name, params };
    const el = this[`screen_${name}`](params);
    this.root.appendChild(el);
    el.querySelectorAll('.btn, .card, .char').forEach((b) => b.addEventListener('mouseenter', () => audio.play('menu', null, 0.4)));
    el.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => this.back()));
    this.focusEl = null;
    const first = el.querySelector('[data-autofocus]') || el.querySelector('.btn:not(.back):not(:disabled), .card, .char');
    if (first) this._focus(first);
  }

  _focus(el) {
    if (this.focusEl) this.focusEl.classList.remove('focus');
    this.focusEl = el;
    if (el) { el.classList.add('focus'); el.focus({ preventScroll: false }); }
  }

  _focusables() {
    return [...this.root.querySelectorAll('.btn, .card, .char, select, input, .palette button')].filter((e) => e.offsetParent !== null && !e.disabled);
  }

  /** Called every frame while menus are visible (gamepad + keyboard navigation). */
  update(dt) {
    if (!this.current) return;
    if (this.editor) this.editor.update(dt);
    const nav = input.menuNav();
    if (input.pressedKeys.has('Escape') && this.current.name !== 'title') { this.back(); return; }
    if (this.current.name === 'title' && (nav.accept || input.pressedKeys.size > 0 || input.pressedMouse.size > 0)) {
      audio.init(); audio.play('select'); audio.playMusic('menu');
      this.show('main', {}, false);
      return;
    }
    if (nav.back) { this.back(); return; }
    const dir = nav.up ? 'up' : nav.down ? 'down' : nav.left ? 'left' : nav.right ? 'right' : null;
    const f = document.activeElement && this.root.contains(document.activeElement) ? document.activeElement : this.focusEl;
    if (dir) {
      if (f && (f.tagName === 'SELECT' || f.type === 'range') && (dir === 'left' || dir === 'right')) {
        this._adjust(f, dir === 'left' ? -1 : 1);
      } else this._moveFocus(f, dir);
    }
    if (nav.accept && f) {
      if (f.tagName === 'SELECT') this._adjust(f, 1);
      else if (f.type === 'checkbox') { f.checked = !f.checked; f.dispatchEvent(new Event('change', { bubbles: true })); }
      else f.click();
    }
  }

  _adjust(el, d) {
    if (el.tagName === 'SELECT') {
      el.selectedIndex = (el.selectedIndex + d + el.options.length) % el.options.length;
    } else {
      const step = parseFloat(el.step || '1');
      el.value = String(Math.min(parseFloat(el.max), Math.max(parseFloat(el.min), parseFloat(el.value) + step * d)));
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    audio.play('menu', null, 0.4);
  }

  _moveFocus(from, dir) {
    const list = this._focusables();
    if (list.length === 0) return;
    if (!from || !list.includes(from)) { this._focus(list[0]); return; }
    const r = from.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bestScore = Infinity;
    for (const e of list) {
      if (e === from) continue;
      const q = e.getBoundingClientRect();
      const x = q.left + q.width / 2 - cx, y = q.top + q.height / 2 - cy;
      let primary, secondary;
      if (dir === 'up') { primary = -y; secondary = Math.abs(x); }
      else if (dir === 'down') { primary = y; secondary = Math.abs(x); }
      else if (dir === 'left') { primary = -x; secondary = Math.abs(y); }
      else { primary = x; secondary = Math.abs(y); }
      if (primary <= 2) continue;
      const score = primary + secondary * 2.5;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) { this._focus(best); best.scrollIntoView({ block: 'nearest' }); audio.play('menu', null, 0.5); }
  }

  // ------------------------------------------------------------------ screens
  screen_title() {
    const el = h(`<div class="screen">
      <div class="logo"><div class="t1">TIMESPLITTERS</div><div class="t2">4</div><div class="t3">FAN-MADE THREE.JS PROTOTYPE</div></div>
      <div class="press-start">PRESS START</div>
      <div class="disclaimer">Unofficial, non-commercial fan project. Not affiliated with or endorsed by the TimeSplitters rights holders. All characters, levels and assets are original.</div>
    </div>`);
    el.addEventListener('click', () => { audio.init(); audio.play('select'); audio.playMusic('menu'); this.show('main', {}, false); });
    return el;
  }

  screen_main() {
    const el = h(`<div class="screen">
      <div class="logo" style="margin-bottom:10px"><div class="t1" style="font-size:clamp(34px,6vw,70px)">TIMESPLITTERS</div><div class="t2" style="font-size:clamp(24px,4vw,48px)">4</div></div>
      <div class="btn-col">
        <button class="btn" data-go="story">Story<small>Six eras. One crystal-hungry time villain.</small></button>
        <button class="btn" data-go="arcade">Arcade<small>Deathmatch, Capture the Bag, Infection and more — with bots & split-screen</small></button>
        <button class="btn" data-go="challenges">Challenges<small>Earn medals, unlock characters</small></button>
        <button class="btn" data-go="characters">Characters<small>${this.app.progress.unlockedList().length} / ${CHARACTERS.length} unlocked</small></button>
        <button class="btn" data-go="editor">Map Maker<small>Build your own arena and play it</small></button>
        <button class="btn" data-go="options">Options</button>
        <button class="btn" data-go="help">How to Play</button>
      </div>
    </div>`);
    el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { audio.play('select'); this.show(b.dataset.go); }));
    return el;
  }

  screen_story() {
    const p = this.app.progress.data.missions;
    const el = h(`<div class="screen">
      <div class="menu-title">STORY</div>
      <div class="menu-sub">The Rift King is scattering time crystals through history. Capt. Ada Voss and the Rift Corps must get them back — one era at a time.</div>
      <div class="cards">${CAMPAIGN.map((m) => `
        <button class="card ${m.playable ? '' : 'locked'}" style="--c:${m.color}" data-id="${m.id}">
          <div class="medal">${medal(p[m.id]?.medal)}</div>
          <div class="era">${m.era.toUpperCase()}</div>
          <div class="name">${m.title}</div>
          <div class="blurb">${m.blurb}</div>
          <div class="tag">${m.playable ? (p[m.id]?.bestTime ? `Best ${fmtTime(p[m.id].bestTime)}` : 'Playable') : 'In development'}</div>
        </button>`).join('')}
      </div>
      <div class="btn-row"><button class="btn back">Back</button></div>
    </div>`);
    el.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => {
      const m = CAMPAIGN.find((x) => x.id === c.dataset.id);
      if (!m.playable) { audio.play('empty'); c.querySelector('.tag').textContent = 'Coming in a future build!'; return; }
      audio.play('select');
      this.show('brief', { mission: m });
    }));
    return el;
  }

  screen_brief({ mission }) {
    const lvl = LEVELS[mission.level];
    const best = this.app.progress.data.missions[mission.id];
    const el = h(`<div class="screen">
      <div class="menu-title">${mission.title.toUpperCase()}</div>
      <div class="menu-sub">${mission.era}</div>
      <div class="panel">
        <div class="brief">${lvl.mission.brief.map((p) => `<p>${p}</p>`).join('')}</div>
        <h3>Objectives</h3>
        <ol style="font-family:Arial,sans-serif">${lvl.mission.objectives.map((o) => `<li>${o.text}</li>`).join('')}</ol>
        <div style="font-family:Arial,sans-serif;font-size:13px;opacity:.8">Medals: Bronze = Easy · Silver = Normal · Gold = Hard. ${best?.medal ? `Your best: ${medal(best.medal)}` : ''}</div>
      </div>
      <div class="btn-row">
        ${Object.entries(DIFFICULTY).map(([k, d]) => `<button class="btn go" data-diff="${k}">${d.name}</button>`).join('')}
        <button class="btn back">Back</button>
      </div>
    </div>`);
    el.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => {
      audio.play('select');
      this.app.startGame({ type: 'story', level: mission.level, missionId: mission.id, difficulty: b.dataset.diff,
        players: [{ character: 'ada', name: 'Ada', source: { kbm: true, pad: 0 } }], bots: [] });
    }));
    return el;
  }

  _charOptions(selected, includeRandom = true) {
    const unlocked = this.app.progress.unlockedList();
    return (includeRandom ? `<option value="random">? Random</option>` : '') +
      unlocked.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  }

  screen_arcade() {
    const c = this.arcadeCfg;
    const modes = Object.entries(MODE_INFO);
    const el = h(`<div class="screen">
      <div class="menu-title">ARCADE</div>
      <div class="panel">
        <div class="form">
          <label>Game mode</label><select data-k="mode">${modes.map(([k, m]) => `<option value="${k}" ${k === c.mode ? 'selected' : ''}>${m.name}</option>`).join('')}</select>
          <label></label><div class="mode-desc" style="font-family:Arial;font-size:13px;opacity:.85"></div>
          <label>Arena</label><select data-k="level">${ARENAS.map((a) => `<option value="${a.id}" ${a.id === c.level ? 'selected' : ''}>${a.name} (${a.era})</option>`).join('')}${this._customMapsOptions(c.level)}</select>
          <label>Weapon set</label><select data-k="weaponSet">${Object.entries(WEAPON_SETS).map(([k, s]) => `<option value="${k}" ${k === c.weaponSet ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
          <label>Local players</label><select data-k="players">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === c.players ? 'selected' : ''}>${n}${n > 1 ? ' (split-screen)' : ''}</option>`).join('')}</select>
          <label class="p-only">Split-screen teams</label><select class="p-only" data-k="teamSplit"><option value="coop" ${c.teamSplit === 'coop' ? 'selected' : ''}>Co-op (same team)</option><option value="versus" ${c.teamSplit === 'versus' ? 'selected' : ''}>Versus</option></select>
          ${[0, 1, 2, 3].map((i) => `<label class="pc pc${i}">Player ${i + 1} character</label><select class="pc pc${i}" data-char="${i}">${this._charOptions(c.characters[i])}</select>`).join('')}
          <label>Bots</label><div><input type="range" min="0" max="15" step="1" value="${c.bots}" data-k="bots"> <span class="value-tag" data-v="bots">${c.bots}</span></div>
          <label>Bot difficulty</label><select data-k="botSkill">${Object.keys(SKILLS).map((k) => `<option value="${k}" ${k === c.botSkill ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}<option value="mixed" ${c.botSkill === 'mixed' ? 'selected' : ''}>Mixed</option></select>
          <label>Customise bots</label><div><input type="checkbox" data-k="customBots" ${c.customBots ? 'checked' : ''}> pick each bot's character, skill and team</div>
          <label class="lim-score">Score limit</label><div class="lim-score"><input type="range" min="3" max="50" step="1" value="${c.scoreLimit}" data-k="scoreLimit"> <span class="value-tag" data-v="scoreLimit">${c.scoreLimit}</span></div>
          <label class="lim-lives">Lives</label><div class="lim-lives"><input type="range" min="1" max="10" step="1" value="${c.lives}" data-k="lives"> <span class="value-tag" data-v="lives">${c.lives}</span></div>
          <label class="lim-time">Time limit (min)</label><div class="lim-time"><input type="range" min="0" max="20" step="1" value="${c.timeLimit}" data-k="timeLimit"> <span class="value-tag" data-v="timeLimit">${c.timeLimit || '∞'}</span></div>
        </div>
        <div class="bot-list" style="margin-top:10px"></div>
        <div class="pad-warn" style="color:#ff8a6a;font-family:Arial;font-size:13px;margin-top:8px"></div>
      </div>
      <div class="btn-row"><button class="btn go" data-start>Start Match</button><button class="btn back">Back</button></div>
    </div>`);
    const refresh = () => {
      el.querySelector('.mode-desc').textContent = MODE_INFO[c.mode].desc;
      el.querySelectorAll('.p-only').forEach((e) => { e.style.display = c.players > 1 && MODE_INFO[c.mode].teams ? '' : 'none'; });
      el.querySelectorAll('.pc').forEach((e) => { const i = +[...e.classList].find((x) => /^pc\d$/.test(x)).slice(2); e.style.display = i < c.players ? '' : 'none'; });
      el.querySelectorAll('.lim-score').forEach((e) => { e.style.display = ['deathmatch', 'teamdeathmatch', 'capturebag'].includes(c.mode) ? '' : 'none'; });
      el.querySelectorAll('.lim-lives').forEach((e) => { e.style.display = c.mode === 'elimination' ? '' : 'none'; });
      el.querySelectorAll('.lim-time').forEach((e) => { e.style.display = ['elimination', 'survival'].includes(c.mode) ? 'none' : ''; });
      el.querySelector('[data-v=timeLimit]').textContent = c.timeLimit || '∞';
      const pads = input.pads().length;
      el.querySelector('.pad-warn').textContent = c.players > 1 && pads < c.players - 1
        ? `Split-screen: player 1 uses keyboard & mouse, players 2+ need a gamepad each. ${pads} gamepad(s) detected — press a button on each controller.` : '';
      this._botList(el.querySelector('.bot-list'), c);
    };
    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.k) {
        const v = t.type === 'checkbox' ? t.checked : t.type === 'range' || t.dataset.k === 'players' ? +t.value : t.value;
        c[t.dataset.k] = v;
        const tag = el.querySelector(`[data-v=${t.dataset.k}]`);
        if (tag) tag.textContent = v;
      }
      if (t.dataset.char) c.characters[+t.dataset.char] = t.value;
      refresh();
    });
    el.addEventListener('change', (e) => { if (e.target.type === 'checkbox') { c[e.target.dataset.k] = e.target.checked; refresh(); } });
    el.querySelector('[data-start]').addEventListener('click', () => { audio.play('select'); this._startArcade(); });
    refresh();
    return el;
  }

  _customMapsOptions(sel) {
    const maps = Editor.savedMaps();
    return maps.map((m, i) => `<option value="map:${i}" ${sel === `map:${i}` ? 'selected' : ''}>★ ${esc(m.name)} (Map Maker)</option>`).join('');
  }

  _botList(container, c) {
    if (!c.customBots || c.bots === 0) { container.innerHTML = ''; return; }
    while (c.botList.length < c.bots) c.botList.push({ character: 'random', skill: c.botSkill === 'mixed' ? 'normal' : c.botSkill, team: 'auto' });
    const teams = MODE_INFO[c.mode].teams;
    const all = CHARACTERS.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    container.innerHTML = `<h3>Bots</h3><div class="form" style="grid-template-columns:60px 1fr 120px ${teams ? '100px' : ''}">` +
      c.botList.slice(0, c.bots).map((b, i) => `
        <label>#${i + 1}</label>
        <select data-bot="${i}" data-f="character"><option value="random">? Random</option>${all}</select>
        <select data-bot="${i}" data-f="skill">${Object.keys(SKILLS).map((k) => `<option value="${k}">${k}</option>`).join('')}</select>
        ${teams ? `<select data-bot="${i}" data-f="team"><option value="auto">Auto</option><option value="0">Red</option><option value="1">Blue</option></select>` : ''}`).join('') + '</div>';
    container.querySelectorAll('select[data-bot]').forEach((s) => {
      const b = c.botList[+s.dataset.bot];
      s.value = b[s.dataset.f];
      s.addEventListener('change', () => { b[s.dataset.f] = s.value; });
      s.addEventListener('input', (e) => e.stopPropagation());
    });
  }

  _assignInputs(n) {
    const pads = input.pads().map((p) => p.index);
    const out = [];
    if (n === 1) return [{ kbm: true, pad: pads[0] ?? 0 }];
    if (pads.length >= n) { for (let i = 0; i < n; i++) out.push({ kbm: i === 0, pad: pads[i] }); }
    else { out.push({ kbm: true, pad: -1 }); for (let i = 1; i < n; i++) out.push({ kbm: false, pad: pads[i - 1] ?? -1 }); }
    return out;
  }

  _startArcade() {
    const c = this.arcadeCfg;
    try { localStorage.setItem('ts4.arcade', JSON.stringify(c)); } catch { /* ignore */ }
    const unlocked = this.app.progress.unlockedList();
    const pick = (id) => (id === 'random' ? unlocked[Math.floor(Math.random() * unlocked.length)].id : id);
    const srcs = this._assignInputs(c.players);
    const players = srcs.map((source, i) => ({ character: pick(c.characters[i] || 'random'), name: c.players > 1 ? `P${i + 1}` : 'You', source }));
    const bots = [];
    for (let i = 0; i < c.bots; i++) {
      const custom = c.customBots ? c.botList[i] : null;
      const skillKey = custom ? custom.skill : (c.botSkill === 'mixed' ? Object.keys(SKILLS)[i % 4] : c.botSkill);
      const character = custom && custom.character !== 'random' ? custom.character : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
      bots.push({ character, skill: SKILLS[skillKey] + (Math.random() - 0.5) * 0.08, team: custom && custom.team !== 'auto' ? +custom.team : undefined });
    }
    const cfg = { type: 'arcade', mode: c.mode, level: c.level, weaponSet: c.weaponSet, scoreLimit: c.scoreLimit,
      timeLimit: c.timeLimit, lives: c.lives, teamSplit: c.teamSplit, players, bots };
    if (c.level.startsWith('map:')) { cfg.customMap = Editor.savedMaps()[+c.level.slice(4)]; cfg.level = 'custom'; }
    if (c.mode === 'capturebag') cfg.scoreLimit = Math.min(c.scoreLimit, 10);
    this.app.startGame(cfg);
  }

  screen_challenges() {
    const d = this.app.progress.data.challenges;
    const el = h(`<div class="screen">
      <div class="menu-title">CHALLENGES</div>
      <div class="cards">${CHALLENGES.map((ch) => `
        <button class="card" data-id="${ch.id}" style="--c:#7a2aff">
          <div class="medal">${medal(d[ch.id]?.medal)}</div>
          <div class="name">${ch.name}</div>
          <div class="blurb">${ch.desc}</div>
          <div class="tag">Bronze ${ch.display ? ch.display(ch.thresholds.bronze) : ch.thresholds.bronze} · Silver ${ch.display ? ch.display(ch.thresholds.silver) : ch.thresholds.silver} · Gold ${ch.display ? ch.display(ch.thresholds.gold) : ch.thresholds.gold} ${ch.unit}${d[ch.id]?.best != null ? ` · Best ${ch.display ? ch.display(d[ch.id].best) : d[ch.id].best}` : ''}</div>
        </button>`).join('')}</div>
      <div class="btn-row"><button class="btn back">Back</button></div>
    </div>`);
    el.querySelectorAll('.card').forEach((card) => card.addEventListener('click', () => {
      const ch = CHALLENGES.find((x) => x.id === card.dataset.id);
      audio.play('select');
      const cfg = JSON.parse(JSON.stringify({ ...ch.config, metric: undefined }));
      this.app.startGame({ type: 'challenge', challengeId: ch.id, ...cfg, players: [{ character: this.arcadeCfg.characters[0] === 'random' ? 'ada' : this.arcadeCfg.characters[0], name: 'You', source: { kbm: true, pad: input.pads()[0]?.index ?? 0 } }] });
    }));
    return el;
  }

  screen_characters() {
    const prog = this.app.progress;
    const el = h(`<div class="screen">
      <div class="menu-title">CHARACTERS</div>
      <div class="panel">
        <div class="roster">${CHARACTERS.map((c) => {
          const un = prog.isUnlocked(c);
          return `<button class="char ${un ? '' : 'locked'}" data-id="${c.id}"><div class="face" style="${faceStyle(c)}"></div>${un ? esc(c.name) : '???'}</button>`;
        }).join('')}</div>
        <div class="char-detail"><canvas width="360" height="360"></canvas><div class="info"></div></div>
      </div>
      <div class="btn-row"><button class="btn back">Back</button></div>
    </div>`);
    const canvas = el.querySelector('canvas');
    const info = el.querySelector('.info');
    this.preview = new CharacterPreview(canvas);
    const select = (id) => {
      const c = CHARACTER_MAP[id];
      const un = prog.isUnlocked(c);
      el.querySelectorAll('.char').forEach((x) => x.classList.toggle('sel', x.dataset.id === id));
      this.preview.setCharacter(c, !un);
      info.innerHTML = un
        ? `<b>${esc(c.name)}</b><div style="color:#29f0ff">${esc(c.era)}</div><p>${esc(c.bio)}</p><div style="font-size:12px;opacity:.8">Speed ${Math.round(c.stats.speed * 100)}% · Size ${Math.round(c.stats.size * 100)}%</div>`
        : `<b>LOCKED</b><div style="color:#29f0ff">${esc(c.era)}</div><p>${esc(prog.unlockText(c))}</p>`;
    };
    el.querySelectorAll('.char').forEach((b) => {
      b.addEventListener('click', () => select(b.dataset.id));
      b.addEventListener('focus', () => select(b.dataset.id));
    });
    setTimeout(() => select(CHARACTERS[0].id), 0);
    return el;
  }

  screen_options() {
    const s = settings;
    const v = audio.volume;
    const el = h(`<div class="screen">
      <div class="menu-title">OPTIONS</div>
      <div class="panel" style="max-width:640px">
        <div class="form">
          <label>Mouse sensitivity</label><div><input type="range" min="0.2" max="3" step="0.1" value="${s.mouseSens}" data-s="mouseSens"> <span class="value-tag">${s.mouseSens}</span></div>
          <label>Stick sensitivity</label><div><input type="range" min="0.3" max="2.5" step="0.1" value="${s.padSens}" data-s="padSens"> <span class="value-tag">${s.padSens}</span></div>
          <label>Field of view</label><div><input type="range" min="60" max="110" step="1" value="${s.fov}" data-s="fov"> <span class="value-tag">${s.fov}</span></div>
          <label>Invert Y</label><div><input type="checkbox" data-s="invertY" ${s.invertY ? 'checked' : ''}></div>
          <label>Controller auto-aim</label><div><input type="checkbox" data-s="aimAssist" ${s.aimAssist ? 'checked' : ''}></div>
          <label>PS2 pixel mode</label><div><input type="checkbox" data-s="pixelMode" ${s.pixelMode ? 'checked' : ''}> low-res render, chunky pixels</div>
          <label>Show FPS</label><div><input type="checkbox" data-s="showFps" ${s.showFps ? 'checked' : ''}></div>
          <label>Master volume</label><div><input type="range" min="0" max="1" step="0.05" value="${v.master}" data-a="master"> <span class="value-tag">${v.master}</span></div>
          <label>Music volume</label><div><input type="range" min="0" max="1" step="0.05" value="${v.music}" data-a="music"> <span class="value-tag">${v.music}</span></div>
          <label>Effects volume</label><div><input type="range" min="0" max="1" step="0.05" value="${v.sfx}" data-a="sfx"> <span class="value-tag">${v.sfx}</span></div>
          <label>Unlock everything</label><div><input type="checkbox" data-cheat ${this.app.progress.unlockAll ? 'checked' : ''}> (testing cheat, this session only)</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn small" data-reset>Reset progress</button><button class="btn back">Back</button></div>
    </div>`);
    const apply = (e) => {
      const t = e.target;
      const val = t.type === 'checkbox' ? t.checked : parseFloat(t.value);
      if (t.dataset.s) { s[t.dataset.s] = val; saveSettings(); this.app.applySettings(); }
      if (t.dataset.a) { v[t.dataset.a] = val; audio.applyVolume(); try { localStorage.setItem('ts4.volume', JSON.stringify(v)); } catch { /* ignore */ } }
      if (t.dataset.cheat != null) this.app.progress.unlockAll = val;
      const tag = t.parentElement.querySelector('.value-tag');
      if (tag) tag.textContent = val;
    };
    el.addEventListener('input', apply);
    el.addEventListener('change', apply);
    el.querySelector('[data-reset]').addEventListener('click', (e) => {
      if (e.target.dataset.confirm) { this.app.progress.reset(); e.target.textContent = 'Progress reset'; }
      else { e.target.dataset.confirm = '1'; e.target.textContent = 'Press again to confirm'; }
    });
    return el;
  }

  screen_help() {
    const el = h(`<div class="screen">
      <div class="menu-title">HOW TO PLAY</div>
      <div class="panel help-grid">
        <div><h3>Keyboard & Mouse</h3><table>
          <tr><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td><td>Move</td></tr>
          <tr><td>Mouse</td><td>Look (click the game to capture the mouse)</td></tr>
          <tr><td>Left click</td><td>Fire (right-hand gun)</td></tr>
          <tr><td>Right click</td><td>Fire left-hand gun when dual-wielding · zoom with scoped weapons</td></tr>
          <tr><td><kbd>Space</kbd></td><td>Jump</td></tr>
          <tr><td><kbd>Ctrl</kbd> / <kbd>C</kbd></td><td>Crouch</td></tr>
          <tr><td><kbd>R</kbd></td><td>Reload</td></tr>
          <tr><td><kbd>Q</kbd> / wheel / <kbd>1</kbd>-<kbd>9</kbd></td><td>Switch weapon</td></tr>
          <tr><td><kbd>Tab</kbd></td><td>Scores</td></tr>
          <tr><td><kbd>Esc</kbd> / <kbd>P</kbd></td><td>Pause</td></tr>
        </table></div>
        <div><h3>Controller</h3><table>
          <tr><td>Left stick</td><td>Move</td></tr>
          <tr><td>Right stick</td><td>Look (with optional auto-aim)</td></tr>
          <tr><td>RT</td><td>Fire (right hand)</td></tr>
          <tr><td>LT</td><td>Fire left hand / zoom</td></tr>
          <tr><td>A</td><td>Jump</td></tr>
          <tr><td>B / L3</td><td>Crouch</td></tr>
          <tr><td>X</td><td>Reload</td></tr>
          <tr><td>Y / RB / LB</td><td>Next / previous weapon</td></tr>
          <tr><td>Back</td><td>Scores</td></tr>
          <tr><td>Start</td><td>Pause</td></tr>
        </table></div>
        <div><h3>Tips</h3><ul>
          <li><b>Dual-wield:</b> pick up a second pistol, SMG or other one-handed gun to carry one in each hand.</li>
          <li><b>Headshots</b> do double (or more) damage. The crosshair turns red over an enemy.</li>
          <li>Enemies drop their weapons. Grab health (red) and armour (blue) pads.</li>
          <li>In Story mode, the yellow ◆ marker points to your objective. Completing an objective saves a checkpoint.</li>
          <li>Split-screen: player 1 uses keyboard/mouse (and a pad if enough are connected); every other player needs a gamepad.</li>
        </ul></div>
        <div><h3>Weapons (${WEAPON_LIST.length})</h3><div style="columns:2;font-size:12px">${WEAPON_LIST.map((w) => `<div>${w.name} <span style="opacity:.6">${w.era}</span></div>`).join('')}</div></div>
      </div>
      <div class="btn-row"><button class="btn back">Back</button></div>
    </div>`);
    return el;
  }

  screen_editor() {
    const el = h(`<div class="screen"><div class="menu-title">MAP MAKER</div><div class="editor-host" style="width:100%;display:flex;justify-content:center"></div>
      <div class="btn-row"><button class="btn back">Back</button></div></div>`);
    this.editor = new Editor(el.querySelector('.editor-host'), this.app);
    return el;
  }

  screen_pause() {
    const g = this.app.game;
    const isStory = g?.config.type === 'story';
    const el = h(`<div class="screen overlay">
      <div class="menu-title">PAUSED</div>
      ${isStory ? `<div class="menu-sub">Objective: ${esc(g.mode.objectiveText())}</div>` : `<div class="menu-sub">${g.mode.name} · ${g.levelDef.name}</div>`}
      <div class="btn-col">
        <button class="btn" data-a="resume">Resume</button>
        ${isStory ? '<button class="btn" data-a="checkpoint">Restart from checkpoint</button>' : ''}
        <button class="btn" data-a="restart">Restart</button>
        <button class="btn" data-a="options">Options</button>
        <button class="btn" data-a="quit">Quit to menu</button>
      </div>
    </div>`);
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      audio.play('select');
      const a = b.dataset.a;
      if (a === 'resume') this.app.resume();
      if (a === 'checkpoint') { this.app.game.mode.retryFromCheckpoint(); this.app.resume(); }
      if (a === 'restart') this.app.restart();
      if (a === 'options') this.show('options');
      if (a === 'quit') this.app.quitToMenu();
    }));
    return el;
  }

  screen_failed() {
    const el = h(`<div class="screen overlay">
      <div class="menu-title" style="filter:hue-rotate(-40deg) drop-shadow(3px 3px 0 #2a0a50)">MISSION FAILED</div>
      <div class="btn-col">
        <button class="btn go" data-a="checkpoint">Retry from checkpoint</button>
        <button class="btn" data-a="restart">Restart mission</button>
        <button class="btn" data-a="quit">Quit to menu</button>
      </div>
    </div>`);
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      audio.play('select');
      if (b.dataset.a === 'checkpoint') { this.app.game.mode.retryFromCheckpoint(); this.app.resume(); }
      if (b.dataset.a === 'restart') this.app.restart();
      if (b.dataset.a === 'quit') this.app.quitToMenu();
    }));
    return el;
  }

  screen_results({ results: r, unlocks, challengeInfo }) {
    const statsRow = (x, i) => `<tr class="${x.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td>${esc(x.name)}</td><td>${x.score}</td><td>${x.kills}</td><td>${x.deaths}</td><td>${Math.round(x.accuracy * 100)}%</td><td>${x.headshots}</td></tr>`;
    const isStory = r.type === 'story';
    const me = r.ranking.find((x) => x.isPlayer) || r.ranking[0];
    const el = h(`<div class="screen">
      <div class="menu-title">${esc(r.winnerText)}</div>
      <div class="menu-sub">${isStory ? `${esc(r.level)} · ${DIFFICULTY[r.difficulty]?.name ?? ''}` : `${esc(r.modeName)} · ${esc(r.level)}`}</div>
      <div class="panel" style="max-width:820px">
        ${isStory ? `
          <div style="display:flex;gap:20px;align-items:center;font-size:18px">
            <div style="transform:scale(2.2);margin:10px 24px">${medal(r.medal)}</div>
            <div>Time <b>${fmtTime(r.time)}</b><br>Kills <b>${me.kills}</b> · Headshots <b>${me.headshots}</b><br>Accuracy <b>${Math.round(me.accuracy * 100)}%</b></div>
          </div>` : ''}
        ${challengeInfo ? `<div style="display:flex;gap:16px;align-items:center;font-size:18px;margin-bottom:10px"><div style="transform:scale(2);margin:8px 20px">${medal(challengeInfo.medal)}</div><div>${esc(challengeInfo.name)}<br>Result: <b>${challengeInfo.display}</b> ${challengeInfo.unit}</div></div>` : ''}
        ${r.teams ? `<h3 style="text-align:center"><span style="color:#ff3b3b">RED ${r.teamScores[0]}</span> — <span style="color:#3b8bff">${r.teamScores[1]} BLUE</span></h3>` : ''}
        ${!isStory ? `<table class="results"><tr><th>#</th><th>Name</th><th>Score</th><th>Kills</th><th>Deaths</th><th>Acc.</th><th>HS</th></tr>${r.ranking.slice(0, 16).map(statsRow).join('')}</table>` : ''}
        ${r.awards?.length ? `<div class="awards">${r.awards.map(([t, n, d]) => `<div class="award"><b>${t}</b>${esc(n)} <span style="opacity:.8">— ${d}</span></div>`).join('')}</div>` : ''}
        ${(unlocks || []).map((c) => `<div class="unlock-pop">NEW CHARACTER UNLOCKED: <b>${esc(c.name)}</b></div>`).join('')}
      </div>
      <div class="btn-row"><button class="btn go" data-a="again">${isStory ? 'Replay mission' : 'Play again'}</button><button class="btn" data-a="menu">Continue</button></div>
    </div>`);
    el.querySelector('[data-a=again]').addEventListener('click', () => { audio.play('select'); this.app.restart(); });
    el.querySelector('[data-a=menu]').addEventListener('click', () => {
      audio.play('select');
      this.app.quitToMenu(isStory ? 'story' : r.type === 'challenge' ? 'challenges' : 'arcade');
    });
    return el;
  }
}

export { medalFor };
