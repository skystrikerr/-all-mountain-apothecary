// Level registry.
import chicago from './chicago.js';
import galleria from './galleria.js';
import castle from './castle.js';
import custom from './custom.js';

export const LEVELS = { chicago, galleria, castle, custom };

/** Arcade arenas that are playable now. (The full plan lists 10 — see docs/GAME_DESIGN.md.) */
export const ARENAS = [
  { id: 'galleria', name: 'Galleria Grande', era: 'California 1997', size: 'Medium', desc: 'Fountain atrium, kiosks, mezzanines, an arcade and a record store.' },
  { id: 'castle', name: 'Castle Morrow', era: 'Europe 1348', size: 'Medium', desc: 'A courtyard at dusk: stalls, siege scaffolds, a great hall.' },
  { id: 'chicago', name: 'Hotel Stiletto', era: 'Chicago 1932', size: 'Large', desc: 'The whole story-mode hotel, street to vault. Great for big bot counts.' },
];
