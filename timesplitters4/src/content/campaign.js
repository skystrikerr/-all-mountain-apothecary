// The six-mission time-travel campaign. Chicago is the fully playable vertical slice;
// the rest are designed (see docs/GAME_DESIGN.md) and appear in the menu as "in development".
export const CAMPAIGN = [
  { id: 'chicago', level: 'chicago', title: 'The Hotel Stiletto', era: 'Chicago, 1932', playable: true,
    blurb: 'Mob hotel. Steal the Rift Crystal from Big Sal\'s vault.', color: '#c33b6b' },
  { id: 'medieval', title: 'Siege of Castle Morrow', era: 'Europe, 1348', playable: false,
    blurb: 'A besieged castle, the plague at the gates and a crystal in the crown jewels.', color: '#b8862a' },
  { id: 'soviet', title: 'Laboratory 67', era: 'Soviet Union, 1967', playable: false,
    blurb: 'A secret research lab under the permafrost where the rift was first opened.', color: '#8a2a2a' },
  { id: 'mall', title: 'Mall Rats', era: 'California, 1997', playable: false,
    blurb: 'A shopping mall and arcade overrun by time-mutants during the Black Friday rush.', color: '#2ab0c0' },
  { id: 'neotokyo', title: 'Ghost in the Grid', era: 'Neo-Tokyo, 2145', playable: false,
    blurb: 'A cyberpunk city run by a paranoid AI that has learned to split time.', color: '#d02ad0' },
  { id: 'space', title: 'The Oblivion', era: 'Deep Space, 2670', playable: false,
    blurb: 'A derelict alien ship at the end of time. The Rift King waits aboard.', color: '#6a3aff' },
];
