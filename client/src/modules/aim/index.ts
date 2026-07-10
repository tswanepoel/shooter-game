export { createInitialState, type AimState } from "./state.ts";

import { projectMuzzleLine } from "./logic.ts";

export const AimModule = {
  projectMuzzleLine,
} as const;
