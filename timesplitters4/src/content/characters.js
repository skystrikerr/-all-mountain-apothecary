// 50 original playable characters. Visuals are procedural (see game/characterModel.js):
// colours + head shape + headgear + extras give each a distinct silhouette.
// `unlock` describes how the character is earned (see game/progress.js).

const C = [];
const ch = (id, name, era, look, bio, unlock = 'default', stats = {}) =>
  C.push({ id, name, era, look, bio, unlock, stats: { speed: 1, size: 1, ...stats } });

// ---------- Time Rift Commandos (heroes)
ch('ada', 'Capt. Ada Voss', 'Rift Corps', { skin: '#e0b48c', hair: '#2a1b12', top: '#2f5d8a', bottom: '#2b2f3a', hat: 'beret', hatColor: '#8a1c1c', extras: ['vest'] },
  'Leader of the Rift Corps. Has read every history book twice and shot at most of them.');
ch('rook', 'Rook Mendez', 'Rift Corps', { skin: '#a8754f', hair: '#111', top: '#4b6b2f', bottom: '#3a3a2a', hat: 'cap', hatColor: '#333', extras: ['vest', 'glasses'] },
  'Demolitions expert who insists every problem is a grenade-shaped problem.');
ch('dex', 'Dexter "Glitch" Okafor', 'Rift Corps', { skin: '#5b3a24', hair: '#111', top: '#e0e0e0', bottom: '#4a4a55', hat: 'headset', hatColor: '#0cf', extras: ['backpack'] },
  'Rift Corps tech whizz. Talks to the time machine like it is a moody cat.');
ch('bruno', 'Bruno Kowalski', 'Rift Corps', { skin: '#e8c0a0', hair: '#a86a2a', top: '#8a5a2a', bottom: '#2a3a4a', hat: 'none', extras: ['beard', 'vest'], build: { w: 1.2 } },
  'Ex-lumberjack, current heavy gunner, future legend (he checked).', 'default', { speed: 0.95, size: 1.1 });

// ---------- Chicago 1932
ch('sal', 'Big Sal Marzetti', 'Chicago 1932', { skin: '#e2b894', hair: '#222', top: '#3b2f4a', bottom: '#3b2f4a', hat: 'fedora', hatColor: '#222', extras: ['tie', 'cigar'], build: { w: 1.3, h: 1.05 } },
  'Owner of the Hotel Stiletto. Found a glowing rock in 1931 and never looked back.', { story: 'chicago' }, { size: 1.15, speed: 0.9 });
ch('vinnie', 'Vinnie "Two Guns"', 'Chicago 1932', { skin: '#dcae88', hair: '#2a1b12', top: '#555a60', bottom: '#555a60', hat: 'fedora', hatColor: '#555', extras: ['tie'] },
  'Named for his love of dual-wielding. And his two guns.', 'default');
ch('flapper', 'Dot Delacroix', 'Chicago 1932', { skin: '#f0c8a8', hair: '#111', top: '#c33b6b', bottom: '#c33b6b', hat: 'bob', hatColor: '#111', extras: ['pearls'] },
  'Jazz singer at the Stiletto ballroom. The tommy gun is for encores.', 'default');
ch('copper', 'Officer O\'Malley', 'Chicago 1932', { skin: '#f0c0a0', hair: '#a33', top: '#1f2e5a', bottom: '#1f2e5a', hat: 'police', hatColor: '#1f2e5a', extras: ['badge'] },
  'Honest cop. Possibly the only one in the city.', { story: 'chicago' });
ch('bellhop', 'Pip the Bellhop', 'Chicago 1932', { skin: '#f2cfae', hair: '#6b3b1b', top: '#a22', bottom: '#222', hat: 'bellhop', hatColor: '#a22', extras: [] , build: { h: 0.9 } },
  'Carries luggage, secrets and, occasionally, a Chicago Typewriter.', { challenge: 'typewriter' }, { size: 0.9, speed: 1.05 });
