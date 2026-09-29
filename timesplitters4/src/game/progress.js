// Persistent progression: medals, lifetime stats and character unlocks (localStorage).
import { CHARACTERS } from '../content/characters.js';

const KEY = 'ts4.progress';
const RANK = { bronze: 1, silver: 2, gold: 3 };

function blank() {
  return { missions: {}, challenges: {}, kills: 0, headshots: 0, matches: 0, modes: {}, seen: [] };
}

export class Progress {
  constructor() {
    this.data = blank();
    try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* ignore */ }
    this.unlockAll = false;
  }

  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ } }
  reset() { this.data = blank(); this.save(); }

  addKill(headshot) { this.data.kills++; if (headshot) this.data.headshots++; }

  recordMatch(mode) {
    this.data.matches++;
    this.data.modes[mode] = (this.data.modes[mode] || 0) + 1;
    this.save();
  }

  recordMission(id, medal, time) {
    const cur = this.data.missions[id] || {};
    if (medal && (!cur.medal || RANK[medal] > RANK[cur.medal])) cur.medal = medal;
    if (medal && (!cur.bestTime || time < cur.bestTime)) cur.bestTime = time;
    cur.completed = cur.completed || !!medal;
    this.data.missions[id] = cur;
    this.save();
  }

  recordChallenge(id, medal, value) {
    const cur = this.data.challenges[id] || {};
    if (medal && (!cur.medal || RANK[medal] > RANK[cur.medal])) cur.medal = medal;
    if (cur.best == null || value > cur.best) cur.best = value;
    this.data.challenges[id] = cur;
    this.save();
  }

  isUnlocked(c) {
    if (this.unlockAll) return true;
    const u = c.unlock;
    if (u === 'default') return true;
    const d = this.data;
    const medalOk = (have, need) => !!have && (!need || RANK[have] >= RANK[need]);
    if (u.story) return medalOk(d.missions[u.story]?.medal, u.medal);
    if (u.challenge) return !!d.challenges[u.challenge]?.medal;
    if (u.kills) return d.kills >= u.kills;
    if (u.matches) return d.matches >= u.matches;
    if (u.mode) return (d.modes[u.mode] || 0) > 0;
    if (u.allStory) return ['chicago', 'medieval', 'soviet', 'mall', 'neotokyo', 'space'].every((m) => d.missions[m]?.medal);
    return false;
  }

  unlockText(c) {
    const u = c.unlock;
    if (u === 'default') return 'Available';
    if (u.story) return `Complete story mission "${u.story}"${u.medal ? ` with ${u.medal}` : ''}`;
    if (u.challenge) return `Earn a medal in challenge "${u.challenge}"`;
    if (u.kills) return `Get ${u.kills} arcade/story kills (${this.data.kills} so far)`;
    if (u.matches) return `Play ${u.matches} arcade matches (${this.data.matches} so far)`;
    if (u.mode) return `Play a round of ${u.mode}`;
    if (u.allStory) return 'Complete all six story missions';
    return '???';
  }

  unlockedList() { return CHARACTERS.filter((c) => this.isUnlocked(c)); }

  /** Characters that became unlocked since the last call (for "NEW CHARACTER" popups). */
  takeNewUnlocks() {
    const now = this.unlockedList().map((c) => c.id);
    if (this.data.seen.length === 0) { this.data.seen = now; this.save(); return []; }
    const fresh = now.filter((id) => !this.data.seen.includes(id));
    this.data.seen = now;
    this.save();
    return CHARACTERS.filter((c) => fresh.includes(c.id));
  }
}
