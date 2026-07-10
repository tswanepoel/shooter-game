export { createInitialState, type JumpIntentState } from "./state.ts";

import { projectKeyDown, tick, reset } from "./logic.ts";

export const JumpIntentModule = {
  projectKeyDown,
  tick,
  reset,
} as const;