ch('bookie', 'Lou the Bookie', 'Chicago 1932', { skin: '#d9a883', hair: '#777', top: '#6b6b3a', bottom: '#4a4a2a', hat: 'flatcap', hatColor: '#4a4a2a', extras: ['glasses'] },
  'Will give you 3-to-1 odds on anything, including your survival.', { kills: 50 });
ch('chef', 'Chef Benedetto', 'Chicago 1932', { skin: '#e0b090', hair: '#222', top: '#f4f4f4', bottom: '#333', hat: 'chef', hatColor: '#fff', extras: ['moustache'], build: { w: 1.2 } },
  'Runs the Stiletto kitchen. Fights exclusively with a rolling pin and a shotgun.', { story: 'chicago', medal: 'silver' });
ch('mobzombie', 'Undead Mobster', 'Chicago 1932', { skin: '#8aa86a', hair: '#333', top: '#3a3a3a', bottom: '#3a3a3a', hat: 'fedora', hatColor: '#333', head: 'zombie', extras: ['tie'] },
  'Took a rift-blast in the chest. Still shows up for work.', { mode: 'infection' });

// ---------- Medieval 1348
ch('knight', 'Sir Aldric the Rusty', 'Europe 1348', { skin: '#e0b090', top: '#9aa0a8', bottom: '#7a8088', hat: 'knight', hatColor: '#9aa0a8', extras: ['tabard'], tabard: '#b22' },
  'Knight of the besieged Castle Morrow. His armour squeaks in B-flat.', 'default', { speed: 0.92, size: 1.05 });
ch('archer', 'Wren of the Wood', 'Europe 1348', { skin: '#f0c8a0', hair: '#c46a1a', top: '#3f6b2a', bottom: '#5a4a2a', hat: 'hood', hatColor: '#3f6b2a', extras: ['quiver'] },
  'Best shot in three counties. The fourth county is a lie.', 'default');
ch('plaguedoc', 'Doctor Corvus', 'Europe 1348', { skin: '#ddd', top: '#1a1a1a', bottom: '#1a1a1a', hat: 'plague', hatColor: '#111', extras: ['cape'], cape: '#222' },
  'Prescribes leeches, prayer and buckshot.', { story: 'medieval' });
ch('jester', 'Motley Mott', 'Europe 1348', { skin: '#f2d0b0', top: '#d33', bottom: '#fc3', hat: 'jester', hatColor: '#d33', extras: [] },
  'Court jester. Nobody laughed. Now he has a crossbow.', { kills: 150 });
ch('queen', 'Queen Isolde', 'Europe 1348', { skin: '#f4d4b8', hair: '#d9b25a', top: '#5a2a8a', bottom: '#5a2a8a', hat: 'crown', hatColor: '#fc3', extras: ['cape'], cape: '#a22' },
  'Rules Castle Morrow with an iron fist and a velvet cape.', { story: 'medieval', medal: 'gold' });
ch('monk', 'Brother Tuckwell', 'Europe 1348', { skin: '#e8b890', hair: '#7a5a3a', top: '#6b4a2a', bottom: '#6b4a2a', hat: 'tonsure', hatColor: '#7a5a3a', extras: ['rope'], build: { w: 1.25 } },
  'Vow of silence. Vow of violence was added later.', { matches: 5 }, { size: 1.1 });
ch('peasant', 'Mudd the Peasant', 'Europe 1348', { skin: '#d8a880', hair: '#5a3a1a', top: '#8a7a5a', bottom: '#5a4a3a', hat: 'none', extras: ['beard'] },
  'Recently discovered that time travel exists. Unimpressed.', 'default');
ch('skeleton', 'Rattlebones', 'Europe 1348', { skin: '#eee8d8', top: '#eee8d8', bottom: '#eee8d8', head: 'skull', hat: 'none', extras: ['ribs'], build: { w: 0.8 } },
  'Former siege engineer. Died on the job. Still on the job.', { challenge: 'bones' }, { size: 0.9 });

