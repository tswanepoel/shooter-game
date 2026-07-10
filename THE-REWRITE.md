# Event-Sourced Game Engine Architecture Specification

This document defines the core design patterns, threading boundaries, file structures, and data flows governing the game engine. The primary architectural goals are **strong encapsulation**, **strict determinism**, and the complete isolation of **Asynchronous Input/Network Projections (Intent/Facts)** from **Authoritative Frame Loops (Simulation State)**.

---

## 1. Core Architectural Design Rules

1. **Passive Dependency Principle**
   * Modules are entirely passive data structures and pure mathematical executors.
   * Modules are forbidden from referencing, importing, or subscribing to global event buses, network sockets, or other modules.
   * A top-level **Engine Orchestrator** acts as the sole conductor, explicitly calling modules and passing data down the dependency chain chronologically.

2. **Intent vs. Reality Separation**
   * **Async Thread Phase:** Collects, sorts, and aggregates raw human inputs (local intentions) or network socket streams (authoritative facts). This phase is forbidden from validating rules (e.g., checking ammo or wall collisions) or altering the game world.
   * **Main Frame Thread (`tick`) Phase:** Clears the eager buffers, enforces world rules, validates intents, and mutates reality deterministically.

3. **Canonical Symmetry ("Me" vs. "Them")**
   * Every local player input must emit an event explicitly tagged with `PlayerId = "Me"` and `IsAuthoritative = false`.
   * Remote player actions arrive via network packets tagged with `PlayerId = "EnemyID"` and `IsAuthoritative = true`.
   * Both follow identical processing pipelines. The `tick` code uses the `IsAuthoritative` flag exclusively to determine if it should execute rule validation (Local/AI) or skip validation entirely (Remote Server Fact).

4. **Frame Execution Order (Dependency Chain)**
   * To prevent visual or physical lag, modules must execute in a strict chronological sequence during the frame loop. 
   * Example: `weapon-fire` must update *before* `character-pose` so that structural weapon recoil can be generated and injected into the pose matrix within the exact same frame.

---

## 2. Standardised Module File Structure

Every mechanical system (Pose, Locomotion, Position, Fire, Ballistics) is strictly encapsulated within its own directory using a mandated **Five-File Architecture Pattern**.

```text
your-module/
├── config.json  # Pure raw settings data (Read-only values/thresholds)
├── config.ts    # JSON TypeScript schema definitions (Static type shield)
├── state.ts     # Internal double-buffered state layout & initialisers
├── sync.ts      # Off-thread inbound network fact ingestion pipeline
├── logic.ts     # Asynchronous Eager Projections (Intents) & Authoritative tick()
└── index.ts     # Public API gateway (The Encapsulation Shield)
```

### Module Blueprint Implementations

#### config.json
```json
{
  "recoilRecoverySpeed": 5.0,
  "maxRecoilPitch": 15.0,
  "mouseSensitivity": 0.1
}
```

#### config.ts
```typescript
export interface ModuleConfig {
  readonly recoilRecoverySpeed: number;
  readonly maxRecoilPitch: number;
  readonly mouseSensitivity: number;
}
```

#### state.ts
```typescript
import { FiredEvent } from '../global-types';

export interface PoseState {
  currentPitch: number;
  currentYaw: number;
  recoilOffset: number;
  // Isolated write boundary for async operations
  eagerBuffer: {
    accumulatedMouseDeltaX: number;
    accumulatedMouseDeltaY: number;
    internalRecoilEvents: FiredEvent[];
  };
}

export function createInitialState(): PoseState {
  return {
    currentPitch: 0,
    currentYaw: 0,
    recoilOffset: 0,
    eagerBuffer: {
      accumulatedMouseDeltaX: 0,
      accumulatedMouseDeltaY: 0,
      internalRecoilEvents: []
    }
  };
}
```

#### sync.ts
```typescript
import { PoseState } from './state';
import { ModuleConfig } from './config';
import { ServerPoseUpdatePacket } from '../network-types';

/**
 * ASYNC NETWORK PHASE: Ingests authoritative server realities.
 * Triggered exclusively by the external Network Orchestrator.
 */
export function projectServerFact(
  state: PoseState, 
  packet: ServerPoseUpdatePacket,
  config: ModuleConfig
): void {
  if (packet.isTeleport) {
    state.eagerBuffer.accumulatedMouseDeltaX = 0;
    state.eagerBuffer.accumulatedMouseDeltaY = 0;
    state.currentPitch = packet.authoritativePitch;
    state.currentYaw = packet.authoritativeYaw;
    return;
  }
  state.currentPitch = packet.authoritativePitch;
  state.currentYaw = packet.authoritativeYaw;
}
```

