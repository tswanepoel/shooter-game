export type { LateralPositionState } from "./state.ts";

import { tick, projectInternalJump, projectRespawn } from "./logic.ts";

export const LateralPositionModule = {
  tick,
  projectInternalJump,
  projectRespawn,
} as const;
