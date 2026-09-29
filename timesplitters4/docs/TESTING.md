# Testing

## Automated

```bash
npm test          # Node's built-in test runner, ~5 s
npm run smoke     # headless Chromium via Playwright, ~6–8 min (SMOKE_FAST=1 for a shorter run)
```

### `npm test` (tests/*.test.js)
| File | What it proves |
|---|---|
| `collision.test.js` | Gravity/landing, wall sliding, step-up onto ≤0.45 m ledges but not crates, ray casts & normals, multi-cell DDA, and a regression test that a body grazing a long wall is not teleported to its far end |
| `nav.test.js` | A* finds routes through doors, fails for sealed rooms, keeps agent clearance from walls |
| `content.test.js` | ≥30 unique weapons with valid archetypes, ≥6 dual-wieldable; weapon sets reference real weapons; ≥50 unique characters; 6 campaign missions; all 6 modes; sane challenge thresholds |
| `levels.test.js` | For every level (story & arena variants, plus the default Map Maker map): every spawn, enemy and pickup is in open space above ground, every spawn/enemy is reachable on the nav grid, story items/triggers/markers/boss exist |

`levels.test.js` is the safety net for level design: move a crate on top of a spawn and it fails with the
exact coordinates.

### `npm run smoke` (scripts/smoke.mjs)
Starts Vite, launches Chromium with SwiftShader WebGL and fails on any page error or console error:
1. Title → main menu → every menu screen renders.
2. **Every arena × every mode** (3 × 6) with 7 bots, 45 s of accelerated simulation each; asserts combat
   happened (shots or damage) and reports kills, team scores and survival waves.
3. Two-player split-screen.
4. **Story mission end-to-end**: objectives are driven in order (enter → ledger → crystal → boss spawns and is
   killed → portal) and the mission must report success with a medal.
5. Pause/resume, mission failure → "Retry from checkpoint".
6. Story on Hard with AI shooting at a god-mode player for 20 s.
7. A Map Maker map, a challenge, and the results screen.

Screenshots land in `scripts/shots/` (git-ignored).

### Other dev scripts
* `node scripts/views.mjs [filter]` — framed screenshots of each room/arena for visual review.
* `node scripts/lineup.mjs [startIndex]` — renders 7 characters side by side (idle, running, crouching) for model review.
* `node scripts/balance.mjs` — measures damage-per-second a single enemy deals per weapon and difficulty
  (current targets: Easy ≈ 4–7, Normal ≈ 11–12, Hard ≈ 14–27).
* `node scripts/botdebug.mjs <level> <mode>` — prints every bot's position, goal, path and target every 10 s.

## Manual play-test checklist

**Controls & feel**
- [ ] Click the game to capture the mouse; WASD + mouse feel responsive; Esc releases the mouse and pauses.
- [ ] Jump onto the Galleria mezzanine steps and a crate; crouch under nothing, uncrouch is blocked under low ceilings.
- [ ] Plug in a controller: left/right sticks, RT/LT fire, A jump, Y switch; auto-aim nudges shots (Options → Controller auto-aim).

**Weapons**
- [ ] Story: start with the Stiletto; kill a pistol mobster and walk over his gun → "DUAL STILETTO" and two viewmodels; left/right click fire each gun.
- [ ] Tommy gun recoil/bloom widens the crosshair; the crosshair turns red over enemies; hit markers (white body, yellow head, red kill).
- [ ] Pineapple grenade arcs and bounces; Sputnik rocket splashes and knocks back; Krasny scope zooms with right click.
- [ ] Arcade with weapon set "Everything" to try all 30 weapons (1–9 or Q to cycle).

**Story (Chicago 1932)**
- [ ] Objective text + yellow ◆ marker lead you: lobby → office ledger → vault crystal (alarm) → Big Sal on the stage → portal.
- [ ] Entering the kitchen triggers the ambush; guards alert each other when you fire.
- [ ] Die → "Mission Failed" → retry from checkpoint puts you at the last objective with your weapons.
- [ ] Finishing shows time, kills, accuracy and a medal matching the difficulty; completing it unlocks characters.

**Arcade**
- [ ] Every mode on every arena with 7+ bots; Capture the Bag shows bags on radar and scores captures.
- [ ] Customise bots: per-bot character/skill/team; Mixed difficulty.
- [ ] 2–4 player split-screen with gamepads (P1 on keyboard & mouse).
- [ ] Tab shows the scoreboard; results screen shows awards and "NEW CHARACTER UNLOCKED" pop-ups.

**Map Maker**
- [ ] Paint walls, cover, steps, platforms and items; Test Play spawns you with 3 bots; results → Continue returns to the editor.
- [ ] Save, reload the page, load the saved map; it appears in Arcade's arena list; Export/Import JSON round-trips.

**Performance**
- [ ] Options → Show FPS. Target 60 fps at 1080p on a mid-range GPU with 8 bots; the default PS2 (480p) resolution keeps GPU cost low; Options → Render resolution trades sharpness for speed.