#### logic.ts
```typescript
import { PoseState } from './state';
import { ModuleConfig } from './config';
import { MouseMoveEvent, FiredEvent } from '../global-types';

/**
 * PHASE 1: ASYNC EAGER PROJECTION (Local Intent)
 */
export function projectLocalInput(state: PoseState, event: MouseMoveEvent, config: ModuleConfig): void {
  state.eagerBuffer.accumulatedMouseDeltaX += event.dx * config.mouseSensitivity;
  state.eagerBuffer.accumulatedMouseDeltaY += event.dy * config.mouseSensitivity;
}

/**
 * PHASE 1.5: INTERNAL EVENT PROJECTION (Inter-Module Fact Injection)
 */
export function projectInternalRecoil(state: PoseState, event: FiredEvent): void {
  state.eagerBuffer.internalRecoilEvents.push(event);
}

/**
 * PHASE 2: AUTHORITATIVE TICK (Simulation Resolution)
 */
export function tick(state: PoseState, deltaTime: number, config: ModuleConfig): void {
  // 1. Consume and flush the eager write buffers immediately
  const deltaX = state.eagerBuffer.accumulatedMouseDeltaX;
  const deltaY = state.eagerBuffer.accumulatedMouseDeltaY;
  const recoilEvents = [...state.eagerBuffer.internalRecoilEvents];
  
  state.eagerBuffer.accumulatedMouseDeltaX = 0;
  state.eagerBuffer.accumulatedMouseDeltaY = 0;
  state.eagerBuffer.internalRecoilEvents = [];

  // 2. Resolve intentional transformations
  state.currentYaw += deltaX;
  state.currentPitch = Math.max(-89, Math.min(89, state.currentPitch + deltaY));

  // 3. Resolve environmental realities (Recoil)
  for (const event of recoilEvents) {
    state.recoilOffset += config.maxRecoilPitch * 0.5;
  }

  // 4. Update structural simulation decay physics
  if (state.recoilOffset > 0) {
    state.recoilOffset -= config.recoilRecoverySpeed * deltaTime;
    if (state.recoilOffset < 0) state.recoilOffset = 0;
  }
}
```

#### index.ts
```typescript
export { ModuleConfig } from './config';
export { PoseState, createInitialState } from './state';
export { projectServerFact } from './sync';

import { projectLocalInput, projectInternalRecoil, tick } from './logic';

export const PoseModule = {
  projectLocalInput,
  projectInternalRecoil,
  tick
} as const;
```

---

## 3. Canonical Module Map

A production game loop requires these 12 distinct, passive modules. Data flows out of inputs, down through mutations, and clears via lifecycles under the control of the orchestrator.

1. **`mouse-input`**: Async Input capture. Accumulates raw hardware deltas.
2. **`keyboard-input`**: Async Input capture. Resolves instantaneous key states into intention vectors.
3. **`network-inbound`**: Off-thread network socket worker. Parses UDP/WebSocket binary buffers.
4. **`character-pose`**: Translates looking inputs and recoil impulses into skeletal matrices.
5. **`character-locomotion`**: Translates directional movement intentions into velocity vectors.
6. **`character-position`**: Blends locomotion velocity with world physics constraints and server corrections.
7. **`weapon-fire`**: Evaluates trigger actions, maps local intents vs server facts, and spawns projectile entities.
8. **`projectile-ballistics`**: The projectile processing assembly line. Translates physical bullets down trajectories.
9. **`world-collision`**: Global spatial utility partitioner. Handles line-of-sight and raycast physics calculations.
10. **`character-health`**: Listens for structural collision outcomes, subtracting values and triggering elimination states.
11. **`network-outbound`**: Outbound pipeline manager. Serializes raw local intents up to the authority server.
12. **`entity-lifecycle`**: Engine janitorial manager. Deallocates destroyed objects and cleans up leaking memory states.


# Appendix: Complete Pose Module & Structural Glue Implementation

This appendix provides the full, production-ready TypeScript implementation for the `character-pose` module using the Five-File Pattern, followed by the **Engine Orchestrator Glue** that proves how data flows across modules without breaking the passive architectural rules.

---

## 1. Module Implementation: `character-pose`

