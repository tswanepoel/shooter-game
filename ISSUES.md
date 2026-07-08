# Issues

Tracked tuning, polish, and feature gaps.

## Player movement

- [x] **1. Gravity too weak** — players float too long when jumping.
- [x] **2. Jump too high** — reduce launch height slightly.
- [x] **3. Stamina re-entry too soon** — wait longer after exhaustion before sprint can re-enter.
- [ ] **37. Fall damage** — damage or death from significant falls.
- [x] **51. Baseline walk speed too fast** — default movement/sprint pacing feels quicker than intended.
- [ ] **56. Walk up any box corner** — player can scale box corners, including very tall crates/containers.
- [ ] **57. Momentum lost stepping off boxes** — walking or sprinting off an edge drops horizontal carry; only jumping off preserves momentum.
- [ ] **58. Blocked at some box edges** — certain box ledges won't let the player walk off cleanly, as if an invisible wall blocks the drop.

## Aim & camera

- [x] **4. Arm/torso lag too strong** — tune aim cascade down (shoulder/torso chase rates or shares).
- [x] **5. Walk/sprint bob too strong** — reduce head-bob amplitude in camera feedback (magnitude + frequency tuned).
- [ ] **17. ADS** — aim-down-sights on right mouse button.
- [ ] **38. No hip-fire crosshair** — crosshair hidden by default; visual aim aids only while ADS.
- [x] **44. Crosshair jitters when turning** — horizontal look causes the crosshair to shake or stutter side to side.
- [x] **45. Aim lag unbalanced on diagonals** — crosshair trails mouse through the body-part cascade; up/down vs left/right feel mismatched, and fast diagonal flicks produce a strong vertical arc with weak horizontal follow.

## Combat feel

- [x] **46. No fire while sprinting** — local shots blocked during sprint.
- [x] **6. Muzzle bloom unimpressive** — hide local first-person projectile mesh at muzzle (remote muzzle flash kept).
- [x] **7. Hit marker misaligned** — height off; not centered over crosshair.
- [x] **8. Damage-hit cue weak** — vignette/indicator needs a more impactful being-hit cue.
- [x] **24. Hit marker unimpressive** — alignment fixed but feedback still too subtle; needs stronger visual punch.
- [ ] **63. Fire kick through body to camera** — shots need recoil that drives real motion through the aim cascade (arms/torso) and ultimately the head-mounted camera, not cosmetic weapon-mesh-only kick.

## Weapons

- [x] **9. Grip/hand alignment off** — per-weapon handle-to-hand alignment needs tuning.
- [ ] **10. Large slow projectiles** — add weapon variant(s) with big, slow projectiles for variety.
- [ ] **18. Magazine reloads** — ammo magazines with reload flow (not infinite mag).
- [ ] **19. Grenades / extras** — middle mouse hold starts fuse or charges throwable; release or timeout throws/activates.
- [ ] **20. Fire modes** — per-weapon single-fire, burst-fire, and fully-auto toggles where appropriate.
- [x] **23. Remote muzzle flash misaligned** — flash sphere not aligned to barrel on opponent held weapons.
- [ ] **62. Weapon swap needs motion** — scrolling to the other slot is an instant swap; needs a visible transition (holster/draw, arm motion, or similar) when switching primary/secondary.

## Combat rules & tuning

- [x] **16. TTK too fast** — time-to-kill feels too quick; tune damage, fire rate, or health.
- [ ] **21. Damage drop-off** — projectile/hit damage falls off with travel distance or range.
- [ ] **22. Hit location multipliers** — head/body/limb (or similar) damage multipliers for certain body parts.
- [x] **25. Health regen pacing** — longer quiet period after damage before regen starts; faster recovery once it kicks in (`combat.ts` / `GameConfig.cs`).

## Death & respawn

- [x] **11. Own weapon visible when dead** — local view-model should hide on death.
- [x] **13. Respawn timer too simple** — manual respawn after short min delay; no server forced respawn (player chooses when).
- [x] **47. Death camera stuck** — when the player dies, the camera does not move to the death-pose vantage point.

## Loadout & lobby

- [x] **14. Spawn-only weapon picks** — one primary + one secondary chosen at spawn; mouse wheel swaps between those two in-game (no mid-match catalog cycling).
- [x] **59. Wheel to empty slot breaks avatar** — scrolling onto an unarmed/empty slot leaves the local character giant with vertical gaps between body parts (salami-cut); this is real world state, not a visual glitch — the player ends up viewing the map from far above.
- [x] **60. Wheel should skip empty slots** — mouse wheel must not select empty primary/secondary slots; only swap to the other slot when it has a weapon equipped.
- [ ] **61. Spectate not implemented** — loadout overlay exposes a Spectate action, but it only dismisses the menu; no spectator camera or match observation flow exists yet.
- [x] **15. Character picker visuals** — show character models/previews at join, not letter labels.
- [x] **26. Create and join lobbies** — rooms with shareable join flow; room code in URL for easy copy/share.
- [x] **48. Loadout picker pre-selects blanks** — after joining, the loadout overlay shows default empty primary/secondary slots; require explicit player choices with no pre-filled selection.
- [x] **49. Overlapping primary/secondary weapon pools** — primary slot can pick weapons that belong in secondary; each slot's catalog should be disjoint.

## Multiplayer sync

- [x] **27. Remote neck range stiff** — pitch looks good overall, but neck is rigid; trade a little arm range for more neck range on remotes.
- [ ] **28. Remote head jerk** — head snaps on inbound position/aim updates; explore client-side smoothing (interpolation, buffering, or fancier filtering).
- [ ] **29. Harden for real lag** — use Chrome network emulation to stress-test; improve prediction, interpolation, and feedback under latency.

## Map & world

- [x] **30. Scene dressing** — add props, cover, and vertical elements to the playspace.
- [ ] **35. Map pickups** — placed ammo and grenade replenishment; dead players drop ammo.
- [x] **52. Lighting too low** — overall scene brightness needs a bump.
- [x] **53. Shadows too dark** — shadow intensity/fill is heavier than intended.
- [x] **54. Walls too dark** — perimeter wall materials read too dim.
- [x] **55. Boxes too dark** — crate/container/platform surfaces need more lift.

## Game modes

- [ ] **32. Mode selection** — choose between FFA, TDM, and Kill Confirmed.

## UI & HUD

- [ ] **31. Minimap** — small tactical map for orientation.
- [ ] **33. Leaderboard (TAB)** — hold TAB to show scoreboard.
- [ ] **34. Leaderboard map overlay** — TAB overlay expands to full-view map; live player models hidden while open.
- [x] **39. Drop health bar** — vignette/splat cues are enough; remove the health bar from HUD.
- [x] **40. Stamina bar low value** — stamina bar isn't useful enough to keep; remove or replace with subtler feedback.
- [x] **41. Remove aim debug overlay** — lose the on-screen angle debug HUD.
- [ ] **42. Weapon HUD visuals** — weapon indicator is text-only; needs a proper visual (icon, silhouette, or view-model hint).
- [ ] **43. FPS and ping overlay** — show frame rate and network latency (debug/readout HUD).
- [x] **50. Spawn flash before scene ready** — brief blank or unlit frame right after join/spawn; something renders before the proper scene/assets are in place.

## Audio

- [ ] **36. Sound effects** — weapon, movement, hit, and UI audio.