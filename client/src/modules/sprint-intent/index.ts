export { createInitialState, type SprintIntentState } from "./state.ts";

import { projectKeyDown, projectKeyUp, tick, reset } from "./logic.ts";

export const SprintIntentModule = {
  projectKeyDown,
  projectKeyUp,
  tick,
  reset,
} as const;
