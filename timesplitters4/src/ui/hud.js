// DOM HUD, one panel per local player viewport. Updates are diffed so the DOM is only touched on change.
import * as THREE from 'three';
import { TEAM_COLORS } from '../game/actor.js';

const _v = new THREE.Vector3();

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export class Hud {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.container = el('div', 'hud', root);
    this.panels = game.views.map((v) => this._makePanel(v));
    this.centerQueue = [];
    this.centerT = 0;
    this.feedItems = [];
  }

  _makePanel(v) {
    const l = v.layout;
    const p = el('div', 'hud-panel', this.container);
    Object.assign(p.style, { left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, height: `${l.h * 100}%` });
    if (this.game.views.length > 1) p.classList.add('split');
    const ui = {
      root: p,
      scope: el('div', 'hud-scope', p, '<div class="scope-ring"></div><div class="scope-h"></div><div class="scope-v"></div>'),
      vignette: el('div', 'hud-vignette', p),
      dirs: el('div', 'hud-dirs', p),
      cross: el('div', 'hud-cross', p, '<i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><b></b>'),
      hit: el('div', 'hud-hit', p, '<i></i><i></i><i></i><i></i>'),
      top: el('div', 'hud-top', p, '<span class="hud-mode"></span><span class="hud-timer"></span>'),
      objective: el('div', 'hud-objective', p),
      feed: el('div', 'hud-feed', p),
      center: el('div', 'hud-center', p),
      notify: el('div', 'hud-notify', p),
      marker: el('div', 'hud-marker', p, '<span>◆</span><small></small>'),
      status: el('div', 'hud-status', p, `
        <div class="hud-portrait"></div>
        <div class="hud-bars">
          <div class="bar health"><div class="fill"></div><span></span></div>
          <div class="bar armor"><div class="fill"></div><span></span></div>
        </div>`),
      ammo: el('div', 'hud-ammo', p, '<div class="wname"></div><div class="count"><span class="l"></span><span class="clip"></span><span class="res"></span></div><div class="reload">RELOADING</div>'),
      radar: el('canvas', 'hud-radar', p),
      dead: el('div', 'hud-dead', p),
      board: el('div', 'hud-board', p),
      cache: {},
    };
    ui.timer = ui.top.querySelector('.hud-timer');
    ui.mode = ui.top.querySelector('.hud-mode');
    ui.hpFill = ui.status.querySelector('.health .fill');
    ui.hpText = ui.status.querySelector('.health span');
    ui.arFill = ui.status.querySelector('.armor .fill');
    ui.arText = ui.status.querySelector('.armor span');
    ui.armorBar = ui.status.querySelector('.armor');
    ui.portrait = ui.status.querySelector('.hud-portrait');
    ui.wname = ui.ammo.querySelector('.wname');
    ui.clip = ui.ammo.querySelector('.clip');
    ui.clipL = ui.ammo.querySelector('.l');
    ui.res = ui.ammo.querySelector('.res');
    ui.reload = ui.ammo.querySelector('.reload');
    ui.crossArms = ui.cross.querySelectorAll('i');
    ui.radar.width = ui.radar.height = 128;
    ui.rctx = ui.radar.getContext('2d');
    ui.markerLabel = ui.marker.querySelector('small');
    const c = v.actor.character.look;
    ui.portrait.style.background = `linear-gradient(180deg, ${c.hatColor || c.hair || c.skin} 0 30%, ${c.skin} 30% 70%, ${c.top} 70%)`;
    ui.portrait.textContent = v.actor.name.slice(0, 2).toUpperCase();
    return ui;
  }

  _set(ui, key, prop, value, target) {
    if (ui.cache[key] === value) return;
    ui.cache[key] = value;
    if (prop === 'text') target.textContent = value;
    else if (prop === 'html') target.innerHTML = value;
    else if (prop === 'display') target.style.display = value;
    else target.style[prop] = value;
  }

  notify(i, text) {
    const ui = this.panels[i];
    if (!ui) return;
    const n = el('div', 'notify-item', ui.notify, text);
    setTimeout(() => n.classList.add('fade'), 1400);
    setTimeout(() => n.remove(), 2000);
    while (ui.notify.children.length > 4) ui.notify.firstChild.remove();
  }

  feed(html, color = '#fff') {
    for (const ui of this.panels) {
      const n = el('div', 'feed-item', ui.feed, html);
      n.style.color = color;
      setTimeout(() => n.classList.add('fade'), 4200);
      setTimeout(() => n.remove(), 5000);
      while (ui.feed.children.length > 5) ui.feed.firstChild.remove();
    }
  }

  center(text, t = 2) {
    this.centerQueue.push({ text, t });
    if (this.centerQueue.length === 1 && this.centerT <= 0) this._nextCenter();
  }

  _nextCenter() {
    const m = this.centerQueue[0];
    for (const ui of this.panels) {
      if (!m) { ui.center.classList.remove('show'); continue; }
      ui.center.innerHTML = m.text.split('\n').map((l, i) => (i === 0 ? `<b>${l}</b>` : `<span>${l}</span>`)).join('');
      ui.center.style.setProperty('--dur', `${m.t}s`);
      ui.center.classList.remove('show');
      void ui.center.offsetWidth;
      ui.center.classList.add('show');
    }
    this.centerT = m ? m.t : 0;
  }

  update(dt) {
    if (this.centerT > 0) {
      this.centerT -= dt;
      if (this.centerT <= 0) { this.centerQueue.shift(); this._nextCenter(); }
    }
    const g = this.game;
    this.game.views.forEach((v, i) => this._updatePanel(this.panels[i], v, dt));
    void g;
  }

  _updatePanel(ui, v, dt) {
    const g = this.game, a = v.actor, ws = a.weapons, w = ws.current, s = ws.slot;
    const rect = ui.root.getBoundingClientRect();
    // Health / armour
    const hp = Math.max(0, Math.ceil(a.health));
    this._set(ui, 'hp', 'width', `${Math.max(0, a.health / a.maxHealth) * 100}%`, ui.hpFill);
    this._set(ui, 'hpt', 'text', String(hp), ui.hpText);
    this._set(ui, 'hpc', 'background', a.health / a.maxHealth < 0.3 ? 'linear-gradient(#ff6a6a,#b40000)' : 'linear-gradient(#8dff6a,#1f9e00)', ui.hpFill);
    this._set(ui, 'ar', 'width', `${a.armor}%`, ui.arFill);
    this._set(ui, 'art', 'text', a.armor > 0 ? String(Math.ceil(a.armor)) : '', ui.arText);
    this._set(ui, 'arv', 'display', a.armor > 0 ? 'block' : 'none', ui.armorBar);
    // Ammo
    this._set(ui, 'wn', 'text', (s?.dual ? 'Dual ' : '') + w.name, ui.wname);
    const infinite = w.clip === 0;
    this._set(ui, 'clip', 'text', infinite ? '∞' : String(s ? s.clip : 0), ui.clip);
    this._set(ui, 'clipL', 'text', s?.dual ? `${s.clipL} |` : '', ui.clipL);
    this._set(ui, 'res', 'text', infinite ? '' : `/ ${s ? s.reserve : 0}`, ui.res);
    this._set(ui, 'rl', 'display', ws.reloading ? 'block' : 'none', ui.reload);
    this._set(ui, 'lowammo', 'color', !infinite && s && s.clip <= Math.ceil(w.clip * 0.2) ? '#ff5a3a' : '#fff', ui.clip);
    // Crosshair
    const zoomScope = ws.zoomed && w.view?.scope;
    this._set(ui, 'scope', 'display', zoomScope ? 'block' : 'none', ui.scope);
    const showCross = a.alive && !zoomScope && w.kind !== 'melee';
    this._set(ui, 'cross', 'display', showCross ? 'block' : 'none', ui.cross);
    if (showCross) {
      const spread = w.spread + w.moveSpread * Math.min(1, a.speed / 7) + ws.bloom + (a.body.onGround ? 0 : 0.02);
      const px = Math.round(4 + Math.tan(spread) / Math.tan(v.camera.fov * Math.PI / 360) * rect.height / 2);
      ui.cross.style.setProperty('--gap', `${Math.min(60, px)}px`);
      const target = g.findAimTarget(a, a.eye(), a.forward(), 0.04, w.range, true);
      this._set(ui, 'ctgt', 'color', target ? '#ff3b3b' : '#ffffff', ui.cross);
    }
    // Hit marker
    this._set(ui, 'hitop', 'opacity', v.hitT > 0 ? String(Math.min(1, v.hitT * 8)) : '0', ui.hit);
    this._set(ui, 'hitc', 'color', v.hitKill ? '#ff3b3b' : v.hitHead ? '#ffd23b' : '#ffffff', ui.hit);
    // Damage vignette + direction arcs
    const low = a.alive && a.health < 30 ? 0.35 + Math.sin(g.time * 6) * 0.15 : 0;
    this._set(ui, 'vig', 'opacity', String(Math.min(1, Math.max(v.hurtT, low)).toFixed(2)), ui.vignette);
    const dirKey = v.hurtDirs.map((d) => `${d.ang.toFixed(1)}:${d.t.toFixed(1)}`).join(',');
    if (ui.cache.dirs !== dirKey) {
      ui.cache.dirs = dirKey;
      ui.dirs.innerHTML = v.hurtDirs.map((d) => {
        const rel = d.ang - a.yaw;
        return `<i style="transform:rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg);opacity:${Math.min(1, d.t).toFixed(2)}"></i>`;
      }).join('');
    }
    // Top bar: mode line + timer
    const modeLine = g.mode.hudLine(a);
    this._set(ui, 'mode', 'html', modeLine, ui.mode);
    const tl = g.mode.timeLeft();
    const timeStr = tl == null ? (g.mode.id === 'story' ? fmtTime(g.mode.elapsed) : '') : fmtTime(tl);
    this._set(ui, 'timer', 'text', timeStr, ui.timer);
    // Objective
    const obj = g.mode.objectiveText ? g.mode.objectiveText() : '';
    this._set(ui, 'obj', 'html', obj ? `<small>OBJECTIVE</small>${obj}` : '', ui.objective);
    this._set(ui, 'objd', 'display', obj ? 'block' : 'none', ui.objective);
    // Objective marker
    this._marker(ui, v, rect);
    // Radar
    this._radar(ui, v);
    // Death screen
    let dead = '';
    if (!a.alive) {
      const k = v.deathInfo?.killer;
      const by = k && k !== a ? `Killed by <b>${k.name}</b>` : 'You died';
      if (g.mode.id === 'story') dead = `<div class="big">${by}</div>`;
      else if (!Number.isFinite(a.respawnTimer)) dead = `<div class="big">${by}</div><div>You are out of lives — spectating</div>`;
      else if (a.respawnTimer > 0) dead = `<div class="big">${by}</div><div>Respawn in ${Math.ceil(a.respawnTimer)}</div>`;
      else dead = `<div class="big">${by}</div><div class="blink">Press FIRE to respawn</div>`;
    }
    this._set(ui, 'dead', 'html', dead, ui.dead);
    // Scoreboard
    const showBoard = (v.cmd?.scoreboard) || (g.endT !== null && g.endT < 2.5);
    this._set(ui, 'boardv', 'display', showBoard ? 'block' : 'none', ui.board);
    if (showBoard) {
      const rows = g.mode.ranking().slice(0, 12).map((x, i) => {
        const col = x.team >= 0 && g.mode.teams ? TEAM_COLORS[x.team] : x.isPlayer ? '#ffd23b' : '#fff';
        const extra = g.mode.id === 'elimination' || g.mode.id === 'survival' ? `<td>${Math.max(0, x.lives)}</td>` : '';
        return `<tr style="color:${col}"><td>${i + 1}</td><td>${x.name}${x.infected ? ' ☣' : ''}</td><td>${x.stats.score}</td><td>${x.stats.kills}</td><td>${x.stats.deaths}</td>${extra}</tr>`;
      }).join('');
      const extraH = g.mode.id === 'elimination' || g.mode.id === 'survival' ? '<th>Lives</th>' : '';
      this._set(ui, 'board', 'html', `<h3>${g.mode.name}</h3><table><tr><th>#</th><th>Name</th><th>Score</th><th>K</th><th>D</th>${extraH}</tr>${rows}</table>`, ui.board);
    }
  }

  _marker(ui, v, rect) {
    const m = this.game.objectiveMarker;
    if (!m || !v.actor.alive) { this._set(ui, 'mk', 'display', 'none', ui.marker); return; }
    this._set(ui, 'mk', 'display', 'block', ui.marker);
    _v.set(m.x, m.y + 1.2, m.z);
    const dist = _v.distanceTo(v.actor.pos);
    _v.project(v.camera);
    let x = (_v.x * 0.5 + 0.5) * rect.width, y = (-_v.y * 0.5 + 0.5) * rect.height;
    const behind = _v.z > 1;
    if (behind) { x = rect.width - x; y = rect.height - 30; }
    x = Math.max(24, Math.min(rect.width - 24, x));
    y = Math.max(40, Math.min(rect.height - 40, y));
    ui.marker.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    this._set(ui, 'mkl', 'text', `${Math.round(dist)}m`, ui.markerLabel);
  }

  _radar(ui, v) {
    const ctx = ui.rctx, a = v.actor, g = this.game;
    ui.radarT = (ui.radarT || 0) + 1;
    if (ui.radarT % 3) return; // 20Hz is plenty
    const R = 64, range = 30;
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(10,20,40,0.55)';
    ctx.beginPath(); ctx.arc(R, R, R - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,220,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,220,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(R, R, R / 2, 0, Math.PI * 2); ctx.moveTo(R, 4); ctx.lineTo(R, 124); ctx.moveTo(4, R); ctx.lineTo(124, R); ctx.stroke();
    const cy = Math.cos(a.yaw), sy = Math.sin(a.yaw);
    const plot = (x, z, color, size, shape) => {
      const dx = x - a.pos.x, dz = z - a.pos.z;
      // rotate into view space: forward is up
      const rx = dx * cy - dz * sy;
      const rz = dx * sy + dz * cy;
      let px = rx / range * (R - 6), pz = rz / range * (R - 6);
      const l = Math.hypot(px, pz);
      if (l > R - 6) { if (shape !== 'star') return; px *= (R - 6) / l; pz *= (R - 6) / l; }
      ctx.fillStyle = color;
      if (shape === 'star') { ctx.font = 'bold 14px sans-serif'; ctx.fillText('★', R + px - 6, R + pz + 5); }
      else { ctx.beginPath(); ctx.arc(R + px, R + pz, size, 0, Math.PI * 2); ctx.fill(); }
    };
    for (const o of g.actors) {
      if (!o.alive || o === a) continue;
      const enemy = g.areEnemies(a, o);
      if (enemy && o.crouching) continue;
      const col = enemy ? '#ff4040' : (o.team >= 0 ? TEAM_COLORS[o.team] : '#6cf');
      plot(o.pos.x, o.pos.z, col, 3.5);
    }
    if (g.mode.bags) for (const b of g.mode.bags) plot(b.pos.x, b.pos.z, TEAM_COLORS[b.team], 5);
    if (g.objectiveMarker) plot(g.objectiveMarker.x, g.objectiveMarker.z, '#ffd23b', 0, 'star');
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(R, R - 6); ctx.lineTo(R + 4, R + 4); ctx.lineTo(R - 4, R + 4); ctx.fill();
  }

  dispose() { this.container.remove(); }
}

export function fmtTime(t) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
