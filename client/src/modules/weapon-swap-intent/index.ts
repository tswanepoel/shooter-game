export { createInitialState, type WeaponSwapIntentState } from "./state.ts";

import { projectWheel, tick, reset } from "./logic.ts";

export const WeaponSwapIntentModule = {
  projectWheel,
  tick,
  reset,
} as const;
