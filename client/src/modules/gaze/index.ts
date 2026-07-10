export type { GazeState } from "./state.ts";

import { tick, projectOrientation, maxPitch } from "./logic.ts";
export { maxPitch };

export const GazeModule = {
  tick,
  projectOrientation,
} as const;
