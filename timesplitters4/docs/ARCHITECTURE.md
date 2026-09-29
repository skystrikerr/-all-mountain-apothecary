# Architecture

Plain ES modules + Three.js, bundled by Vite. No game engine, no asset pipeline: geometry, textures,
characters, weapons, sound and music are all generated in code, so the whole game is ~7.5k lines of JS.

```
src/
  main.js                 App shell: renderer, frame loop, screen flow (menus ⇄ game), progression hooks
  engine/                 Game-agnostic building blocks
    collision.js          CollisionWorld: AABB solids, XZ grid broadphase, swept body movement, ray casts (2D DDA)
    nav.js                NavGrid: 2.5D walkable grid sampled from the collision world, A*, path smoothing
    levelBuilder.js       Level DSL (box/wall/floor/stairs/light/spawn/pickup/enemy/trigger…) → merged meshes + solids
    textures.js           Procedural 128×128 painted textures, lit + baked (unlit, flash-lit) material caches, sign text
    lightBaker.js         PS2-style vertex light baking: hemisphere × ambient occlusion + point lights + sun, ray-traced shadows
    postfx.js             Render pipeline: all views → 480p HDR buffer → bloom → grade/vignette → ACES → ordered dither
    sky.js                Painted sky domes (stars, moon/sun, clouds, skyline/hills) and rain
    input.js              Keyboard/mouse (pointer lock) + Gamepad API → per-player "commands"; settings
    audio.js              Synthesized WebAudio SFX with stereo panning + step-sequencer music
  game/                   Gameplay
    game.js               Game: owns one match/mission — level, actors, systems, combat resolution, rendering
    actor.js              Actor: movement physics, health/armour, damage, death — shared by players & AI
    weaponSystem.js       WeaponState: inventory, switching, reload, dual-wield, zoom, spin-up, firing, aim assist
    bot.js                BotBrain: perception → goals → navigation → motor; emits the same commands as a player
    projectiles.js        Swept projectiles (rockets, grenades, bolts, plasma), splash, bounce, homing
    pickups.js            Weapon/health/armour/mission-item pickups, respawn timers, dropped weapons
    effects.js            Pooled tracers/beams, CPU particles, decals, fireballs, flash lights
    modes.js              Arcade modes: Deathmatch, Team DM, Capture the Bag, Elimination, Infection, Survival
    mission.js            Story mode: objectives, scripts, checkpoints, difficulty, medals
    playerView.js         Per-local-player camera, first-person viewmodel, split-screen viewport, HUD state
    characterModel.js     Procedural detailed characters (sculpted heads, hair shells, lathed muscle limbs, hands, shoes,
                          clothing details, hats), merged per bone + cached per character; animation
    characterTextures.js  Painted head wraps (brows, lids, lips, stubble, hairline), shirt/uniform/suit wraps, fabric wraps
    weaponModel.js        Procedural weapon meshes (viewmodel, third-person, pickups)
    progress.js           localStorage progression: medals, stats, unlocks
  content/                Pure data (easy to extend)
    weapons.js            30 weapons + weapon sets
    characters.js         53 characters (look, bio, unlock rule, stats)
    campaign.js           6 story missions
    challenges.js         9 challenges with metrics and medal thresholds
    levels/               chicago.js (story + arena), galleria.js, castle.js, custom.js (Map Maker), props.js
  ui/
    menu.js               All menu screens, spatial gamepad navigation
    hud.js                DOM HUD per viewport (diffed updates)
    editor.js             Map Maker
    menuScene.js          3D menu backdrop; preview.js — roster character preview
    styles.css            Menus + HUD styling
```

## Frame loop

```
App._loop (requestAnimationFrame)
 ├─ Game.update(dt)                       dt clamped to 50 ms; timeScale for end-of-match slow-mo
 │   ├─ input.read(view.source) → cmd     one command per local player (kbm and/or pad index)
 │   ├─ Actor.applyCommand(cmd)           look, crouch, accelerate, jump, gravity, CollisionWorld.moveBody, weapons
 │   ├─ BotBrain.update() → cmd → Actor.applyCommand(cmd)
 │   ├─ _separateActors()                 soft body-vs-body collision
 │   ├─ Projectiles / Pickups / Mode / Effects / level animations / light flicker
 │   ├─ PlayerView.update()               camera, viewmodel animation, HUD timers
 │   └─ Hud.update()
 ├─ Game.render()                         per viewport: scissor → world scene → clear depth → viewmodel scene
 ├─ Menu.update()                         gamepad/keyboard menu navigation (menus are DOM overlays)
 └─ input.endFrame()                      clears edge-triggered inputs
```

## Key design decisions

**One command format for humans and AI.** `engine/input.js` produces
`{moveX, moveY, lookX, lookY, fire, fireAlt, firePressed, jump, crouch, reload, …}`. `BotBrain.update()` returns
exactly the same structure. Actors therefore share all movement, collision, weapon and animation code — bots
can't cheat on movement speed or fire rate, and a bot can be dropped into any player slot.

