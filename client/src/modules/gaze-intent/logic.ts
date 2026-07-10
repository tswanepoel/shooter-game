import { type GazeIntentState, config } from "./state.ts";

export interface RawPointerDelta {
  readonly dx: number;
  readonly dy: number;
}

export function projectPointerMove(state: GazeIntentState, event: RawPointerDelta): void {
  if (Math.abs(event.dx) > config.maxPointerDeltaPx || Math.abs(event.dy) > config.maxPointerDeltaPx) return;
  state.eagerBuffer.pendingDx += event.dx;
  state.eagerBuffer.pendingDy += event.dy;
}

export function tick(state: GazeIntentState): void {
  state.yawDelta = state.eagerBuffer.pendingDx * config.sensitivity;
  state.pitchDelta = state.eagerBuffer.pendingDy * config.sensitivity;
  state.eagerBuffer.pendingDx = 0;
  state.eagerBuffer.pendingDy = 0;
}

export function reset(state: GazeIntentState): void {
  state.yawDelta = 0;
  state.pitchDelta = 0;
  state.eagerBuffer.pendingDx = 0;
  state.eagerBuffer.pendingDy = 0;
}
