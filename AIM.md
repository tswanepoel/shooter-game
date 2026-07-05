# Aim architecture

Specification of a block humanoid’s pointing behaviour in first person. What the body must do, not how it is programmed.

---

## The agent

A simplified humanoid: pelvis, torso, head, and a single shooting arm. No shoulder yaw — the arm’s horizontal bearing is that of thpastedCan you explain this better without rambling?Resolved to clarify aiming system architecture conciselyResolved to clarify aiming system architecture conciselyHere's the core idea, stripped down:
The setup. A first-person character has two separate "lines": where the eyes look (the ocular line, which is your camera/screen centre) and where the gun points (the weapon line, which is your reticle and where bullets go). They're connected by a chain of body parts: eyes → head → torso → arm → weapon.
How aiming works. When you move the mouse, the eyes snap to the new direction instantly. Everything downstream follows with lag: the head chases the eyes, the torso chases the head, the arm chases the torso. The gun is bolted to the arm, so the reticle trails behind screen centre while you're turning and catches up when you stop.
One quirk per axis:

Horizontal (azimuth): the arm has no side-to-side joint of its own — it just points wherever the torso points. Once you stop turning, everything lines up and the reticle returns to centre.
Vertical (elevation): the eyes can't look fully up or down — the camera is capped short of vertical. But the arm has its own shoulder pitch and keeps rotating past that cap. So at extreme look-up, your view has stopped but the gun is still angled further up — which is why the reticle drifts away from screen centre there. That's deliberate.

The budget. Each axis divides the total commanded rotation into shares: some to the eyes (instant), the rest absorbed through the lagging chain. All shares must sum to 100% of the input, and the total lag on the vertical axis must equal the total lag on the horizontal axis — otherwise diagonal mouse movements curve on screen instead of moving straight.
Three hard rules:

The reticle, the gun model's angle, and the bullet's direction are all the same thing — the weapon line. They must never disagree.
Don't add extra smoothing to the reticle or weapon on top of the chain — that desyncs what you see from what the body is doing.
For other players watching, only the root (pelvis/torso) rotates with your full turn; head, neck, and arm joints only add their relative offsets. Applying the full rotation again at a child joint makes the character corkscrew.

Quick sanity tests: turn and stop → reticle recenters. Diagonal flick → equal lag in X and Y. Max look-up → reticle sits above centre. Someone watching a 90° turn → sees one clean body rotation.Can you write this into a new markdown codeblock? Simple, unmistakable, unambigious, high fedelity, like a pro.Architected precise markdown specification with professional clarityArchitected precise markdown specification with professional claritymarkdown# Aim Architecture — First-Person Pointing Spec

## Model

Two lines, one chain.

- **Ocular line** — where the eyes look. Camera direction; screen centre.
- **Weapon line** — where the gun points. Reticle, weapon attitude, and
  projectile direction are all this one line. They must never diverge.

The chain connecting them is strictly serial:
input → ocular line → head → torso → arm → weapon line

Input commands a gaze (azimuth + elevation, world space).
The ocular line responds instantly; every link after it lags,
each tracking the link before it.

## Per-Axis Behaviour

### Azimuth (horizontal)

1. Ocular line snaps to the command. No delay, no limit.
2. Head lags the ocular line; torso lags the head.
3. The arm has no yaw joint: arm azimuth = torso azimuth.
4. At rest (input held), all links converge on the command.
   Weapon–ocular azimuth separation → 0.

### Elevation (vertical)

1. Ocular line snaps to the command, but is **capped** short of ±90°.
   The view never reaches vertical.
2. Head lags the ocular line; torso lags the head; arm lags the torso
   via its own shoulder-pitch joint.
3. The arm is NOT capped at the ocular bound. Past the cap, the arm
   keeps absorbing its share, so the weapon line reaches elevations
   the ocular line cannot.
4. At rest, links settle into a partitioned pose. Weapon–ocular
   elevation separation is generally non-zero — large near the cap.
   The reticle sitting off-centre at max look-up is intended.

## Range Budget

On each axis independently:

- The commanded rotation is split into **shares**, one per link
  (ocular line included). Shares sum to exactly 1.
- The ocular share is applied instantly; remaining shares propagate
  down the chain through lag.
- On elevation, the ocular share is additionally clipped at the cap;
  lower links must still deliver their full shares.

**Diagonal constraint:** total lagged share on elevation must equal
total lagged share on azimuth. Unequal budgets make diagonal flicks
curve (vertical-heavy) or slide (horizontal-heavy) on screen.
Never tune one axis alone.

## Weapon Line Construction

Build the weapon line from the ocular line by applying, **in this order**:

1. Azimuth separation, rotated about world vertical.
2. Elevation separation, rotated about the ocular lateral axis.

Reversed order mixes axes on diagonal input.

- Azimuth separation: non-zero only while the chain is catching up.
- Elevation separation: set by the pose budget; persists at rest.

## First-Person View

- Weapon mesh is head-fixed and must express the same weapon–ocular
  separation as the reticle.
- Local vs world frames flip sign on azimuth — pick one convention
  and keep it.
- Rotation only. No translational shove of the mesh.

## Third-Person View

- Root (pelvis/torso) carries the absolute gaze azimuth **once**.
- Child joints (torso pitch, neck pitch/yaw, arm pitch) apply
  **relative** offsets only.
- Applying absolute azimuth again at any child double-counts the
  rotation and corkscrews the figure.

## Hard Rules

1. Reticle = weapon attitude = projectile direction. One line, always.
2. No extra smoothing on reticle or weapon beyond the serial chain.
   Any second layer desyncs what the player sees from what the body does.
3. Shares sum to 1 per axis; lagged totals equal across axes.

## Acceptance Checks

| Test | Pass condition |
|------|----------------|
| Turn, then stop | Azimuth separation decays to zero; reticle recentres |
| Fast diagonal flick | Screen-space lag equal in X and Y |
| Max look-up | Reticle above centre while view is below vertical |
| Observed 90° turn | Reads as one body rotation, no corkscrew |