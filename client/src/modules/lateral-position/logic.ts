import type { LateralPositionState } from "./state.ts";
import { WorldCollisionModule } from "../world-collision/index.ts";

export function projectInternalJump(state: LateralPositionState, groundVelocityX: number, groundVelocityZ: number): void {
  state.airCarryBuffer.jumpRequested = true;
  state.airCarryBuffer.pendingCarryX = groundVelocityX;
  state.airCarryBuffer.pendingCarryZ = groundVelocityZ;
}

export function projectRespawn(state: LateralPositionState, x: number, z: number): void {
  state.x = x;
  state.z = z;
  state.airHorizontalX = 0;
  state.airHorizontalZ = 0;
}

/**
 * `grounded`/`y` are elevation's resolved values from last tick — this module runs
 * before elevation each frame, so a same-frame jump is detected via its own eager
 * buffer rather than waiting a frame for elevation's `grounded` to flip.
 */
export function tick(
  state: LateralPositionState,
  groundVelocityX: number,
  groundVelocityZ: number,
  grounded: boolean,
  y: number,
  dt: number,
): void {
  let airborne = !grounded;
  if (state.airCarryBuffer.jumpRequested) {
    state.airCarryBuffer.jumpRequested = false;
    state.airHorizontalX = state.airCarryBuffer.pendingCarryX;
    state.airHorizontalZ = state.airCarryBuffer.pendingCarryZ;
    airborne = true;
  }

  if (airborne) {
    state.x += state.airHorizontalX * dt;
    state.z += state.airHorizontalZ * dt;
  } else {
    state.x += groundVelocityX * dt;
    state.z += groundVelocityZ * dt;
  }

  const resolved = WorldCollisionModule.resolveMovement(state.x, state.z, y);
  state.x = resolved.x;
  state.z = resolved.z;
}
