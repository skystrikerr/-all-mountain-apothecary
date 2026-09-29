# Game Design — TimeSplitters 4 (fan prototype)

## Vision

A love letter to the PS2-era arcade shooter: instant, readable, funny and fast. Bold silhouettes, chunky
colourful menus, dozens of daft characters, a toybox of weapons from every century, and "one more match"
multiplayer with bots and split-screen. Modern touches (lighting, stereo audio, smarter AI) serve the feel
rather than replace it.

**Pillars**
1. **Speed & feel first** – 7.2 m/s run, no stamina, tiny weapon switch times, generous auto-aim on pad.
2. **Every era is a toybox** – each mission brings its own weapons, enemies and set-pieces.
3. **Arcade is the heart** – any arena × any mode × any weapon set, bots that fill a lobby, split-screen.
4. **Unlock everything by playing** – medals and challenges pay out characters.

## Story: *The Rift King*

A rift entity scatters time crystals through history. Each crystal lets a local villain cheat time. Capt. Ada
Voss and the Rift Corps jump into each era, retrieve the crystal and close the portal behind them.
Missions end by stepping through a time portal, TS-style.

| # | Mission | Era | Setting & set-pieces | Signature weapons | Boss | Status |
|---|---|---|---|---|---|---|
| 1 | The Hotel Stiletto | Chicago 1932 | Rainy street, lobby, speakeasy, kitchen ambush, ballroom stage, card room, loading dock, office, vault | Stiletto .38, Chicago Typewriter, Speakeasy Pump, Pineapple | Big Sal Marzetti | **Playable** |
| 2 | Siege of Castle Morrow | Europe 1348 | Burning village approach, siege camp, breached walls, great hall, plague crypt, bell tower | Siege Crossbow, Yew Longbow, Plague Handgonne, Greek Fire Pot | The Plague Doctor on the bell tower | Designed |
| 3 | Laboratory 67 | USSR 1967 | Snowbound checkpoint, rail yard, elevator descent, cryo labs, rift reactor core | Volk-67, Tokar, Krasny Scope Rifle, Sputnik, Tesla Arc | Dr. Irina Volkova in a walker suit | Designed |
| 4 | Mall Rats | California 1997 | Black-Friday mall, food court, arcade, cinema, rooftop parking chase | Rad-Uzi, Boomstick 97, Mall-Tuber, Nail Driver, Laser Tagger | Mutant mall mascot "Mega-Hank" | Designed (arena built) |
| 5 | Ghost in the Grid | Neo-Tokyo 2145 | Neon streets, maglev, AI data-temple, hologram rooftop | Photon SMG, Rail Driver, Monoblade, Swarm, Pulse Scattergun | SHOGUN, the city AI, in a mech | Designed |
| 6 | The Oblivion | Deep Space 2670 | Derelict alien ship: hangar, hive nurseries, zero-g spine, bridge | Graviton Pistol, Xeno Spike Rifle, Void Cannon, Chrono Disruptor, Singularity | The Rift King | Designed |

**Mission structure (all eras)** — 5–7 objectives (reach / collect / kill / protect / destroy), 1 scripted
ambush, an alarm or escalation beat, a boss, a portal exit. Checkpoint on every objective. Difficulty scales
enemy accuracy, reaction, health and damage; medals: Easy = bronze, Normal = silver, Hard = gold.

### Chicago 1932 walkthrough (implemented)
1. **Get inside the Hotel Stiletto** – two door guards chatting, a Tommy-gun patrol on the street.
2. **Find Big Sal's ledger** in his office (via speakeasy → card room, or ballroom). Entering the kitchen
   triggers an ambush from the loading dock.
3. **Steal the Rift Crystal** from the vault (through the service hall or the dock). Alarm: six reinforcements
   spawn already hunting you.
4. **Take down Big Sal** – he appears on the ballroom stage with two bodyguards (380 HP, armour, Tommy gun).
5. **Escape through the time portal** that opens on the stage.

## Weapons (30 implemented, all playable)

Archetypes implemented in `game/weaponSystem.js` + `game/projectiles.js`: melee (back-stab ×2),
hitscan (pellets with falloff, piercing, beams), projectiles (gravity, bounce, fuse, impact, splash with
line-of-sight check and knockback, homing), thrown explosives, scopes, spin-up. Headshots ×2–3.
**Dual-wield**: weapons marked ✔ can be carried in pairs — pick up a second copy; right trigger/click fires the
right gun, left fires the left.

