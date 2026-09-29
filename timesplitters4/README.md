# TimeSplitters 4 — Fan Prototype (Three.js)

An **unofficial, non-commercial fan project**: a fast, arcade-style first-person shooter in the spirit of
TimeSplitters 2 and Future Perfect, built from scratch with **Three.js** and plain JavaScript modules.
Every character, level, texture, sound and piece of music is original and generated procedurally in code —
there are no external art or audio assets.

> Not affiliated with or endorsed by the TimeSplitters rights holders.

## What's playable right now (vertical slice)

| Area | Status |
|---|---|
| **FPS controller** | Run/strafe, jump, crouch, step-up, head-bob, landing dip, recoil kick, screen shake. Keyboard + mouse (pointer lock) and gamepad with response curve and optional console-style auto-aim |
| **Weapons** | **All 30 weapons** are functional (the brief asked for 3): hitscan, shotgun pellets, piercing rail, projectiles with gravity / splash / bounce / homing, thrown grenades, melee, scopes, minigun spin-up. **Dual-wielding**: pick up a second pistol/SMG to carry one in each hand |
| **Enemy AI** | Sight cones + line of sight, hearing gunfire and footsteps, squad alerts, reaction time, skill-based aim error, burst fire, strafing, A* navigation, pickup seeking, stuck recovery |
| **Story mission** | **Chicago 1932 — The Hotel Stiletto**: a street, lobby, speakeasy, kitchen, ballroom, card room, loading dock, Sal's office and the vault. 5 objectives, scripted ambush, alarm reinforcements, a boss, a time portal, checkpoints, 3 difficulties → bronze/silver/gold medals |
| **Arcade** | 3 arenas (Galleria Grande 1997 mall, Castle Morrow 1348, Hotel Stiletto) + your own Map Maker maps; **Deathmatch, Team Deathmatch, Capture the Bag, Elimination, Infection, Survival** |
| **Bots** | Up to 15, difficulty presets or per-bot character / skill / team |
| **Local split-screen** | 1–4 players (P1 keyboard & mouse, others on gamepads), co-op or versus |
| **Characters** | 53 original characters with procedural blocky models; unlocked through story medals, challenges, kills and matches |
| **Challenges** | 9 challenges with bronze/silver/gold targets |
| **Map Maker** | TS2-style tile editor: 9 tile types, spawns, weapon slots, health, armour, bag bases, 6 themes; save/load/export/import JSON; test-play instantly |
| **Menus & HUD** | Chunky early-2000s menus with animated time-vortex backdrop, health/armour bars, ammo (dual counters), dynamic crosshair, hit markers, damage direction, radar, objective marker, kill feed, scoreboard, sniper scope, results screen with awards |
| **Graphics** | PS2-style pipeline: 480p soft upscale, baked vertex lighting (ambient occlusion + soft shadows), bloom, light halos, blob shadows, ordered dither, painted 128px textures, painted skies, rain; detailed sculpted characters (faces with 3D eyes/noses/lips/ears, hairstyles, beards, fingers, clothing details, hats); shiny env-mapped guns |
| **Audio** | Fully synthesized WebAudio SFX with stereo positioning + chiptune music sequencer |

The complete game plan (6 campaign eras, 10 arenas, all weapons and characters, roadmap) is in
[`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md); code structure in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md);
how to test in [`docs/TESTING.md`](docs/TESTING.md).

## Run it

Requires Node.js 18+ (works on Windows, macOS and Linux).

```bash
cd timesplitters4
npm install
npm run dev          # open http://localhost:5173
```

Production build (static files you can host anywhere or open through any static web server):

```bash
npm run build        # outputs dist/
npm run preview      # serves dist/ at http://localhost:4173
```

On Windows, run the same commands in PowerShell or Command Prompt. Chrome, Edge or Firefox recommended.

### Shortcuts for development

| URL | Effect |
|---|---|
| `/?quick=story` | Jump straight into the Chicago mission (`&diff=easy|normal|hard`) |
| `/?quick=arcade&level=castle&mode=capturebag&bots=7&set=future` | Jump straight into an arcade match |
| `/?unlock=1` | Unlock every character for this session |

## Controls

| Action | Keyboard & mouse | Gamepad |
|---|---|---|
| Move / look | WASD / mouse (click the game to capture it) | Left stick / right stick |
| Fire (right hand) | Left click | RT |
| Fire left hand (dual) / zoom (scoped) | Right click | LT |
| Jump / crouch | Space / Ctrl or C | A / B or L3 |
| Reload | R | X |
| Switch weapon | Q, mouse wheel, 1–9 | Y, RB / LB |
| Scores / pause | Tab / Esc or P | Back / Start |

Menus work with mouse, keyboard (Tab/Enter/Esc) or gamepad (D-pad/stick, A, B).

## Tests

```bash
npm test             # unit tests: collision, navigation, content counts, level placement & connectivity
npm run smoke        # headless Chromium: every arena × mode with bots, story mission flow, split-screen, menus
```

See [`docs/TESTING.md`](docs/TESTING.md) for the manual play-test checklist.