**Everything is an AABB.** Levels are built from boxes (PS2-era blockiness is the art style). Solids live in a
uniform 4 m XZ grid. Body movement is axis-separated with sub-stepping, step-up for ≤0.45 m ledges,
depenetration, and "only solids ahead of you block you" so a body grazing a long wall can never be snapped to its
far end (there's a regression test for this). Hitscan uses a 2D DDA through the grid; actors have separate
body and head boxes for headshots.

**Levels are code.** `LevelBuilder` exposes a tiny DSL (`box`, `wallX(z, x1, x2, {doors})`, `floor`,
`stairs`, `cylinder`, `light`, `spawn`, `pickup`, `enemy`, `trigger`, `marker`, `base`). Visible boxes are
merged into one mesh per material with world-space UVs, so a whole hotel costs ~30 draw calls. Arena weapon
pickups use `slot1..slot5`, which the chosen weapon set fills in — any arena works with any weapon set.

**Navigation from collision.** `NavGrid` samples the collision world on a 1 m grid (lowest walkable floor ≤
`navMaxFloor`, clearance checked above step height), connects cells within climbable height, and is pruned to
cells reachable from spawns. Paths are A* with octile heuristic, then string-pulled with a grid line test.

**Bot layers.**
1. *Perception* every 0.15 s: FOV cone (wider when alert) + LOS to chest or head; hearing via `game.noise()`
   (gunshots 40 m, footsteps 7 m, explosions 60 m); damage reveals the attacker; squad alerts spread within a group.
2. *Goals*: fight a visible target → search last known position → mode objective (`mode.botGoal`, e.g. bags) →
   pickups (health when hurt, better weapons, dual-wield upgrades, armour) → hunt / roam. Story enemies guard a
   post or patrol a route until alerted, then hunt.
3. *Navigation*: A* path following with periodic repaths; stuck detection → jump → unstick toward the nav cell
   centre → repath.
4. *Motor*: strafe with random direction changes, keep a preferred range per weapon, turn-rate-limited aim
   with shrinking error, projectile lead, ballistic arcs for grenades/bows, burst fire, trigger cadence for
   semi-autos, avoidance of point-blank splash weapons. Everything scales with `skill` (0–1).

**Modes are small classes** with hooks: `setup`, `update`, `onKill`, `canRespawn`, `canPickup`, `botGoal`,
`ranking`, `hudLine`, `timeLeft`, `winnerText`. Team membership and friendliness go through
`game.areEnemies(a, b)`, so Infection (clean vs infected) and co-op Survival (players vs NPCs) need no special
cases elsewhere.

**Missions are data + hooks.** A level's `mission` lists objectives (`reach` a trigger, `collect` an item,
`kill` a tagged actor, `killGroup`, `custom`) with `onStart`/`onComplete` hooks that get a small context
(`spawnGroup`, `message`, `sound`, `alertAll`, `flags`). Enemies can be `dormant: 'groupName'` and spawn
already-alert when a hook calls `spawnGroup`. Completing an objective saves a checkpoint.

**Split-screen** is one renderer with scissored viewports. Each local player's body is on its own render
layer so their camera doesn't see their own model; each view has a separate viewmodel scene rendered after a
depth clear. HUD panels are positioned DOM overlays matching the viewport rectangles.

**PS2 look.** The frame is rendered like a 2002 console game:
* *Resolution*: all views render into one 480-line HDR buffer (576p/720p/native selectable), upscaled bilinearly
  for the soft TV look; a faint 4×4 ordered dither mimics the PS2's 16-bit framebuffer.
* *Baked vertex lighting*: level boxes are tessellated into ~1 m quads; `lightBaker.js` gives every vertex
  hemisphere light × ambient occlusion (10 hemisphere rays) plus each static point light and the sun with
  soft ray-traced shadows (3 jittered samples), in the same units as three.js Lambert (÷π) so baked walls and
  realtime-lit characters match. Levels render unlit (`MeshBasicMaterial × vertex colour`); a small shader hook
  adds the 3 dynamic flash lights (muzzle flashes, explosions) on top. Baking a whole level takes < 1 s at load.
* *Glow*: light fixtures get additive halo sprites; emissive signage is over-bright and picked up by bloom.
* *Shadows*: no shadow maps — static shadows are baked, actors get blob shadows.
* *Characters* (~9k triangles, ~25 draw calls each): the head is a sphere deformed by a sculpt function (jaw, chin,
  cheekbones, brow ridge, eye sockets) with 3D eyeballs/irises, a modelled nose, lips, eyelids and ears; hair and
  beards are shells cut from the same surface by a per-style coverage function, which also paints the matching
  hairline into a 512×256 head texture. Bodies are lathe profiles with muscle shape, hands have curled fingers,
  clothing has modelled collars/buttons/cuffs/belts plus wrap textures. Parts are merged into one multi-material
  mesh per bone and the result is cached per character, so spawning a repeat character is ~0.3 ms.
* *Materials*: 128×128 painted textures (bevels, grime, grain) with mipmapped bilinear + anisotropic filtering;
  guns use Phong specular plus a painted reflection env-map; characters use rounded, smooth-shaded limbs with
  painted faces and clothing.
* *Atmosphere*: painted sky domes, fog, rain, colour grade + vignette, ACES tone mapping.

## Extending

* **Weapon**: add a `def({...})` entry in `content/weapons.js` (pick `kind`, stats, optional `projectile`,
  `view` params for the procedural model). It immediately works for players, bots, pickups and weapon sets.
* **Character**: add a `ch(...)` entry in `content/characters.js` (look = colours, head shape, hat, extras;
  unlock rule). New hats/heads go in `characterModel.js`.
* **Arena**: create `content/levels/<name>.js` exporting `{ id, name, era, env, navMaxFloor, build(L) }`, add
  spawns (with optional team), `slotN` weapon pickups, health/armour and two `base`s for Capture the Bag;
  register it in `levels/index.js`. `npm test` validates placements and connectivity automatically.
* **Mission**: give a level a `mission` object and `L.enemy(...)` placements when `build(L, { story: true })`.
* **Mode**: subclass `Mode` in `game/modes.js`, add it to `MODE_INFO` and `createMode`.