| # | Weapon | Era | Type | Damage | RPM | Clip | Dual | Special |
|---|---|---|---|---|---|---|---|---|
| 1 | Knuckle Duster | 1932 | Melee | 34 | 110 | ∞ |  | semi |
| 2 | Stiletto .38 Special | 1932 | Hitscan | 22 | 260 | 8 | ✔ | semi |
| 3 | Chicago Typewriter | 1932 | Hitscan | 13 | 780 | 50 | ✔ | auto |
| 4 | Speakeasy Pump | 1932 | Hitscan ×9 | 12 | 70 | 6 |  | semi |
| 5 | Pineapple Grenade | 1932 | Thrown explosive | 120 | 60 | 1 |  | semi, bounces, splash 5m |
| 6 | Siege Crossbow | 1348 | Bolt (gravity) | 90 | 50 | 1 |  | scope, semi |
| 7 | Yew Longbow | 1348 | Bolt (gravity) | 55 | 75 | 1 |  | semi |
| 8 | Plague Handgonne | 1348 | Hitscan ×6 | 20 | 30 | 1 |  | semi |
| 9 | Greek Fire Pot | 1348 | Thrown explosive | 100 | 55 | 1 |  | semi, splash 4.5m |
| 10 | Volk-67 Assault Rifle | 1967 | Hitscan | 19 | 600 | 30 |  | auto |
| 11 | Tokar Service Pistol | 1967 | Hitscan | 20 | 300 | 10 | ✔ | semi |
| 12 | Krasny Scope Rifle | 1967 | Hitscan | 75 | 55 | 5 |  | scope, semi |
| 13 | Sputnik Rocket Launcher | 1967 | Explosive projectile | 40 | 55 | 1 |  | semi, splash 5m |
| 14 | Tesla Arc Projector | 1967 | Beam | 8 | 900 | 80 |  | auto |
| 15 | Rad-Uzi | 1997 | Hitscan | 10 | 950 | 32 | ✔ | auto |
| 16 | Boomstick 97 | 1997 | Hitscan ×10 | 13 | 140 | 2 |  | semi |
| 17 | Mall-Tuber Grenade Launcher | 1997 | Explosive projectile | 20 | 90 | 6 |  | semi, bounces, splash 4.5m |
| 18 | Nail Driver 5000 | 1997 | Bolt (gravity) | 11 | 700 | 60 |  | auto |
| 19 | Laser Tagger Pro | 1997 | Beam | 12 | 420 | 40 |  | auto |
| 20 | Photon SMG | 2145 | Energy projectile | 12 | 720 | 45 | ✔ | auto |
| 21 | Rail Driver | 2145 | Piercing hitscan | 95 | 40 | 4 |  | scope, semi |
| 22 | Katana-7 Monoblade | 2145 | Melee | 70 | 140 | ∞ |  | semi |
| 23 | Swarm Launcher | 2145 | Homing rockets | 18 | 180 | 6 |  | semi, splash 3m |
| 24 | Pulse Scattergun | 2145 | Energy projectile | 11 | 80 | 8 |  | semi |
| 25 | Void Cannon | 2670 | Explosive projectile | 60 | 35 | 2 |  | semi, splash 7m |
| 26 | Graviton Pistol | 2670 | Energy projectile | 24 | 240 | 12 | ✔ | semi |
| 27 | Xeno Spike Rifle | 2670 | Bolt (gravity) | 24 | 360 | 24 |  | auto |
| 28 | Chrono Disruptor | 2670 | Beam | 7 | 1200 | 100 |  | auto |
| 29 | Singularity Grenade | 2670 | Thrown explosive | 150 | 50 | 1 |  | semi, bounces, splash 6.5m |
| 30 | Paradox Minigun | 2670 | Hitscan | 9 | 1500 | 200 |  | auto, spin-up |

**Weapon sets** for arcade: Gangland, Olde Worlde, Cold War, Mall Rats, Neo-Tokyo, Deep Space, Boom Town,
Snipers, Fisticuffs, Random, Everything.

## Characters (53 implemented)

Procedural blocky models: 15 head types (human, zombie, skull, bear, robot, visor, android, alien, xeno, dome,
octo, duck, round, monkey, rift), 27 hats plus extra hair styles, and 19 accessories. Some characters change speed and
size (hit box) slightly. Team colours appear on arm bands; Infection turns skin green.