// ---------- Soviet 1967
ch('volkova', 'Dr. Irina Volkova', 'USSR 1967', { skin: '#f0d0b8', hair: '#c9a34a', top: '#f4f4f4', bottom: '#555', hat: 'bun', hatColor: '#c9a34a', extras: ['glasses', 'labcoat'] },
  'Head of Laboratory 67. Accidentally invented the rift. Deliberately weaponised it.', { story: 'soviet' });
ch('sergei', 'Sgt. Sergei Petrov', 'USSR 1967', { skin: '#e8c0a0', hair: '#555', top: '#5a6040', bottom: '#4a5030', hat: 'ushanka', hatColor: '#6b5a4a', extras: ['moustache'] },
  'Guard captain of Lab 67. Hates the cold, loves the Volk-67.', 'default');
ch('cosmo', 'Cosmonaut Yuri-9', 'USSR 1967', { skin: '#e8c0a0', top: '#e8e2d0', bottom: '#e8e2d0', hat: 'spacehelm', hatColor: '#e8e2d0', extras: ['backpack'] },
  'Ninth dog-free cosmonaut. Doesn\'t talk about the first eight.', { kills: 300 });
ch('agent', 'Agent Nadia Krol', 'USSR 1967', { skin: '#f2d6c0', hair: '#111', top: '#222', bottom: '#222', hat: 'none', hair2: 'ponytail', extras: ['glasses'] },
  'Double agent. Possibly triple. She lost count.', { challenge: 'sniper' });
ch('bear', 'Comrade Bear', 'USSR 1967', { skin: '#6b4a2a', top: '#6b4a2a', bottom: '#6b4a2a', head: 'bear', hat: 'ushanka', hatColor: '#555', extras: [], build: { w: 1.3, h: 1.1 } },
  'Lab 67\'s most successful experiment. Still hungry.', { story: 'soviet', medal: 'gold' }, { size: 1.2, speed: 0.9 });
ch('robot67', 'Automaton R-67', 'USSR 1967', { skin: '#8a8f7a', top: '#6a6f5a', bottom: '#5a5f4a', head: 'robot', hat: 'antenna', hatColor: '#c33', extras: [] },
  'Soviet robot worker. Productivity: 400% of quota.', { matches: 15 });

// ---------- California 1997
ch('skater', 'Zack "Kickflip" Rivera', 'California 1997', { skin: '#c89468', hair: '#222', top: '#2ab', bottom: '#335', hat: 'cap_back', hatColor: '#f33', extras: [] },
  'Mall rat. Radical. Unkillable, according to him.', 'default');
ch('mallcop', 'Mall Cop Dwayne', 'California 1997', { skin: '#8a5a3a', hair: '#111', top: '#8ab', bottom: '#223', hat: 'police', hatColor: '#223', extras: ['badge', 'moustache'], build: { w: 1.2 } },
  'Protects the Galleria Grande with a flashlight and a dream.', { story: 'mall' }, { size: 1.1 });
ch('arcadequeen', 'Pixel Patty', 'California 1997', { skin: '#f0d0b0', hair: '#f3a', top: '#63f', bottom: '#222', hat: 'none', hair2: 'pigtails', extras: ['glasses'] },
  'Holds the high score on every cabinet in the arcade.', { challenge: 'arcade' });
ch('grunge', 'Kurt Flannel', 'California 1997', { skin: '#f0c8a8', hair: '#c9a34a', top: '#a33', bottom: '#335', hat: 'beanie', hatColor: '#333', extras: [] },
  'Plays guitar in a band that has not played a show.', { kills: 100 });
ch('foodcourt', 'Hot Dog Hank', 'California 1997', { skin: '#e0b090', hair: '#555', top: '#fc3', bottom: '#d33', hat: 'hotdog', hatColor: '#d84', extras: [] },
  'Wears the mascot suit. Nobody has seen his face since 1994.', { matches: 10 });
