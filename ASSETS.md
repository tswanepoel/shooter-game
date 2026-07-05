# Asset catalog

Kenney assets (CC0) and third-party art for future work. Download pages below — import into
`client/public/` when wired into the game.

Already in use locally (see `PLAN.md`):
- `C:\Users\Theunis\Downloads\kenney_blaster-kit_2.1` — weapons, projectiles
- `C:\Users\Theunis\Downloads\kenney_blocky-characters_20` — player characters

Downloaded:
- `C:\Users\Theunis\Downloads\kenney_splat-pack` — 74 PNG splats (+ Vector); not imported
- `C:\Users\Theunis\Downloads\kenney_particle-pack` — 97 transparent PNG particles; not imported
- `C:\Users\Theunis\Downloads\3_Bloodsplats by PWL` — imported to `client/public/ui/bloodsplats/` (#8)

Imported in repo:
- `client/public/ui/bloodsplats/splat{1,2,3}/` — PWL individual frames (wired in `damageOverlay.ts`)

---

## 2D

| Pack | URL | Likely use |
|------|-----|------------|
| Light masks | https://kenney.nl/assets/light-masks | Damage vignette, low-HP pulse, ADS edge darkening (#8, #38) |
| Splat pack | https://kenney.nl/assets/splat-pack | Stylized splats, secondary hit debris (#8) |
| Particle pack | https://kenney.nl/assets/particle-pack | Hit sparks, UI bursts, pickup sparkles (#8, #35) |
| Crosshair pack | https://kenney.nl/assets/crosshair-pack | ADS reticles (#17, #38); hip-fire stays hidden |
| Ranks pack | https://kenney.nl/assets/ranks-pack | Leaderboard rank icons (#33, #34) |
| Smoke particles | https://kenney.nl/assets/smoke-particles | Muzzle smoke, explosions, grenades (#19) |
| Game icons | https://kenney.nl/assets/game-icons | HUD: ammo, grenades, modes, minimap glyphs (#31, #35) |
| Medals | https://kenney.nl/assets/medals | Kill streaks, mode objectives, end-of-match (#32, #33) |
| Input prompts | https://kenney.nl/assets/input-prompts | Key/glyph hints in lobby, loadout, tutorial |
| UI pack | https://kenney.nl/assets/ui-pack | Panels, buttons, frames — lobby, leaderboard, menus (#26, #33) |
| Planets | https://kenney.nl/assets/planets | Skybox / backdrop dressing, minimap icons |
| Blood splat animations | https://opengameart.org/content/blood-splat-animations | **PWL bloodsplats** — primary damage overlay (#8); CC-BY 3.0, credit Phantasmic Wraith |

---

## 3D

| Pack | URL | Likely use |
|------|-----|------------|
| Platformer kit | https://kenney.nl/assets/platformer-kit | Platforms, vertical play (#30) |
| Mini dungeon | https://kenney.nl/assets/mini-dungeon | Cover, corridors, interior blocks (#30) |
| Graveyard kit | https://kenney.nl/assets/graveyard-kit | Theme dressing, death/respawn zone flair |
| Fantasy town kit | https://kenney.nl/assets/fantasy-town-kit | Town-scale backdrop, distant skyline |
| City kit industrial | https://kenney.nl/assets/city-kit-industrial | Wareyards, pipes, urban cover (#30) |
| Blocky characters | https://kenney.nl/assets/blocky-characters | Character roster expansion (#15) |
| City kit suburban | https://kenney.nl/assets/city-kit-suburban | Houses, streets, suburban arena (#30) |
| Building kit | https://kenney.nl/assets/building-kit | Multi-floor structures, verticality (#30) |
| Castle kit | https://kenney.nl/assets/castle-kit | Large landmarks, central map feature |
| Mini arena | https://kenney.nl/assets/mini-arena | Self-contained map block-in (#30, #32) |
| Space kit | https://kenney.nl/assets/space-kit | Sci-fi variant maps, props |
| 3D road tiles | https://kenney.nl/assets/3d-road-tiles | Lanes, intersections, map readability (#31) |
| Furniture kit | https://kenney.nl/assets/furniture-kit | Interior cover, office/room fights |
| Animated characters retro | https://kenney.nl/assets/animated-characters-retro | Alt character style (#15) |
| Animated characters survivors | https://kenney.nl/assets/animated-characters-survivors | Alt roster, locomotion clips (#15, #27) |

---

## #8 damage overlay — asset notes

| Source | Role |
|--------|------|
| **PWL bloodsplats** | Hero overlay — realistic, animated strips (`bloodsplat1` 16 frames, `bloodsplat2` 13, `bloodsplat3` 15) |
| Kenney splat pack | Optional variety layer — flatter/stylized, good for edge accents |
| Kenney particle pack | Short spark burst at impact bearing |
| Light masks | (not downloaded yet) Vignette pulse on hit / low HP |

**Attribution:** PWL pack is CC-BY 3.0 — add credit (e.g. credits screen or `ASSETS.md`) when shipped.

---

## Issue cross-reference

| Issues | Packs to prioritize |
|--------|---------------------|
| #8 damage-hit cue | PWL bloodsplats, splat pack, particle pack, light masks |
| #15 character picker | Blocky characters, animated survivors/retro |
| #17 / #38 aim & ADS | Crosshair pack, light masks |
| #19 grenades | Smoke particles, game icons |
| #26 lobby | UI pack, input prompts |
| #30 scene dressing | Mini arena, building kit, platformer kit, city kits |
| #31–#34 UI / map | UI pack, game icons, ranks, medals, road tiles, planets |
| #32 game modes | Medals, game icons |
| #35 pickups | Game icons, particle pack |