| # | Character | Era | Unlock |
|---|---|---|---|
| 1 | Capt. Ada Voss | Rift Corps | Start |
| 2 | Rook Mendez | Rift Corps | Start |
| 3 | Dexter "Glitch" Okafor | Rift Corps | Start |
| 4 | Bruno Kowalski | Rift Corps | Start |
| 5 | Big Sal Marzetti | Chicago 1932 | Story: chicago |
| 6 | Vinnie "Two Guns" | Chicago 1932 | Start |
| 7 | Dot Delacroix | Chicago 1932 | Start |
| 8 | Officer O'Malley | Chicago 1932 | Story: chicago |
| 9 | Pip the Bellhop | Chicago 1932 | Challenge: typewriter |
| 10 | Lou the Bookie | Chicago 1932 | 50 kills |
| 11 | Chef Benedetto | Chicago 1932 | Story: chicago (silver) |
| 12 | Undead Mobster | Chicago 1932 | Play infection |
| 13 | Sir Aldric the Rusty | Europe 1348 | Start |
| 14 | Wren of the Wood | Europe 1348 | Start |
| 15 | Doctor Corvus | Europe 1348 | Story: medieval |
| 16 | Motley Mott | Europe 1348 | 150 kills |
| 17 | Queen Isolde | Europe 1348 | Story: medieval (gold) |
| 18 | Brother Tuckwell | Europe 1348 | 5 matches |
| 19 | Mudd the Peasant | Europe 1348 | Start |
| 20 | Rattlebones | Europe 1348 | Challenge: bones |
| 21 | Dr. Irina Volkova | USSR 1967 | Story: soviet |
| 22 | Sgt. Sergei Petrov | USSR 1967 | Start |
| 23 | Cosmonaut Yuri-9 | USSR 1967 | 300 kills |
| 24 | Agent Nadia Krol | USSR 1967 | Challenge: sniper |
| 25 | Comrade Bear | USSR 1967 | Story: soviet (gold) |
| 26 | Automaton R-67 | USSR 1967 | 15 matches |
| 27 | Zack "Kickflip" Rivera | California 1997 | Start |
| 28 | Mall Cop Dwayne | California 1997 | Story: mall |
| 29 | Pixel Patty | California 1997 | Challenge: arcade |
| 30 | Kurt Flannel | California 1997 | 100 kills |
| 31 | Hot Dog Hank | California 1997 | 10 matches |
| 32 | Coral Nakamura | California 1997 | Start |
| 33 | Kage-9 | Neo-Tokyo 2145 | Story: neotokyo |
| 34 | Hikari Star | Neo-Tokyo 2145 | Start |
| 35 | Unit ARIA | Neo-Tokyo 2145 | Story: neotokyo (gold) |
| 36 | Ryo "Chrome" Tanaka | Neo-Tokyo 2145 | 200 kills |
| 37 | Enforcer Drone | Neo-Tokyo 2145 | 20 matches |
| 38 | Byte Moreno | Neo-Tokyo 2145 | Challenge: neon |
| 39 | Sumo-Mech | Neo-Tokyo 2145 | 400 kills |
| 40 | Pvt. Juno Blake | Deep Space 2670 | Start |
| 41 | Grey Emissary | Deep Space 2670 | Story: space |
| 42 | Xeno Drone | Deep Space 2670 | Story: space (silver) |
| 43 | Capt. Orion Vance | Deep Space 2670 | Story: space (gold) |
| 44 | Servo 3000 | Deep Space 2670 | Challenge: survival |
| 45 | Admiral Squelch | Deep Space 2670 | 500 kills |
| 46 | Sgt. Quackers | Bonus | Challenge: melee |
| 47 | Ginger Snapp | Bonus | 30 matches |
| 48 | Professor Banana | Bonus | 750 kills |
| 49 | Frosty Frank | Bonus | 50 matches |
| 50 | Pharaoh Nebu | Bonus | 1000 kills |
| 51 | Dusty Rhodes | Bonus | Challenge: elimination |
| 52 | Chef-Tron | Bonus | Challenge: infection |
| 53 | The Rift King | Bonus | All story missions |

## Multiplayer

