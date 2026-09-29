// Blocky, chunky PS2-style character models assembled from boxes, with procedural animation.
import * as THREE from 'three';
import { buildWeaponModel } from './weaponModel.js';

function M(color, glow = false) {
  return glow ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color, flatShading: true });
}
function B(parent, w, h, d, x, y, z, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export class CharacterModel {
  constructor(character, { teamColor = null } = {}) {
    this.character = character;
    const look = character.look;
    const build = look.build || {};
    this.sw = build.w ?? 1; this.sh = build.h ?? 1;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.mats = {
      skin: M(look.skin || '#e0b090'),
      top: M(look.top || '#555'),
      bottom: M(look.bottom || '#333'),
      shoes: M('#1d1a18'),
      hair: M(look.hair || '#222'),
      hat: M(look.hatColor || '#333'),
      dark: M('#111'),
      glow: M(look.glow || '#fff', true),
      team: M(teamColor || '#ffffff', true),
    };
    this._build(look);
    this.body.scale.set(this.sw, this.sh, this.sw);
    this.phase = Math.random() * 10;
    this.deadT = 0;
    this.flash = 0;
    this.weaponMesh = null;
    this.leftWeaponMesh = null;
    this.setTeamColor(teamColor);
  }

  _build(look) {
    const m = this.mats;
    const body = this.body;
    // Hips / legs
    this.hips = new THREE.Group(); this.hips.position.y = 0.92; body.add(this.hips);
    this.legL = new THREE.Group(); this.legL.position.set(-0.12, 0, 0); this.hips.add(this.legL);
    this.legR = new THREE.Group(); this.legR.position.set(0.12, 0, 0); this.hips.add(this.legR);
    for (const leg of [this.legL, this.legR]) {
      B(leg, 0.17, 0.5, 0.2, 0, -0.25, 0, m.bottom);
      B(leg, 0.15, 0.38, 0.17, 0, -0.68, 0, m.bottom);
      B(leg, 0.17, 0.1, 0.28, 0, -0.87, -0.04, m.shoes);
    }
    // Torso
    this.torso = new THREE.Group(); this.torso.position.y = 0.92; body.add(this.torso);
    B(this.torso, 0.46, 0.58, 0.26, 0, 0.29, 0, m.top);
    B(this.torso, 0.44, 0.08, 0.25, 0, 0.02, 0, m.bottom); // belt line
    // Arms
    this.armL = new THREE.Group(); this.armL.position.set(-0.3, 0.52, 0); this.torso.add(this.armL);
    this.armR = new THREE.Group(); this.armR.position.set(0.3, 0.52, 0); this.torso.add(this.armR);
    for (const arm of [this.armL, this.armR]) {
      B(arm, 0.14, 0.32, 0.15, 0, -0.14, 0, m.top);
      this.teamBand = B(arm, 0.15, 0.05, 0.16, 0, -0.04, 0, m.team);
      B(arm, 0.12, 0.28, 0.13, 0, -0.44, 0, m.skin);
      B(arm, 0.13, 0.1, 0.13, 0, -0.62, 0, m.skin);
    }
    this.handR = new THREE.Group(); this.handR.position.set(0, -0.62, -0.02); this.armR.add(this.handR);
    this.handL = new THREE.Group(); this.handL.position.set(0, -0.62, -0.02); this.armL.add(this.handL);
    // Head
    this.head = new THREE.Group(); this.head.position.y = 0.62; this.torso.add(this.head);
    this._buildHead(look);
    this._buildHat(look);
    this._buildExtras(look);
  }

  _buildHead(look) {
    const m = this.mats, h = this.head;
    const eyes = (y = 0.14, color = m.dark, gap = 0.07, s = 0.045) => {
      B(h, s, s, 0.02, -gap, y, -0.14, color);
      B(h, s, s, 0.02, gap, y, -0.14, color);
    };
    switch (look.head) {
      case 'skull':
        B(h, 0.28, 0.3, 0.28, 0, 0.14, 0, m.skin);
        eyes(0.16, m.dark, 0.065, 0.07);
        B(h, 0.18, 0.05, 0.02, 0, 0.04, -0.14, m.dark);
        break;
      case 'bear':
        B(h, 0.34, 0.32, 0.32, 0, 0.15, 0, m.skin);
        B(h, 0.16, 0.12, 0.12, 0, 0.09, -0.2, M('#c8a070'));
        B(h, 0.06, 0.05, 0.03, 0, 0.13, -0.26, m.dark);
        B(h, 0.08, 0.08, 0.06, -0.14, 0.33, 0, m.skin); B(h, 0.08, 0.08, 0.06, 0.14, 0.33, 0, m.skin);
        eyes(0.2, m.dark, 0.08, 0.04);
        break;
      case 'robot': case 'dome':
        B(h, 0.3, 0.3, 0.3, 0, 0.15, 0, m.skin);
        B(h, 0.24, 0.07, 0.02, 0, 0.17, -0.155, m.glow);
        B(h, 0.05, 0.12, 0.05, -0.17, 0.15, 0, m.dark); B(h, 0.05, 0.12, 0.05, 0.17, 0.15, 0, m.dark);
        if (look.head === 'dome') {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshLambertMaterial({ color: '#aef', transparent: true, opacity: 0.5 }));
          d.position.y = 0.3; h.add(d);
        }
        break;
      case 'visor':
        B(h, 0.3, 0.32, 0.3, 0, 0.15, 0, m.dark);
        B(h, 0.28, 0.06, 0.02, 0, 0.17, -0.155, m.glow);
        break;
      case 'android':
        B(h, 0.26, 0.32, 0.28, 0, 0.15, 0, m.skin);
        eyes(0.17, m.glow, 0.065, 0.04);
        B(h, 0.28, 0.04, 0.3, 0, 0.3, 0, m.glow);
        break;
      case 'alien': {
        const hd = B(h, 0.3, 0.4, 0.3, 0, 0.22, 0, m.skin);
        hd.scale.set(1.15, 1, 1);
        B(h, 0.14, 0.12, 0.3, 0, 0.06, 0, m.skin);
        const le = B(h, 0.1, 0.07, 0.02, -0.07, 0.2, -0.155, m.dark); le.rotation.z = -0.4;
        const re = B(h, 0.1, 0.07, 0.02, 0.07, 0.2, -0.155, m.dark); re.rotation.z = 0.4;
        break;
      }
      case 'xeno': {
        B(h, 0.24, 0.26, 0.34, 0, 0.13, -0.02, m.skin);
        const back = B(h, 0.18, 0.18, 0.4, 0, 0.26, 0.22, m.skin); back.rotation.x = 0.5;
        B(h, 0.18, 0.04, 0.02, 0, 0.06, -0.19, m.glow);
        break;
      }
      case 'octo':
        B(h, 0.36, 0.34, 0.34, 0, 0.18, 0, m.skin);
        eyes(0.2, m.dark, 0.09, 0.06);
        for (let i = -1; i <= 1; i++) B(h, 0.06, 0.18, 0.06, i * 0.1, -0.04, -0.14, m.skin);
        break;
      case 'duck':
        B(h, 0.3, 0.3, 0.3, 0, 0.15, 0, m.skin);
        B(h, 0.18, 0.06, 0.16, 0, 0.1, -0.22, M('#f80'));
        eyes(0.2, m.dark, 0.08, 0.04);
        break;
      case 'monkey':
        B(h, 0.3, 0.3, 0.3, 0, 0.15, 0, m.skin);
        B(h, 0.22, 0.16, 0.04, 0, 0.12, -0.15, M('#d8b090'));
        B(h, 0.07, 0.1, 0.05, -0.18, 0.16, 0, M('#d8b090')); B(h, 0.07, 0.1, 0.05, 0.18, 0.16, 0, M('#d8b090'));
        eyes(0.17, m.dark, 0.06, 0.035);
        break;
      case 'round': {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), m.skin);
        s.position.y = 0.16; s.castShadow = true; h.add(s);
        eyes(0.2, m.dark, 0.06, 0.04);
        B(h, 0.04, 0.04, 0.1, 0, 0.14, -0.2, M('#f80'));
        break;
      }
      case 'rift':
        B(h, 0.3, 0.34, 0.3, 0, 0.16, 0, m.skin);
        eyes(0.18, m.glow, 0.075, 0.06);
        break;
      default: {
        // Human head: skin box + hair cap + eyes + nose
        const zombie = look.head === 'zombie';
        B(h, 0.28, 0.3, 0.28, 0, 0.15, 0, m.skin);
        eyes(0.17, zombie ? M('#fe0', true) : m.dark, 0.065, 0.04);
        B(h, 0.05, 0.06, 0.04, 0, 0.11, -0.155, m.skin);
        if (look.hair && look.hat !== 'bob') B(h, 0.3, 0.07, 0.3, 0, 0.3, 0.01, m.hair);
        if (look.hair && look.hat !== 'bob') B(h, 0.3, 0.2, 0.06, 0, 0.2, 0.13, m.hair);
        if (look.hair2 === 'ponytail') B(h, 0.08, 0.25, 0.08, 0, 0.12, 0.2, m.hair);
        if (look.hair2 === 'pigtails') { B(h, 0.08, 0.2, 0.08, -0.18, 0.12, 0.08, m.hair); B(h, 0.08, 0.2, 0.08, 0.18, 0.12, 0.08, m.hair); }
      }
    }
  }

  _buildHat(look) {
    const h = this.head, m = this.mats, hat = m.hat;
    switch (look.hat) {
      case 'fedora': B(h, 0.44, 0.03, 0.44, 0, 0.3, 0, hat); B(h, 0.3, 0.14, 0.3, 0, 0.37, 0, hat); B(h, 0.31, 0.03, 0.31, 0, 0.33, 0, m.dark); break;
      case 'stetson': B(h, 0.54, 0.03, 0.5, 0, 0.3, 0, hat); B(h, 0.3, 0.16, 0.3, 0, 0.38, 0, hat); break;
      case 'tophat': B(h, 0.4, 0.03, 0.4, 0, 0.3, 0, hat); B(h, 0.26, 0.3, 0.26, 0, 0.46, 0, hat); break;
      case 'flatcap': B(h, 0.32, 0.06, 0.34, 0, 0.32, -0.02, hat); B(h, 0.28, 0.02, 0.1, 0, 0.3, -0.2, hat); break;
      case 'cap': B(h, 0.31, 0.08, 0.31, 0, 0.32, 0, hat); B(h, 0.24, 0.02, 0.14, 0, 0.29, -0.2, hat); break;
      case 'cap_back': B(h, 0.31, 0.08, 0.31, 0, 0.32, 0, hat); B(h, 0.24, 0.02, 0.14, 0, 0.29, 0.2, hat); break;
      case 'beret': { const b = B(h, 0.32, 0.06, 0.32, 0.03, 0.33, 0, hat); b.rotation.z = -0.2; break; }
      case 'beanie': B(h, 0.31, 0.14, 0.31, 0, 0.33, 0, hat); break;
      case 'police': B(h, 0.32, 0.1, 0.32, 0, 0.34, 0, hat); B(h, 0.26, 0.02, 0.12, 0, 0.29, -0.19, m.dark); B(h, 0.05, 0.05, 0.02, 0, 0.35, -0.165, M('#fc3')); break;
      case 'bellhop': B(h, 0.2, 0.1, 0.2, 0, 0.35, 0, hat); break;
      case 'chef': B(h, 0.3, 0.06, 0.3, 0, 0.31, 0, hat); B(h, 0.34, 0.2, 0.34, 0, 0.44, 0, hat); break;
      case 'knight':
        B(h, 0.34, 0.38, 0.34, 0, 0.17, 0, hat);
        B(h, 0.24, 0.03, 0.02, 0, 0.18, -0.175, m.dark);
        B(h, 0.04, 0.12, 0.2, 0, 0.42, 0.02, M('#b22'));
        break;
      case 'hood': B(h, 0.34, 0.36, 0.34, 0, 0.17, 0.03, hat); B(h, 0.26, 0.26, 0.02, 0, 0.14, -0.15, m.dark); this._hoodFace(); break;
      case 'plague':
        B(h, 0.34, 0.34, 0.34, 0, 0.16, 0, hat);
        { const beak = B(h, 0.1, 0.1, 0.3, 0, 0.08, -0.28, M('#e8dcc0')); beak.rotation.x = 0.35; }
        B(h, 0.07, 0.07, 0.02, -0.07, 0.18, -0.175, M('#a33', true)); B(h, 0.07, 0.07, 0.02, 0.07, 0.18, -0.175, M('#a33', true));
        B(h, 0.46, 0.03, 0.46, 0, 0.34, 0, hat); B(h, 0.3, 0.14, 0.3, 0, 0.42, 0, hat);
        break;
      case 'jester':
        B(h, 0.32, 0.1, 0.32, 0, 0.33, 0, hat);
        for (const s of [-1, 1]) { const p = B(h, 0.08, 0.26, 0.08, s * 0.16, 0.44, 0, s < 0 ? hat : M('#fc3')); p.rotation.z = -s * 0.7; B(h, 0.07, 0.07, 0.07, s * 0.27, 0.54, 0, M('#fc3')); }
        break;
      case 'crown':
        B(h, 0.3, 0.08, 0.3, 0, 0.33, 0, hat);
        for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12], [0, -0.13]]) B(h, 0.05, 0.08, 0.05, x, 0.41, z, hat);
        break;
      case 'tonsure': B(h, 0.3, 0.12, 0.3, 0, 0.26, 0, M(look.hair || '#6b4a2a')); B(h, 0.16, 0.02, 0.16, 0, 0.32, 0, this.mats.skin); break;
      case 'bun': B(h, 0.12, 0.12, 0.12, 0, 0.36, 0.1, hat); break;
      case 'bob': B(h, 0.34, 0.14, 0.34, 0, 0.3, 0.02, hat); B(h, 0.34, 0.2, 0.08, 0, 0.14, 0.14, hat); B(h, 0.06, 0.2, 0.3, -0.16, 0.14, 0.02, hat); B(h, 0.06, 0.2, 0.3, 0.16, 0.14, 0.02, hat); break;
      case 'ushanka': B(h, 0.36, 0.14, 0.36, 0, 0.35, 0, hat); B(h, 0.06, 0.18, 0.2, -0.18, 0.2, 0, hat); B(h, 0.06, 0.18, 0.2, 0.18, 0.2, 0, hat); break;
      case 'spacehelm': {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshLambertMaterial({ color: '#bde', transparent: true, opacity: 0.35 }));
        s.position.y = 0.16; h.add(s);
        B(h, 0.4, 0.06, 0.4, 0, -0.06, 0, hat);
        break;
      }
      case 'helmet': B(h, 0.34, 0.12, 0.34, 0, 0.32, 0, hat); B(h, 0.38, 0.03, 0.38, 0, 0.27, 0, hat); break;
      case 'antenna': B(h, 0.03, 0.2, 0.03, 0, 0.4, 0, m.dark); B(h, 0.06, 0.06, 0.06, 0, 0.52, 0, M(look.hatColor || '#c33', true)); break;
      case 'headset': B(h, 0.33, 0.03, 0.06, 0, 0.32, 0, m.dark); B(h, 0.05, 0.1, 0.1, -0.16, 0.15, 0, hat); B(h, 0.05, 0.1, 0.1, 0.16, 0.15, 0, hat); B(h, 0.02, 0.02, 0.14, -0.16, 0.08, -0.1, m.dark); break;
      case 'hotdog':
        B(h, 0.36, 0.5, 0.36, 0, 0.2, 0.02, M('#e8b870'));
        B(h, 0.2, 0.62, 0.2, 0, 0.26, -0.12, hat);
        B(h, 0.2, 0.14, 0.02, 0, 0.14, -0.23, m.skin);
        break;
      case 'captain': B(h, 0.32, 0.08, 0.32, 0, 0.33, 0, hat); B(h, 0.28, 0.02, 0.12, 0, 0.3, -0.2, m.dark); B(h, 0.1, 0.05, 0.02, 0, 0.35, -0.165, M('#fc3')); break;
      case 'nemes':
        B(h, 0.36, 0.14, 0.34, 0, 0.32, 0, hat);
        B(h, 0.08, 0.3, 0.2, -0.18, 0.1, 0, hat); B(h, 0.08, 0.3, 0.2, 0.18, 0.1, 0, hat);
        B(h, 0.05, 0.08, 0.05, 0, 0.36, -0.18, M('#2a6'));
        break;
      default: break;
    }
  }

  _hoodFace() { /* hood hides the head; eyes still shine through */ }

  _buildExtras(look) {
    const t = this.torso, m = this.mats, h = this.head;
    for (const e of look.extras || []) {
      switch (e) {
        case 'vest': B(t, 0.48, 0.4, 0.28, 0, 0.3, 0, M('#3a3a2a')); break;
        case 'tie': B(t, 0.06, 0.34, 0.02, 0, 0.33, -0.14, M('#a22')); break;
        case 'labcoat': B(t, 0.5, 0.75, 0.29, 0, 0.2, 0, M('#f4f4f4')); break;
        case 'tabard': B(t, 0.3, 0.7, 0.28, 0, 0.2, 0, M(look.tabard || '#b22')); break;
        case 'cape': B(t, 0.5, 0.95, 0.04, 0, 0.06, 0.16, M(look.cape || '#a22')); break;
        case 'backpack': B(t, 0.34, 0.4, 0.16, 0, 0.32, 0.2, M('#445')); break;
        case 'quiver': { const q = B(t, 0.1, 0.5, 0.1, 0.1, 0.35, 0.18, M('#6b4a2a')); q.rotation.z = 0.4; break; }
        case 'badge': B(t, 0.06, 0.06, 0.02, -0.12, 0.44, -0.14, M('#fc3')); break;
        case 'pearls': B(t, 0.3, 0.04, 0.03, 0, 0.52, -0.13, M('#fff')); break;
        case 'rope': B(t, 0.48, 0.05, 0.28, 0, 0.1, 0, M('#d8c080')); break;
        case 'ribs': for (let i = 0; i < 4; i++) B(t, 0.42, 0.03, 0.02, 0, 0.18 + i * 0.1, -0.135, m.dark); break;
        case 'scarf': B(t, 0.36, 0.08, 0.3, 0, 0.56, 0, M(look.scarf || '#c22')); B(t, 0.08, 0.3, 0.03, 0.1, 0.4, -0.14, M(look.scarf || '#c22')); break;
        case 'icing': B(t, 0.46, 0.03, 0.02, 0, 0.35, -0.135, M('#fff')); B(t, 0.46, 0.03, 0.02, 0, 0.15, -0.135, M('#fff')); break;
        case 'tail': { const tl = B(this.hips, 0.1, 0.1, 0.6, 0, -0.1, 0.35, m.skin); tl.rotation.x = -0.5; break; }
        case 'glasses': B(h, 0.26, 0.05, 0.02, 0, 0.17, -0.16, M('#222')); break;
        case 'beard': B(h, 0.26, 0.14, 0.06, 0, 0.04, -0.14, m.hair); break;
        case 'moustache': B(h, 0.16, 0.035, 0.02, 0, 0.08, -0.16, m.hair.color.getHex() === 0x222222 ? m.dark : m.hair); break;
        case 'cigar': B(h, 0.03, 0.03, 0.12, 0.06, 0.05, -0.2, M('#6b4a2a')); B(h, 0.032, 0.032, 0.02, 0.06, 0.05, -0.26, M('#f60', true)); break;
        default: break;
      }
    }
  }

  setTeamColor(color) {
    this.mats.team.color.set(color || '#ffffff');
    this.mats.team.visible = !!color;
  }

  /** Recolour skin for infection mode. */
  setInfected(on) {
    if (on) {
      if (!this._origSkin) this._origSkin = this.mats.skin.color.clone();
      this.mats.skin.color.set('#6f9a4a');
      this.mats.skin.emissive = new THREE.Color('#1a3310');
    } else if (this._origSkin) {
      this.mats.skin.color.copy(this._origSkin);
      this.mats.skin.emissive = new THREE.Color('#000');
    }
  }

  setWeapon(weapon, dual) {
    if (this.weaponMesh) this.handR.remove(this.weaponMesh);
    if (this.leftWeaponMesh) this.handL.remove(this.leftWeaponMesh);
    this.weaponMesh = null; this.leftWeaponMesh = null;
    if (!weapon) return;
    this.weaponMesh = buildWeaponModel(weapon);
    this.weaponMesh.rotation.x = -Math.PI / 2;
    this.weaponMesh.position.set(0, -0.04, 0);
    this.handR.add(this.weaponMesh);
    this.dual = !!dual;
    if (dual) {
      this.leftWeaponMesh = buildWeaponModel(weapon);
      this.leftWeaponMesh.rotation.x = -Math.PI / 2;
      this.leftWeaponMesh.position.set(0, -0.04, 0);
      this.handL.add(this.leftWeaponMesh);
    }
    if (this._layer != null) this.setLayer(this._layer);
  }

  setLayer(layer) {
    this._layer = layer;
    this.root.traverse((o) => o.layers.set(layer));
  }

  /**
   * @param {number} dt
   * @param {{speed:number, crouch:boolean, pitch:number, alive:boolean, airborne:boolean, firing:number}} s
   */
  animate(dt, s) {
    if (!s.alive) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.45);
      this.body.rotation.x = -k * Math.PI / 2 * (this.deathDir || 1);
      this.body.position.y = k * 0.15 - Math.max(0, this.deadT - 2.5) * 0.4;
      this.armL.rotation.x = k * 2.5; this.armR.rotation.x = k * 2.8;
      return;
    }
    this.deadT = 0;
    this.body.rotation.x = 0;
    this.body.position.y = 0;
    const moving = s.speed > 0.5;
    this.phase += dt * (moving ? s.speed * 1.6 : 0);
    const swing = moving && !s.airborne ? Math.sin(this.phase) * Math.min(0.8, s.speed * 0.1) : 0;
    this.legL.rotation.x = s.airborne ? -0.5 : swing;
    this.legR.rotation.x = s.airborne ? 0.3 : -swing;
    const crouchK = s.crouch ? 1 : 0;
    this.hips.position.y = 0.92 - crouchK * 0.38;
    this.torso.position.y = 0.92 - crouchK * 0.42;
    this.legL.scale.y = this.legR.scale.y = 1 - crouchK * 0.42;
    this.body.position.y = moving && !s.airborne ? Math.abs(Math.sin(this.phase)) * 0.04 : 0;
    // Arms aim along pitch, holding weapon forward.
    const aim = Math.PI / 2 + s.pitch;
    const recoil = this.flash > 0 ? 0.15 : 0;
    this.armR.rotation.x = aim + recoil;
    this.armR.rotation.z = this.dual ? 0 : 0.12;
    this.armL.rotation.x = this.dual ? aim + recoil : aim - 0.25;
    this.armL.rotation.z = this.dual ? 0 : -0.55;
    this.head.rotation.x = s.pitch * 0.6;
    this.flash = Math.max(0, this.flash - dt);
  }
}
