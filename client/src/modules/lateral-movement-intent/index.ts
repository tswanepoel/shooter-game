export { createInitialState, type LateralMovementIntentState } from "./state.ts";

import { projectKeyDown, projectKeyUp, tick, reset } from "./logic.ts";

export const LateralMovementIntentModule = {
  projectKeyDown,
  projectKeyUp,
  tick,
  reset,
} as const;
