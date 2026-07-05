# Open Issues

Tracked tuning, polish, and feature gaps.

## Physics & movement

- [x] **1. Gravity too weak** — players float too long when jumping.
- [x] **2. Jump too high** — reduce launch height slightly.
- [ ] **3. Stamina re-entry too soon** — wait longer after exhaustion before sprint can re-enter.

## Aim & camera feel

- [ ] **4. Arm/torso lag too strong** — tune aim cascade down (shoulder/torso chase rates or shares).
- [x] **5. Walk/sprint bob too strong** — reduce head-bob amplitude in camera feedback (magnitude + frequency tuned).

## Combat feedback

- [x] **6. Muzzle bloom unimpressive** — hide local first-person projectile mesh at muzzle (remote muzzle flash kept).
- [ ] **7. Hit marker misaligned** — height off; not centered over crosshair.
- [ ] **8. Damage-hit cue weak** — vignette/indicator needs a more impactful being-hit cue.

## Weapons & projectiles

- [ ] **9. Grip/hand alignment off** — per-weapon handle-to-hand alignment needs tuning.
- [ ] **10. Large slow projectiles** — add weapon variant(s) with big, slow projectiles for variety.
- [ ] **23. Remote muzzle flash misaligned** — flash sphere not aligned to barrel on opponent held weapons.

## Death & respawn

- [ ] **11. Own weapon visible when dead** — local view-model should hide on death.
- [ ] **12. Look-around while dead** — allow mouse look when dead (currently gated).
- [ ] **13. Respawn timer too simple** — allow manual respawn sooner (shorter minimum delay); still force respawn after a longer cap.

## Loadout & lobby

- [ ] **14. Spawn-only weapon picks** — one primary + one secondary chosen at spawn; mouse wheel swaps between those two in-game (no mid-match catalog cycling).
- [ ] **15. Character picker visuals** — show character models/previews at join, not letter labels.

## Combat tuning

- [ ] **16. TTK too fast** — time-to-kill feels too quick; tune damage, fire rate, or health.

## Input & weapons (future)

- [ ] **17. ADS** — aim-down-sights on right mouse button.
- [ ] **18. Magazine reloads** — ammo magazines with reload flow (not infinite mag).
- [ ] **19. Grenades / extras** — middle mouse hold starts fuse or charges throwable; release or timeout throws/activates.
- [ ] **20. Fire modes** — per-weapon single-fire, burst-fire, and fully-auto toggles where appropriate.
- [ ] **21. Damage drop-off** — projectile/hit damage falls off with travel distance or range.
- [ ] **22. Hit location multipliers** — head/body/limb (or similar) damage multipliers for certain body parts.