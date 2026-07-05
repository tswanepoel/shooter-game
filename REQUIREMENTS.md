# Shooter — Requirements & Architecture

Rebuild spec. The old code is deleted; this doc is the source of truth.

## Concept

Multiplayer FPS, human characters. Arcade feel with deliberate realism.

## Scope

- Assume one implicit lobby to begin with.
- Projectile trajectory (origin, direction, speed) is fixed at launch.
- No wall-clock sync between machines.
- Simulation state changes independently of rendering. Render reads state, never writes it.
- Data is separate from code: weapon/physics/character constants are data keyed by id.
- JSON over WebSocket. Vanilla TypeScript + Three.js.
- Typed pub-sub event bus.

## Target Architecture

```
src/
  config/   weapons.ts, physics.ts, characters.ts, keybinds.ts — data, no logic
  state/    world.ts (players, projectiles)       — data, no Three.js/DOM
  sim/      movement.ts, aimCascade.ts, projectiles.ts, health.ts
            (state, input, dt) -> state, emits events
  render/   scene.ts, weaponView.ts, remotePlayers.ts, crosshair.ts
            state -> Three.js/DOM, one-way
  net/      connection.ts, wire.ts    — WS <-> bus
  input/    keyboard.ts, mouse.ts     — DOM -> bus
  bus.ts    typed pub-sub
  main.ts   composition root: wire everything, run input -> sim -> render loop
```

## Tech Stack

- Backend: ASP.NET Core, native WebSockets, in-memory dictionary lobby.
- Frontend: Three.js + Vite, TypeScript compiled before bundling, glTF loading via the
  standard loader.
- The backend keeps its own data-only config (a small constants layer, not inline in
  handlers) mirroring the frontend's `src/config/` — spawn-area bounds, world boundary,
  damage, regen tick rate/quiet period, respawn delay. World boundary and spawn-region
  extents must match the frontend's copy exactly (the client clamps movement to them;
  the server independently uses them to place spawns). There's no runtime handshake for
  this — keep the two literal values in sync by convention whenever either changes.

## World

- Flat ground plane, no obstacles for now. Hard boundary clamping movement to the playable
  area; the spawn region sits well inside it.
- Hit raycasts target characters only. When environment geometry is added, decide
  explicitly whether it joins the raycast target set (occlusion) — do not let it join by
  accident via scene-wide raycasts.
- Simple static lighting; nothing dynamic depends on it.

## Connection Lifecycle

- The server assigns each socket a player id on connect, picks its spawn point using the
  same random-in-spawn-area logic as respawn, and sends both back as a `welcome`, together
  with a full roster snapshot: every current player's id, position, orientation, and alive
  state. A late joiner must be able to render the world from this snapshot alone, not wait
  for the next periodic tick.
- The server announces the newcomer to everyone else (`join`), and announces departures
  (`leave`) when a socket closes or errors. Clients remove that player entirely — a
  vanished socket must not leave a ghost standing in the arena.
- Reconnection is a fresh join with a new id. No session resumption.

## Wire Protocol

Every message is JSON with a `type` field. One catalog, one place:

| Type           | Direction        | Carries                                   | Server role      |
|----------------|------------------|-------------------------------------------|------------------|
| `welcome`      | server → joiner  | your id, your spawn position, roster snapshot | authored     |
| `join`         | server → others  | new player id + initial state             | authored         |
| `leave`        | server → others  | departing player id                       | authored         |
| `pos`          | client → all     | position, head yaw/pitch (periodic)       | relay            |
| `jump`         | client → all     | jumper id (at launch)                     | relay            |
| `fire`         | client → all     | shooter id (per shot)                     | relay            |
| `hit`          | shooter → server | shooter id, target id                     | arbitrates       |
| `health`       | server → all     | player id, current health, attacker id (damage only, omitted on regen) | authored |
| `death`        | server → all     | victim id, killer id                      | authored         |
| `respawn`      | server → all     | player id, spawn position                 | authored         |

- The server relays every message type generically to all other sockets; it specifically
  parses only what it must arbitrate. New relay-only message types need no server change.