### File 1: `modules/character-pose/config.ts`
```typescript
/**
 * Static schema matching the underlying config.json backend.
 * Immutability is strictly enforced via readonly properties.
 */
export interface ModuleConfig {
  readonly mouseSensitivity: number;
  readonly maxRecoilPitch: number;
  readonly recoilRecoverySpeed: number;
}
```

### File 2: `modules/character-pose/state.ts`
```typescript
import { FiredEvent } from '../../global-types';

/**
 * Structural definition of internal pose states.
 * Isolation of the write-only eagerBuffer prevents main thread race conditions.
 */
export interface PoseState {
  // Authoritative simulation outputs read by systems and renderers
  currentPitch: number;
  currentYaw: number;
  recoilOffset: number;

  // Thread/Context boundary for async inputs and inter-module frame-level events
  eagerBuffer: {
    accumulatedMouseDeltaX: number;
    accumulatedMouseDeltaY: number;
    internalRecoilEvents: FiredEvent[];
  };
}

/**
 * Default state constructor factory.
 */
export function createInitialState(): PoseState {
  return {
    currentPitch: 0,
    currentYaw: 0,
    recoilOffset: 0,
    eagerBuffer: {
      accumulatedMouseDeltaX: 0,
      accumulatedMouseDeltaY: 0,
      internalRecoilEvents: []
    }
  };
}
```

### File 3: `modules/character-pose/sync.ts`
```typescript
import { PoseState } from './state';
import { ModuleConfig } from './config';

export interface ServerPoseUpdatePacket {
  playerId: string;
  authoritativePitch: number;
  authoritativeYaw: number;
  isTeleport: boolean;
}

/**
 * ─── ASYNC NETWORK FACT INGESTION PHASE ───
 * Triggered exclusively by the top-level network socket processor.
 * Overwrites simulation variables instantly because the server is absolute authority.
 */
export function projectServerFact(
  state: PoseState,
  packet: ServerPoseUpdatePacket,
  _config: ModuleConfig
): void {
  if (packet.isTeleport) {
    // Clear unvalidated local inputs if the server forces an absolute coordinate change
    state.eagerBuffer.accumulatedMouseDeltaX = 0;
    state.eagerBuffer.accumulatedMouseDeltaY = 0;
    state.currentPitch = packet.authoritativePitch;
    state.currentYaw = packet.authoritativeYaw;
    return;
  }

  // Authoritative updates override local rendering interpolation targets
  state.currentPitch = packet.authoritativePitch;
  state.currentYaw = packet.authoritativeYaw;
}
```

### File 4: `modules/character-pose/logic.ts`
```typescript
import { PoseState } from './state';
import { ModuleConfig } from './config';
import { MouseMoveEvent, FiredEvent } from '../../global-types';

/**
 * ─── PHASE 1: ASYNC EAGER PROJECTION (Local User Intent) ───
 * Invoked by hardware event callbacks. Performs raw accumulator math.
 */
export function projectLocalInput(state: PoseState, event: MouseMoveEvent, config: ModuleConfig): void {
  state.eagerBuffer.accumulatedMouseDeltaX += event.dx * config.mouseSensitivity;
  state.eagerBuffer.accumulatedMouseDeltaY += event.dy * config.mouseSensitivity;
}

/**
 * ─── PHASE 1.5: INTERNAL EVENT PROJECTION (Inter-Module Injection) ───
 * Invoked by the engine orchestrator to pass facts created by other modules during this frame.
 */
export function projectInternalRecoil(state: PoseState, event: FiredEvent): void {
  state.eagerBuffer.internalRecoilEvents.push(event);
}

/**
 * ─── PHASE 2: AUTHORITATIVE SIMULATION RESOLUTION (Main Thread Tick) ───
 * Flushes all pending write-buffers and updates world state deterministically.
 */
export function tick(state: PoseState, deltaTime: number, config: ModuleConfig): void {
  // 1. Consume and immediately clear the double buffers
  const deltaX = state.eagerBuffer.accumulatedMouseDeltaX;
  const deltaY = state.eagerBuffer.accumulatedMouseDeltaY;
  const recoilEvents = [...state.eagerBuffer.internalRecoilEvents];

  state.eagerBuffer.accumulatedMouseDeltaX = 0;
  state.eagerBuffer.accumulatedMouseDeltaY = 0;
  state.eagerBuffer.internalRecoilEvents = [];

  // 2. Resolve Intentional Rotations
  state.currentYaw += deltaX;
  state.currentPitch = Math.max(-89, Math.min(89, state.currentPitch + deltaY));

  // 3. Resolve Environmental Recoil Realities
  for (const _event of recoilEvents) {
    state.recoilOffset += config.maxRecoilPitch * 0.4; // Apply constant impulse per shot
  }

  // 4. Update Simulation Physics Over Time (Decay Recoil Back to Equilibrium)
  if (state.recoilOffset > 0) {
    state.recoilOffset -= config.recoilRecoverySpeed * deltaTime;
    if (state.recoilOffset < 0) {
      state.recoilOffset = 0;
    }
  }
}
```

