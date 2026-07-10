export { createInitialState, type WeaponFireIntentState } from "./state.ts";

import { projectMouseDown, projectMouseUp, tick, reset } from "./logic.ts";

export const WeaponFireIntentModule = {
  projectMouseDown,
  projectMouseUp,
  tick,
  reset,
} as const;
