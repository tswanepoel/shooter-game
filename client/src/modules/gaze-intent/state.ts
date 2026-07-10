import rawConfig from "./config.json";
import type { ModuleConfig } from "./config.ts";

export const config: ModuleConfig = Object.freeze(rawConfig);

export interface GazeIntentState {
  yawDelta: number;
  pitchDelta: number;
  eagerBuffer: {
    pendingDx: number;
    pendingDy: number;
  };
}

export function createInitialState(): GazeIntentState {
  return {
    yawDelta: 0,
    pitchDelta: 0,
    eagerBuffer: {
      pendingDx: 0,
      pendingDy: 0,
    },
  };
}