### File 5: `modules/character-pose/index.ts`
```typescript
/**
 * Public Architecture Shield. 
 * Only exposes interfaces and the explicit multi-phase execution namespace.
 */
export { ModuleConfig } from './config';
export { PoseState, createInitialState } from './state';
export { projectServerFact, ServerPoseUpdatePacket } from './sync';

import { projectLocalInput, projectInternalRecoil, tick } from './logic';

export const PoseModule = {
  projectLocalInput,
  projectInternalRecoil,
  tick
} as const;
```

---

## 2. Shared Types

### `global-types.ts`
```typescript
export interface MouseMoveEvent {
  readonly dx: number;
  readonly dy: number;
}

export interface FiredEvent {
  readonly playerId: string;
  readonly timestamp: number;
  readonly isAuthoritative: boolean;
}

export interface TickOutcome {
  readonly didFire: boolean;
  readonly recoilEvent?: FiredEvent;
}
```

---

## 3. The Orchestration Glue (The Passive Framework)

This orchestrator is the only system aware of multiple modules. It intercepts outcomes from the shooting system and manually pushes them into the pose system, preserving chronological execution without hidden connections.

### `engine-orchestrator.ts`
```typescript
import { MouseMoveEvent, TickOutcome } from './global-types';

// Import Encapsulated Module Public Shields
import { PoseModule, PoseState, ModuleConfig as PoseConfig } from './modules/character-pose';
import { WeaponFireModule, FireState, ModuleConfig as FireConfig } from './modules/weapon-fire';

// Runtime configuration data objects backed by underlying config.json assets
import rawPoseJson from './modules/character-pose/config.json';
import rawFireJson from './modules/weapon-fire/config.json';

const poseConfig: PoseConfig = Object.freeze(rawPoseJson);
const fireConfig: FireConfig = Object.freeze(rawFireJson);

export interface EntityStateStore {
  readonly id: string;
  readonly pose: PoseState;
  readonly fire: FireState;
}

/**
 * PHASE 1: ASYNC LOCAL HARDWARE EVENTS
 * Explicit push down to the specific targeting structure.
 */
export function bindHardwareInputListeners(myEntity: EntityStateStore): void {
  window.addEventListener('mousemove', (e: MouseEvent) => {
    const hardwarePayload: MouseMoveEvent = { dx: e.movementX, dy: e.movementY };
    
    // Explicit call to isolated input path
    PoseModule.projectLocalInput(myEntity.pose, hardwarePayload, poseConfig);
  });

  window.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 0) { // Left Click
      WeaponFireModule.projectLocalInput(
        myEntity.fire, 
        { triggerPulled: true, playerId: myEntity.id }, 
        fireConfig
      );
    }
  });
}

/**
 * PHASE 2: PASSIVE DETERMINISTIC MAIN TICK SIMULATION
 * Conducts individual module simulation loops in strict execution order.
 */
export function executeFrameTick(entities: EntityStateStore[], deltaTime: number): void {
  for (const entity of entities) {
    
    // Rule 4 In Action: Tick weapon-fire FIRST. It has zero knowledge of character-pose.
    // It runs its internal checks and returns an immutable frame summary payload.
    const fireOutcome: TickOutcome = WeaponFireModule.tick(entity.fire, deltaTime, fireConfig);

    // Orchestrator intercepts side-effects and routes data cleanly between passive boundaries
    if (fireOutcome.didFire && fireOutcome.recoilEvent) {
      // Step 1.5: Inject the recoil fact directly into the pose input buffer
      PoseModule.projectInternalRecoil(entity.pose, fireOutcome.recoilEvent);
    }

    // Rule 4 In Action: Tick character-pose SECOND.
    // It sweeps up both the eager mouse intent AND the freshly routed weapon recoil fact.
    PoseModule.tick(entity.pose, deltaTime, poseConfig);
    
  }
}
```