### Modes (all implemented)
| Mode | Rules | Bot behaviour |
|---|---|---|
| Deathmatch | Free-for-all, score/time limit | Hunt, grab weapons/health |
| Team Deathmatch | Red vs Blue, shared score | Same, team-aware targeting |
| Capture the Bag | Steal the enemy bag, return it to your base while yours is home; dropped bags return after 20 s or on touch | Attackers/defenders, escort carriers, chase thieves |
| Elimination | Limited lives, last one standing | Same as DM |
| Infection | One random player infected after 6 s; infected kills convert victims; survivors score over time | Clean vs infected alliances |
| Survival | Co-op waves of time-mutants with rising count/skill/weapons; 3 lives | Mutants hunt players |

### Arenas (10 planned)
| # | Arena | Era | Status |
|---|---|---|---|
| 1 | Galleria Grande – mall atrium, fountain, kiosks, mezzanines, arcade, record store | 1997 | **Built** |
| 2 | Castle Morrow – dusk courtyard, stalls, scaffolds, great hall | 1348 | **Built** |
| 3 | Hotel Stiletto – the full story map | 1932 | **Built** |
| 4 | Rail Yard 67 – snowbound trains and cranes | 1967 | Planned |
| 5 | Neon Rooftops – tiered Neo-Tokyo roofs with jump pads | 2145 | Planned |
| 6 | Oblivion Hangar – low-gravity alien hangar | 2670 | Planned |
| 7 | Plague Village – tight streets and a church | 1348 | Planned |
| 8 | Cinema Paradiso – multi-screen theatre with projection booths | 1997 | Planned |
| 9 | Reactor Core – circular lab with hazard pit | 1967 | Planned |
| 10 | Chronoplex – abstract time-hub with portals linking mini-arenas from every era | ∞ | Planned |

Any **Map Maker** map is also a valid arena for every mode (bases/spawns included).

### Bots
Difficulty presets (Easy / Normal / Hard / Expert / Mixed) or per-bot customisation (character, skill, team).
Skill drives reaction time, aim error, turn rate, burst length, trigger cadence, head-shot preference,
projectile lead and combat jumping.

### Split-screen
1–4 local players; horizontal split for 2, quadrants for 3–4. Co-op (same team) or versus in team modes.

## Challenges (9)
Chicago Typewriter · Rattle Their Bones · Cold War Marksman · Mall Rats · Last Stand · Duck Season ·
Last Splitter Standing · Patient Zero · Neon Overdrive — each with bronze/silver/gold targets; medals unlock
characters.

## Map Maker
TS2-inspired: a grid of 4 m tiles (floor, wall, cover crate, 0.45 m step, 0.9 m platform, pillar, window
wall, lit floor, void), items (spawns, weapon slots 1–5, health, armour, red/blue bag bases), 6 visual
themes, sizes 8×8–24×24. Validates spawns, saves to local storage, exports/imports JSON, test-plays instantly.

## Art & audio direction
* PS2-era rendering: 480p soft upscale, baked vertex lighting with ambient occlusion and soft shadows, bloom,
  light halos, blob shadows, ordered dither; 128×128 hand-painted-style procedural textures.
* Detailed PS2-era characters (~9k tris): sculpted faces with 3D eyes, noses, lips and ears, real hairstyles
  (short, long, bob, fringes, spikes, ponytails, pigtails), beards, muscle-shaped limbs, hands with fingers,
  shoes with soles/laces (sneakers for the 1997+ cast), collars, buttons, cuffs, belts, suits, uniforms, hats.
* Warm practical lights, coloured neon, painted skies (night skyline, dusk hills), rain, fog; ACES tone mapping.
* Chunky bevelled buttons, italic heavy type, orange/blue/cyan palette, animated stripes and a time-vortex.
* Synthesized SFX per weapon family, positional stereo; per-level chiptune loops.

## Roadmap
1. Missions 2–6 using the existing level DSL and mission scripting (enemy variety: zombies, robots, aliens).
2. Remaining 7 arenas; jump pads, moving platforms, destructible props.
3. Online play (WebRTC) reusing the command abstraction (commands are already network-friendly).
4. Desktop packaging for Windows (Electron/Tauri wrapper around `dist/`).
5. Performance: instanced/merged character meshes, LODs for 16+ bots in split-screen.
6. Accessibility: remappable controls, colour-blind team palettes, subtitles for mission text.
