import type { GazeState } from "./state.ts";
import type { ModuleConfig } from "./config.ts";
import rawConfig from "./config.json";

/** Radians. Ocular pitch cap (AIM.md): ~80°, below 90° so the weapon line can pass the view toward screen edges. */
const config: ModuleConfig = rawConfig;
export const maxPitch: number = config.maxPitch;

export function projectOrientation(state: GazeState, yaw: number, pitch: number): void {
  state.targetYaw = yaw;
  state.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
}

export function tick(state: GazeState, yawDelta: number, pitchDelta: number): void {
  state.targetYaw -= yawDelta;
  state.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, state.targetPitch - pitchDelta));
}