- The victim learns their own health the same way everyone else does: from `health`
  messages. Regen ticks emit them too, without an attacker id — only a damage-caused
  change carries one, which the victim's client uses to drive the directional damage
  indicator. No client ever computes damage.

## Movement

- Standard keyboard movement with pointer-lock mouse-look. Directional speeds are
  asymmetric: forward is fastest, lateral and backward are slower.
- Combined-direction input is clamped so it can never exceed straight-line forward speed.
  Unclamped diagonals move faster than intended and corrupt any speed-based logic
  downstream, such as remote animation triggers.
- Sprint is a state, not a held modifier: pressing Shift while moving forward enters it,
  and Shift need not stay held for the duration. It persists on its own and exits only on
  a defined condition — releasing forward or exhausting stamina.
- Stamina is a bounded resource that drains while sprinting and recovers otherwise, with
  an entry floor so players can't flicker in and out of sprint at empty. Respawn resets it.
- Jumping requires the player to be alive and grounded, and must filter out browser
  key-repeat so one press means one jump. Vertical motion is simple ballistic integration;
  horizontal velocity locks at launch, so there is no air control.
- Jumps replicate by explicit event, not inference. One message at launch, and every
  client — including the jumper — runs identical physics from it. Inferring jumps from
  observed height is unreliable because ordinary movement noise crosses any threshold
  you'd pick.

## Weapon / Firing

- Fully automatic: holding the left mouse button fires at a fixed cadence, gated on
  pointer-lock + alive.
- Capture fire direction only after all per-frame camera effects (sway, bob, flinch) have
  been applied — otherwise the bullet direction is a frame stale relative to the rendered
  crosshair.
- Real projectiles, not hitscan. Generic system: trajectory fixed at launch, advanced by
  frame time, culled at a maximum travel range — by distance, not wall-clock, since no
  clock assumptions exist. Only the shooter's own client has hit authority; other clients
  render the same trajectory purely cosmetically. The shape must accommodate future
  weapons (slow, splash-on-impact) through different data and a damage hook, with no
  rework.
  - Hit check: swept raycast covering the full distance traveled that frame — a point
    check lets fast bullets tunnel through a target.
- Confirmed hit → shooter reports shooter and target; the server is sole damage authority.
- **The server discards hits on dead players.** Two clients can legitimately report hits
  on a target that just died, and a stale hit can arrive after respawn — neither may chunk
  a corpse or a fresh spawn.
- Health regenerates in discrete ticks, and only after a quiet period since last damage —
  not continuously. Each tick emits a `health` update.
- Death: mark not-alive, broadcast with killer attribution, auto-respawn after a fixed
  delay. No manual/early respawn — the delay always runs its course.
- Respawn: server picks a random point in the spawn area and broadcasts it; full health
  and stamina; reset *all* transient camera/weapon feedback state — otherwise residual
  decay visibly keeps playing post-respawn.

## Combat Feedback

- Hit marker: brief, shooter-only.
- Directional damage indicator: an arc around the crosshair whose angle is computed from
  the victim's facing vectors toward the attacker's last known position, fading out
  quickly. Driven by the attacker id on a damage `health` update — absent on regen ticks,
  so healing never triggers it.
- Flinch on taking damage: random pitch/yaw jitter that decays each frame, jitter scaled
  by remaining intensity.
- Recoil lives on the weapon mesh only — never the camera (see Pitfalls). Set on shot,
  decays per frame, drives a small positional kick and pitch.
- Idle sway: small dual-frequency camera drift, always active while alive.
- Walk/sprint head-bob: vertical oscillation plus a double-frequency pitch nod, only while
  moving and grounded, amplified when sprinting.
- Kill feed: a short-lived "killer ✕ victim" line on every `death` message. This is the
  sole consumer of killer attribution for now — enough that the field isn't decorative.

## Server Authority

- All damage/regen/respawn numeric rules live server-side only.
- The server authors `welcome`/`join`/`leave`/`health`/`death`/`respawn`; everything else
  it relays blind.
- The server tracks per-player health and alive state — the minimum needed to arbitrate.

## Remote Rendering

