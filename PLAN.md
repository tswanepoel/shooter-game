# Delivery Plan

Iterative build order for the Shooter rebuild. Each numbered feature builds on the last
and ends with a manual verification step in the browser — no automated tests. Read
alongside REQUIREMENTS.md, which this file does not restate.

Full Kenney packs (previews, docs, all source formats — beyond the GLB subset already on
hand) are at:
- `C:\Users\Theunis\Downloads\kenney_blaster-kit_2.1`
- `C:\Users\Theunis\Downloads\kenney_blocky-characters_20`

## 1. Project scaffold & empty scene
- Vite + TypeScript frontend project; ASP.NET Core backend project (builds and runs, no
  WebSocket logic yet).
- Create the full `src/` outline from REQUIREMENTS.md's Target Architecture
  (config/, state/, sim/, render/, net/, input/, bus.ts, main.ts) with stub/empty
  modules — cement the architecture even where a module has nothing to do yet.
- `bus.ts`: typed pub-sub with no real events defined yet.
- `render/scene.ts`: Three.js scene, camera, flat ground plane, static lighting.
- `main.ts`: composition root wiring an input → sim → render loop with a clamped frame
  delta from day one (Pitfalls: clamp dt).
- Verify: `npm run dev` shows a lit ground plane and a fixed camera in the browser.

## 2. Local movement + mouse look + boundary clamp
- `input/keyboard.ts`, `input/mouse.ts` publish to the bus; pointer lock engages on click.
- `sim/movement.ts`: WASD movement with asymmetric directional speeds from
  `config/physics.ts`/`characters.ts`, diagonal input clamped to forward speed, hard
  boundary clamp to the playable area.
- Camera renders from head yaw/pitch directly (no gun/torso cascade yet).
- Apply now: clear input state on blur/pointer-lock loss.
- Verify: WASD moves within bounds and diagonals never exceed forward speed; hitting a
  boundary stops cleanly; alt-tab away and back leaves no stuck keys.

## 3. Sprint & stamina
- Shift-down while moving forward enters sprint (a state, not a held modifier); it exits
  only on forward release or stamina exhaustion.
- Stamina drains while sprinting, recovers otherwise, with an entry floor preventing
  flicker at empty.
- Verify: tap Shift while holding W, confirm sprint persists after releasing Shift;
  confirm it cuts out at empty stamina and won't re-enter until above the floor.

## 4. Jump (local only)
- Space triggers a jump if alive + grounded, filtered for key-repeat (one press, one
  jump).
- Ballistic vertical integration; horizontal velocity locks at launch (no air control).
- Verify: holding Space produces a single jump, not a chain; the arc looks right and
  lands back on the ground plane.

## 5. Character + weapon assets
- Load a Kenney blocky-character glTF and a blaster-kit weapon glTF; ship textures
  alongside each model (Pitfalls: external-texture gotcha — grep the glb for image
  filenames to confirm they're referenced correctly).
- Scale the character to a canonical world height; scale the weapon by its bounding
  box's largest dimension; orient it by mapping its authored forward axis onto the
  desired direction (not lookAt).
- Locomotion rig: permanent held-weapon base pose plus a cross-faded idle/walk/sprint
  layer, idle weight reduced well below the authored default.
- Verify: character and weapon render at correct relative scale with textures intact;
  toggling simulated locomotion state (temporary key or code path) cross-fades
  idle/walk/sprint visibly, no hard cut.

## 6. Aim cascade + view-model + crosshair
- `sim/aimCascade.ts`: head (instant, raw mouse); gun and torso each chase head
  independently via frame-rate-compensated exponential approach, gun faster than torso.
- View-model: rotation = gun-minus-head (wrist correction); position (shoulder swing) =
  translation from head-minus-torso lag, swinging opposite the turn direction.
- Crosshair projected each frame from the gun direction through the camera — not
  screen-fixed.
- Verify: snap the mouse quickly and watch the weapon trail then ease back to center
  (not lead); crosshair moves off-center during the snap and returns as the gun catches
  up.

## 7. Local weapon firing
- Left mouse button held fires automatically at a fixed cadence, gated on pointer-lock +
  alive.
- Fire direction captured after camera effects (sway/bob/flinch — stub as pass-through
  if not yet built) are applied.
- `sim/projectiles.ts`: generic trajectory fixed at launch, advanced per frame, culled
  by distance traveled, swept raycast per frame (not a point check).
- Recoil offset applied to the weapon mesh only, decaying per frame — never the camera.
- No real targets yet; fire into empty space and confirm range culling.
- Verify: holding the mouse button fires at a steady rate; bullets travel and vanish at
  max range; recoil kicks and recovers on the weapon while the camera stays level.

## 8. Backend WebSocket + connection lifecycle
- ASP.NET Core WebSocket endpoint, in-memory dictionary of connected players.
- On connect: assign an id, pick a spawn point (random-in-spawn-area), send `welcome`
  (id, spawn position, roster snapshot — empty on the first connection).
- Broadcast `join` to existing sockets; broadcast `leave` on close/error.
- Backend gets its own small data-only config, with spawn bounds/world boundary matching
  the frontend's literal values.
- `net/connection.ts` + `net/wire.ts`: connect, decode `welcome`/`join`/`leave` onto the
  bus; `state/world.ts` tracks the roster.
- Verify: open one tab, confirm (via console log) the `welcome` payload has an id and an
  in-bounds spawn position; open a second tab and confirm the first receives `join`;
  close the second and confirm the first receives `leave` and drops the entry.

## 9. Remote player sync + locomotion animation
- Client sends `pos` (position, head yaw/pitch) periodically; server relays to all.
- Remote players interpolate toward the last received position, frame-rate compensated.
- Each remote runs its own aim cascade locally from the received head orientation only,
  initialized to its first received orientation (no snap-from-zero).
- Locomotion state (idle/walk/sprint) inferred from measured speed against a threshold.
- Verify: two tabs — move in one and confirm smooth (not stepped) motion and correct
  idle/walk/sprint blending in the other, including diagonal movement not misfiring
  sprint.

## 10. Remote jump & fire replication
- `jump` event relay: every client, including the jumper, re-simulates identical
  ballistic physics from the event, not from `pos`.
- Vertical-authority split: from `jump` until simulated landing, ignore the vertical
  component of incoming `pos` for that player; blend back afterward.
- `fire` event relay: remote clients spawn a cosmetic projectile from the shooter's
  current reconstructed position/gun orientation (no direction is sent over the wire),
  plus a brief muzzle flash on the opponent's held weapon.
- Verify: two tabs — jump in one and confirm the other shows a smooth arc unperturbed by
  incoming `pos`; fire in one and confirm the other shows a cosmetic bullet and muzzle
  flash roughly matching the shooter's aim.

## 11. Character & weapon selection
- Config model currently treats character and weapon as one fixed recipe
  (`CHARACTER_MODEL_URL`, `WEAPON_MODEL_URL`); split it into two independent catalogs —
  a list of character recipes and a list of weapon recipes, each entry naming its model
  URL plus the per-model tuning that today lives as single constants (forward axis, grip
  offset, size, fire/handling feel). Every other system keeps reading "the current
  character" / "the current weapon" through an indirection instead of the old constants.
- Pull in a handful more of each from the full Kenney packs (`blocky-characters`,
  `blaster-kit`) — enough to make the catalogs real, not one-plus-a-stub.
- Character choice is locked in at lobby join: a pre-join picker screen, sent once to the
  server as part of (or just before) the initial handshake, and included in the roster/
  join snapshot so every client renders the right model for every player from the start.
- Weapon choice is switchable anytime while playing: a key/UI switches the local weapon
  recipe on demand, reloading the view-model and held-weapon mesh from the new recipe's
  tuning; broadcast the change so remote clients swap the opponent's held weapon too.
- Verify: pick different characters in two tabs at join and confirm each renders as
  chosen on both ends; mid-match, switch weapons and confirm the local view-model and the
  opponent's held weapon both swap to match, with grip/fire feel matching the new
  weapon's own tuning (not the old one's).

