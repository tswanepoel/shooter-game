# Aim architecture

Specification of a block humanoid’s pointing behaviour in first person. What the body must do, not how it is programmed.

---

## Model

Two lines, one functional chain, one presentation track.

- **Ocular line** — where the eyes look. First-person camera rotation; screen centre.
- **Weapon line** — where the gun points. Reticle, weapon attitude, and projectile direction are this one line.

**Functional chain** (drives the weapon line and reticle lag):

input → ocular line → torso → shoulder → weapon line

Input commands a gaze (azimuth + elevation, world space). The ocular line responds instantly. Torso and shoulder each lag the link above them.

**Presentation track** (third-person neck/head silhouette only):

input → neck cosmetic

Neck pitch and yaw chase the command on their own rates. They shape how other players read the figure. The weapon line runs through torso and shoulder only.

## Per-Axis Behaviour

### Azimuth (horizontal)

1. Ocular line snaps to the command instantly.
2. Torso lags the ocular line.
3. Arm azimuth equals torso azimuth.
4. At rest (input held), torso and ocular line converge. Weapon–ocular azimuth separation → 0.

### Elevation (vertical)

1. Ocular line snaps to the command instantly, capped short of ±90°.
2. Torso lags the ocular line.
3. Shoulder pitch lags the torso.
4. Shoulder pitch keeps its full budget past the ocular cap, so the weapon line reaches elevations the ocular line cannot.
5. At rest, links settle into a partitioned pose. Weapon–ocular elevation separation is generally non-zero — large near the cap. The reticle sitting off-centre at max look-up is intended.

## First-Person Camera

- **Rotation** follows the ocular command directly.
- **Position** sits at the eye offset on the head bone (head-mounted placement).
- Camera rotation and weapon-line lag are separate: the view turns instantly; torso and shoulder carry the lag that separates reticle from screen centre.

## Range Budget

On each axis, the functional chain splits the commanded rotation into shares (ocular included). Shares sum to exactly 1.

- Ocular share: applied instantly.
- Remaining shares: propagate through torso and shoulder via lag.
- On elevation, the ocular share is clipped at the cap; torso and shoulder still deliver their full shares.

Neck cosmetic has its own bend budget (`headCosmetic` in config). It serves the presentation track and sits outside the weapon-line budget.

**Diagonal constraint:** total lagged share on elevation equals total lagged share on azimuth. Unequal budgets make diagonal flicks curve (vertical-heavy) or slide (horizontal-heavy) on screen. Tune both axes together.

## Weapon Line Construction

Build the weapon line from the ocular line by applying, **in this order**:

1. Azimuth separation, rotated about world vertical.
2. Elevation separation, rotated about the ocular lateral axis.

Reversed order mixes axes on diagonal input.

- Azimuth separation: non-zero only while the chain is catching up.
- Elevation separation: set by the pose budget; persists at rest.

Sample the weapon line from the arm-mounted rig after torso and shoulder aim pivots are applied.

## First-Person View

- Weapon mesh is parented to the shooting arm.
- Weapon mesh expresses the same weapon–ocular separation as the reticle.
- One consistent convention for azimuth sign (local vs world).
- Rotation only on the weapon mesh.

## Third-Person View

- Root (pelvis/torso) carries the absolute gaze azimuth once.
- Child joints (torso pitch, neck pitch/yaw, arm pitch) apply relative offsets only.
- Neck cosmetic offsets sit on the presentation track; torso and arm offsets carry the functional aim chain.

## Hard Rules

1. Reticle = weapon attitude = projectile direction. One weapon line, always.
2. Reticle and weapon inherit lag solely from the torso–shoulder functional chain.
3. Functional shares sum to 1 per axis; lagged totals equal across axes.

## Acceptance Checks

| Test | Pass condition |
|------|----------------|
| Turn, then stop | Azimuth separation decays to zero; reticle recentres |
| Fast diagonal flick | Screen-space lag equal in X and Y |
| Max look-up | Reticle above centre while view is below vertical |
| Observed 90° turn | Reads as one body rotation, no corkscrew |