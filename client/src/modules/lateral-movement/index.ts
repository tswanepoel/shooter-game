export type { LateralMovementState } from "./state.ts";

import { tick } from "./logic.ts";

export const LateralMovementModule = {
  tick,
} as const;
