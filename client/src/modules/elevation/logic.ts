import type { ElevationState } from "./state.ts";
import rawConfig from "./config.json";
import { WorldCollisionModule } from "../world-collision/index.ts";

export const gravity: number = rawConfig.gravity;
export const jumpSpeed: number = rawConfig.jumpSpeed;

export function projectInternalJump(state: ElevationState): void {
  state.eagerBuffer.jumpRequested = true;
}

/** Vertical-only jump application for remote players, whose horizontal position is server-lerped rather than resolved through tick(). */
export function projectImmediateJump(state: ElevationState): void {
  state.velocityY = jumpSpeed;
  state.grounded = false;
}

export function projectRespawn(state: ElevationState, y: number): void {
  state.y = y;
  state.velocityY = 0;
  state.grounded = true;
}

export function tick(state: ElevationState, x: number, z: number, dt: number): void {
  if (state.eagerBuffer.jumpRequested) {
    state.eagerBuffer.jumpRequested = false;
    state.velocityY = jumpSpeed;
    state.grounded = false;
  }

  if (state.grounded) {
    const ground = WorldCollisionModule.getGroundHeight(x, z);
    if (ground < state.y - 0.05) {
      state.grounded = false;
      state.velocityY = 0;
    } else {
      state.y = ground;
    }
    return;
  }

  state.velocityY += gravity * dt;
  state.y += state.velocityY * dt;

  const ground = WorldCollisionModule.getGroundHeight(x, z, state.y);
  if (state.y <= ground) {
    state.y = ground;
    state.velocityY = 0;
    state.grounded = true;
  }
}