## 12. Server-authoritative combat
- The shooter's own client owns hit detection (swept raycast, parent-chain walk to the
  tagged character root); on a hit it sends `hit` (shooter id, target id) to the server.
- Server is sole damage authority: applies damage, discards hits on dead players,
  regenerates health in discrete ticks after a quiet period since last damage.
- `health` broadcasts on every change, carrying an attacker id when the change is
  damage and omitting it on regen ticks.
- On death: mark not-alive, broadcast `death` (victim id, killer id), auto-respawn after
  a fixed delay — server picks a new random point, broadcasts `respawn`, resets health
  and stamina.
- Verify: two tabs — shoot the other player down, confirm health only ever changes via
  `health` messages, confirm `death` carries the correct killer, confirm auto-respawn
  lands at a new in-bounds point at full health/stamina, and confirm a hit landing right
  after death is discarded (no health dip on a corpse).

## 13. Combat feedback + respawn/death reset
- Hit marker: brief, shooter-only.
- Directional damage indicator: arc angle from the victim's facing toward the attacker's
  last known position, driven by the attacker id on damage `health` updates.
- Flinch: random pitch/yaw jitter on damage, decaying, scaled by remaining intensity.
- Idle sway (always while alive) and walk/sprint head-bob (while moving+grounded,
  amplified sprinting), if not already wired in step 6/9.
- On respawn: reset all transient camera/weapon feedback state via direct assignment
  (never bare accumulation) so nothing keeps decaying post-respawn.
- On death: freeze to the prone death pose; stop locomotion/animation updates entirely.
- Verify: get shot from several angles and confirm the indicator points the right way;
  confirm flinch decays without stacking indefinitely; die and respawn repeatedly and
  confirm no residual sway/recoil/flinch survives a respawn.

## 14. UI
- Health/stamina bars, width = percentage, driven only by server `health` and local
  stamina state.
- Kill feed: corner-anchored "killer x victim" line per `death`, self-expiring.
- Death overlay: full-screen translucent tint, `pointer-events: none`.
- Confirm every passive overlay (crosshair, hit marker, damage indicator, kill feed,
  death overlay) is click-through.
- Verify: take damage and confirm bars move; die and confirm the overlay appears but a
  click still re-acquires pointer lock; trade a few kills/deaths across two tabs and
  confirm the feed populates and entries expire.

## 15. Pitfalls hardening pass
- Walk the full Pitfalls list in REQUIREMENTS.md against the running build:
  frame-delta clamp under tab-out/in, input clear on blur/pointer-lock loss, hit
  raycasts walking the parent chain, the two weapon render paths (view-model vs
  opponent-held) loading fully independently, transient additive effects resetting
  unconditionally, recoil never feeding fire direction, key-repeat filtered on jump.
- Fix anything that regressed during steps 1-13.
- Verify: deliberately tab out mid-jump and mid-fire and confirm no teleport/tunneling;
  hold a key and blur the window, confirm it doesn't stick on return. This pass is a
  checklist walk, not new functionality — MVP is complete once it's clean.