ch('surfer', 'Coral Nakamura', 'California 1997', { skin: '#d8a070', hair: '#f4e08a', top: '#0bc', bottom: '#fa3', hat: 'none', extras: ['glasses'] },
  'Came for the waves, stayed for the time war.', 'default');

// ---------- Neo-Tokyo 2145
ch('ninja', 'Kage-9', 'Neo-Tokyo 2145', { skin: '#333', top: '#1a1a24', bottom: '#1a1a24', head: 'visor', hat: 'none', glow: '#f0f', extras: ['scarf'], scarf: '#f0f' },
  'Cyber-ninja. Faster than your reflex update.', { story: 'neotokyo' }, { speed: 1.08, size: 0.95 });
ch('idol', 'Hikari Star', 'Neo-Tokyo 2145', { skin: '#f4dcc8', hair: '#6ff', top: '#fff', bottom: '#f6c', hat: 'none', hair2: 'pigtails', extras: [] },
  'Pop idol and part-time resistance leader. Mostly part-time.', 'default');
ch('android', 'Unit ARIA', 'Neo-Tokyo 2145', { skin: '#dde', top: '#dde', bottom: '#aab', head: 'android', hat: 'none', glow: '#0ff', extras: [] },
  'Defected from the city\'s AI. Still gets its updates.', { story: 'neotokyo', medal: 'gold' });
ch('yakuza', 'Ryo "Chrome" Tanaka', 'Neo-Tokyo 2145', { skin: '#e8c0a0', hair: '#eee', top: '#223', bottom: '#223', hat: 'none', extras: ['tie', 'glasses'], glow: '#f33' },
  'Chrome-armed gangster. Upgraded his temper.', { kills: 200 });
ch('enforcer', 'Enforcer Drone', 'Neo-Tokyo 2145', { skin: '#223', top: '#f4f4f4', bottom: '#223', head: 'robot', hat: 'none', glow: '#f33', extras: [] },
  'Standard-issue police robot of the AI city. Very polite. Very lethal.', { matches: 20 });
ch('hacker', 'Byte Moreno', 'Neo-Tokyo 2145', { skin: '#b07850', hair: '#3f3', top: '#222', bottom: '#333', hat: 'hood', hatColor: '#222', extras: ['glasses'], glow: '#3f3' },
  'Can hack anything except her own sleep schedule.', { challenge: 'neon' });
ch('mecha', 'Sumo-Mech', 'Neo-Tokyo 2145', { skin: '#888', top: '#d33', bottom: '#555', head: 'robot', hat: 'none', glow: '#fc3', extras: [], build: { w: 1.4, h: 1.1 } },
  'Retired robot sumo champion. Still undefeated at pushing.', { kills: 400 }, { size: 1.25, speed: 0.88 });

// ---------- Deep Space 2670
ch('marine', 'Pvt. Juno Blake', 'Deep Space 2670', { skin: '#c89468', hair: '#222', top: '#4a5a6a', bottom: '#3a4a5a', hat: 'spacehelm', hatColor: '#6a7a8a', extras: ['backpack'] },
  'Colonial marine. Has fought aliens, robots and a very aggressive vending machine.', 'default');
ch('greys', 'Grey Emissary', 'Deep Space 2670', { skin: '#9aa', top: '#445', bottom: '#445', head: 'alien', hat: 'none', extras: [], build: { h: 0.9, w: 0.8 } },
  'Came in peace. Left in pieces. Came back.', { story: 'space' }, { size: 0.85, speed: 1.05 });
ch('xeno', 'Xeno Drone', 'Deep Space 2670', { skin: '#343', top: '#454', bottom: '#343', head: 'xeno', hat: 'none', extras: ['tail'], glow: '#9f3' },
  'Hive worker of the derelict ship Oblivion. Slightly bitey.', { story: 'space', medal: 'silver' });