- Interpolate toward the last received position with a frame-rate-compensated factor.
- **Jump simulation owns the vertical axis; `pos` messages are horizontal-authoritative.**
  Both write position, and without this split, mid-jump position updates drag the
  simulated arc down. From `jump` until simulated landing, ignore the vertical component
  of incoming positions; blend back afterward.
- Locomotion state is inferred from measured speed against a threshold — which is exactly
  why movement must use the diagonal-clamped speed, or diagonal walking misfires sprint.
- Stop locomotion entirely on death: gate both animation updates and locomotion changes on
  alive — a position message can still arrive post-death and restart idle otherwise.
- Death pose: fixed prone rotation, orientation frozen.
- Jumps must be re-simulated locally from the jump event — the periodic position broadcast
  is too sparse for a smooth arc.
- Muzzle flash: brief, on receiving a fire event, attached to the opponent's held weapon.

## UI

- Health and stamina bars, width = percentage. Health is driven by server `health`
  messages, never computed locally.
- Kill feed, corner-anchored, entries expire on their own.
- Death overlay: full-screen translucent tint that must not intercept pointer events —
  omitting this silently swallows clicks meant to re-acquire pointer lock.
- All passive overlays (crosshair, hit marker, damage glow, kill feed) likewise must not
  intercept pointer events.

## Multiplayer Model

- Single lobby, small player count. Position/orientation broadcast at a modest fixed rate.
  No clock-sync assumptions anywhere.

## Assets

- Kenney packs: blocky characters + blaster kit. Cube-pets evaluated, unused.

Gotcha: these glTFs reference an **external** texture, not embedded — ship it alongside
each model or everything renders textureless. Verify by grepping the model binary for
image filenames.

Character rig:
- Locomotion: a permanent held-weapon base pose, with a cross-faded idle/walk/sprint layer
  on top. Reduce idle weight well below full — full-weight authored breathing reads as too
  exaggerated.
- Scale characters to a canonical world height.
- Scale weapons by the bounding box's **largest** dimension — never an assumed axis (a
  fixed-axis assumption broke a model whose long axis differed).
- A model's authored forward/nose axis may not match the engine's convention — orient by
  mapping the actual authored axis onto the desired direction, not with lookAt.

## Pitfalls (do not reintroduce)

- **Clamp the frame delta.** Tab-out pauses the render loop; on refocus one giant dt
  teleports players and tunnels every projectile past its swept raycast.
- **Clear input state on blur and pointer-lock loss.** A key held when focus leaves never
  gets its keyup — the player walks or fires forever on return.
- **Hit detection walks the parent chain.** Raycasts hit deep inside the glTF hierarchy;
  tag the character root with its player id and walk up from the hit object.
- **Keep the two weapon render paths (view-model, opponent-held) fully independent**, with
  separate loads. Sharing a template between them once broke the working one when the
  other was added in the same change.
- **Transient additive camera effects need a guaranteed per-frame reset**, or must be
  direct assignment, never bare accumulation. If the reset is conditional (e.g. skipped
  while dead), an effect that keeps accumulating spins forever — this caused real bugs on
  both the camera and a remote arm.
- **Recoil must not live on the camera if projectiles read direction at fire time** — a
  persistent, partially-recovering camera recoil (deliberate: recoil shouldn't fully
  auto-correct) made the crosshair diverge from already-fired bullets. Removed; if
  reintroduced, decide explicitly whether it feeds fired-bullet direction too.
- **Diagonal movement needs the speed clamp** (see Movement).
- **Jump needs an explicit event, not a height heuristic** (see Movement).
- **Filter key-repeat on jump** — browser repeat otherwise chains free jumps on hold.
- **Overlay divs must not intercept pointer events** unless meant to.
- **A locked build executable blocks rebuilds** if a prior run still holds it — stop the
  process (by port or by name) before rebuilding.

## Out of Scope

Server-side hit validation/lag compensation. Wall-clock sync. Scoring, win conditions, and
match structure (the kill feed is the only consumer of kill attribution for now). The
splash weapon itself (only its generic-projectile shape needs to already fit). Join
codes/multi-lobby. Session resumption on reconnect. RxJS.
