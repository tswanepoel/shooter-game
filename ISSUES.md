# Issues

Tracked tuning, polish, and feature gaps.

## Player movement

- [x] **1. Gravity too weak** — players float too long when jumping.
- [x] **2. Jump too high** — reduce launch height slightly.
- [x] **3. Stamina re-entry too soon** — wait longer after exhaustion before sprint can re-enter.
- [ ] **37. Fall damage** — damage or death from significant falls.

## Aim & camera

- [ ] **4. Arm/torso lag too strong** — tune aim cascade down (shoulder/torso chase rates or shares).
- [x] **5. Walk/sprint bob too strong** — reduce head-bob amplitude in camera feedback (magnitude + frequency tuned).
- [ ] **17. ADS** — aim-down-sights on right mouse button.
- [ ] **38. No hip-fire crosshair** — crosshair hidden by default; visual aim aids only while ADS.

## Combat feel

- [x] **6. Muzzle bloom unimpressive** — hide local first-person projectile mesh at muzzle (remote muzzle flash kept).
- [x] **7. Hit marker misaligned** — height off; not centered over crosshair.
- [ ] **8. Damage-hit cue weak** — vignette/indicator needs a more impactful being-hit cue.
- [ ] **24. Hit marker unimpressive** — alignment fixed but feedback still too subtle; needs stronger visual punch.

## Weapons

- [ ] **9. Grip/hand alignment off** — per-weapon handle-to-hand alignment needs tuning.
- [ ] **10. Large slow projectiles** — add weapon variant(s) with big, slow projectiles for variety.
- [ ] **18. Magazine reloads** — ammo magazines with reload flow (not infinite mag).
- [ ] **19. Grenades / extras** — middle mouse hold starts fuse or charges throwable; release or timeout throws/activates.
- [ ] **20. Fire modes** — per-weapon single-fire, burst-fire, and fully-auto toggles where appropriate.
- [ ] **23. Remote muzzle flash misaligned** — flash sphere not aligned to barrel on opponent held weapons.

## Combat rules & tuning

- [x] **16. TTK too fast** — time-to-kill feels too quick; tune damage, fire rate, or health.
- [ ] **21. Damage drop-off** — projectile/hit damage falls off with travel distance or range.
- [ ] **22. Hit location multipliers** — head/body/limb (or similar) damage multipliers for certain body parts.
- [x] **25. Health regen pacing** — longer quiet period after damage before regen starts; faster recovery once it kicks in (`combat.ts` / `GameConfig.cs`).

## Death & respawn

- [ ] **11. Own weapon visible when dead** — local view-model should hide on death.
- [ ] **12. Look-around while dead** — allow mouse look when dead (currently gated).
- [ ] **13. Respawn timer too simple** — allow manual respawn sooner (shorter minimum delay); still force respawn after a longer cap.

## Loadout & lobby

- [ ] **14. Spawn-only weapon picks** — one primary + one secondary chosen at spawn; mouse wheel swaps between those two in-game (no mid-match catalog cycling).
- [ ] **15. Character picker visuals** — show character models/previews at join, not letter labels.
- [ ] **26. Create and join lobbies** — rooms with shareable join flow; room code in URL for easy copy/share.

## Multiplayer sync

- [ ] **27. Remote neck range stiff** — pitch looks good overall, but neck is rigid; trade a little arm range for more neck range on remotes.
- [ ] **28. Remote head jerk** — head snaps on inbound position/aim updates; explore client-side smoothing (interpolation, buffering, or fancier filtering).
- [ ] **29. Harden for real lag** — use Chrome network emulation to stress-test; improve prediction, interpolation, and feedback under latency.

## Map & world

- [ ] **30. Scene dressing** — add props, cover, and vertical elements to the playspace.
- [ ] **35. Map pickups** — placed ammo and grenade replenishment; dead players drop ammo.

## Game modes

- [ ] **32. Mode selection** — choose between FFA, TDM, and Kill Confirmed.

## UI & HUD

- [ ] **31. Minimap** — small tactical map for orientation.
- [ ] **33. Leaderboard (TAB)** — hold TAB to show scoreboard.
- [ ] **34. Leaderboard map overlay** — TAB overlay expands to full-view map; live player models hidden while open.

## Audio

- [ ] **36. Sound effects** — weapon, movement, hit, and UI audio.