ch('captain', 'Capt. Orion Vance', 'Deep Space 2670', { skin: '#e0b090', hair: '#ddd', top: '#223', bottom: '#223', hat: 'captain', hatColor: '#223', extras: ['beard', 'cape'], cape: '#a22' },
  'Last captain of the starship Oblivion. Went down with the ship. Then came back up.', { story: 'space', medal: 'gold' });
ch('bot3000', 'Servo 3000', 'Deep Space 2670', { skin: '#fc3', top: '#fc3', bottom: '#888', head: 'dome', hat: 'none', glow: '#0f0', extras: [] },
  'Galley robot. Its soup is a war crime.', { challenge: 'survival' });
ch('octo', 'Admiral Squelch', 'Deep Space 2670', { skin: '#c5a', top: '#a38', bottom: '#a38', head: 'octo', hat: 'none', extras: [] },
  'Eight arms, eight guns, one very bad attitude. Uses only two, for fairness.', { kills: 500 });

// ---------- Misc / bonus
ch('duck', 'Sgt. Quackers', 'Bonus', { skin: '#fc3', top: '#fff', bottom: '#fff', head: 'duck', hat: 'helmet', hatColor: '#4b5b2f', extras: [], build: { h: 0.85 } },
  'Nobody knows how a duck got into the Rift Corps. Nobody asks.', { challenge: 'melee' }, { size: 0.8, speed: 1.1 });
ch('gingerbread', 'Ginger Snapp', 'Bonus', { skin: '#b86a2a', top: '#b86a2a', bottom: '#b86a2a', head: 'round', hat: 'none', extras: ['icing'] },
  'Escaped from a 1997 food-court bakery. Crunchy.', { matches: 30 });
ch('monkey', 'Professor Banana', 'Bonus', { skin: '#7a5030', top: '#f4f4f4', bottom: '#555', head: 'monkey', hat: 'none', extras: ['glasses', 'labcoat'], build: { h: 0.9 } },
  'The smartest primate in any century. Loves a good minigun.', { kills: 750 }, { size: 0.9 });
ch('snowman', 'Frosty Frank', 'Bonus', { skin: '#f4f8ff', top: '#f4f8ff', bottom: '#f4f8ff', head: 'round', hat: 'tophat', hatColor: '#111', extras: ['scarf'], scarf: '#c22', build: { w: 1.2 } },
  'Built by bored Lab 67 guards. Came to life after a rift leak.', { matches: 50 });
ch('pharaoh', 'Pharaoh Nebu', 'Bonus', { skin: '#b07850', top: '#fc3', bottom: '#fff', hat: 'nemes', hatColor: '#fc3', extras: [] },
  'Woke up in the wrong millennium. Blames everyone.', { kills: 1000 });
ch('cowboy', 'Dusty Rhodes', 'Bonus', { skin: '#d8a070', hair: '#6b3b1b', top: '#8a4a2a', bottom: '#335', hat: 'stetson', hatColor: '#6b4a2a', extras: ['moustache'] },
  'Took a wrong turn at 1888. Still looking for his horse.', { challenge: 'elimination' });
ch('robochef', 'Chef-Tron', 'Bonus', { skin: '#bbb', top: '#fff', bottom: '#bbb', head: 'robot', hat: 'chef', hatColor: '#fff', glow: '#f80', extras: [] },
  'Serves 400 meals a minute. Most of them explode.', { challenge: 'infection' });
ch('timesplit', 'The Rift King', 'Bonus', { skin: '#303', top: '#202', bottom: '#202', head: 'rift', hat: 'crown', hatColor: '#a3f', glow: '#a3f', extras: ['cape'], cape: '#406', build: { h: 1.15, w: 1.1 } },
  'The entity behind the time crystals. Final boss. Terrible at parties.', { allStory: true }, { size: 1.1 });

export const CHARACTERS = C;
export const CHARACTER_MAP = Object.fromEntries(C.map((c) => [c.id, c]));
