# Aim Architecture — Compliance Checklist

Verification checklist derived from [AIM.md](./AIM.md). Each item is observable, measurable, or assertable in code/tests.

---

## Agent Model

- [x] Agent is modeled as pelvis → torso → head → single shooting arm (no separate shoulder yaw)
- [x] Two distinct lines exist: **ocular line** (camera / screen centre) and **weapon line** (reticle, gun attitude, bullets)
- [x] Chain is strictly serial: input → ocular line → head → torso → arm → weapon line
- [x] Input is gaze in world space (azimuth + elevation)

---

## Azimuth (Horizontal)

- [x] Ocular line snaps to commanded azimuth instantly (no delay, no limit)
- [x] Head lags ocular line; torso lags head
- [x] Arm has no yaw joint: arm azimuth equals torso azimuth
- [x] After input stops, all links converge; weapon–ocular azimuth separation → 0
- [x] **Sanity test:** turn fast, then stop → reticle returns to screen centre

---

## Elevation (Vertical)

- [x] Ocular line snaps to command but is capped short of ±90° (view never reaches vertical)
- [x] Head lags ocular; torso lags head; arm lags torso via shoulder pitch
- [x] Arm is **not** capped at the ocular bound; past the cap the arm keeps absorbing its share
- [x] At rest, weapon–ocular elevation separation is generally non-zero (large near the cap)
- [x] **Sanity test:** max look-up → reticle sits above screen centre while view stops short of vertical

---

## Range Budget (Per Axis)

- [x] Commanded rotation is split into shares per link (ocular included)
- [x] Shares on each axis sum to exactly 1
- [x] Ocular share is applied instantly; remaining shares propagate through lag
- [x] On elevation, ocular share is clipped at the cap; lower links still deliver their full shares
- [x] **Diagonal constraint:** total lagged share on elevation equals total lagged share on azimuth
- [x] **Sanity test:** fast diagonal flick → equal screen-space lag in X and Y (no vertical curve or horizontal slide)
- [x] Tuning one axis alone does not break the other (budgets are paired)

---

## Weapon Line Construction

- [x] Weapon line is built from ocular line in this order:
  1. Azimuth separation (world vertical axis)
  2. Elevation separation (ocular lateral axis)
- [x] Reversed order is not used (would mix axes on diagonal input)
- [x] Azimuth separation is non-zero only while the chain is catching up
- [x] Elevation separation reflects the pose budget and persists at rest

---

## Hard Rules (Must Never Violate)

- [x] Reticle direction = weapon mesh attitude = projectile direction (one weapon line, always)
- [x] No extra smoothing on reticle or weapon beyond the serial chain
- [x] Shares sum to 1 per axis; lagged totals equal across axes

---

## First-Person View

- [x] Weapon mesh is head-fixed
- [x] Weapon mesh expresses the same weapon–ocular separation as the reticle
- [x] One consistent convention for azimuth sign (local vs world); no mixed conventions
- [x] Weapon uses rotation only — no translational shove of the mesh

---

## Third-Person View

- [x] Root (pelvis/torso) carries absolute gaze azimuth exactly once
- [x] Child joints (torso pitch, neck pitch/yaw, arm pitch) apply **relative** offsets only
- [x] No child joint re-applies absolute azimuth (no double-counting)
- [x] **Sanity test:** observer watching a 90° turn sees one clean body rotation, no corkscrew

---

## Automated / Instrumentation Checks (Optional but Strong)

- [x] At rest: `weaponAzimuth - ocularAzimuth ≈ 0`
- [x] At max elevation cap at rest: `weaponElevation - ocularElevation > 0` (or configured threshold)
- [x] During motion: `sum(shares) === 1` per axis
- [x] `sum(laggedShares.azimuth) === sum(laggedShares.elevation)`
- [x] Projectile spawn direction equals reticle ray direction (within float tolerance)
- [x] Third-person joint angles are relative to parent, not world gaze duplicated downstream

---

## Spec Acceptance Table

| Test | Pass condition | Status |
|------|----------------|--------|
| Turn, then stop | Azimuth separation → 0; reticle recentres | Pass |
| Fast diagonal flick | Screen-space lag equal in X and Y | Pass |
| Max look-up | Reticle above centre; view below vertical | Pass |
| Observed 90° turn | One body rotation; no corkscrew | Pass |

---

Use the sanity tests for manual QA; use the hard rules and budget constraints for code review and unit/integration tests. Anything that fails a hard rule is non-compliant regardless of how it feels in play.