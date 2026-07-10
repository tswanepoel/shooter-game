export type { ElevationState } from "./state.ts";
export { gravity, jumpSpeed } from "./logic.ts";

import { tick, projectInternalJump, projectImmediateJump, projectRespawn } from "./logic.ts";

export const ElevationModule = {
  tick,
  projectInternalJump,
  projectImmediateJump,
  projectRespawn,
} as const;
