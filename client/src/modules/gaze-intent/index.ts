export { createInitialState, type GazeIntentState } from "./state.ts";

import { projectPointerMove, tick, reset } from "./logic.ts";
export type { RawPointerDelta } from "./logic.ts";

export const GazeIntentModule = {
  projectPointerMove,
  tick,
  reset,
} as const;
