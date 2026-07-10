export type { PoseState } from "./state.ts";

import { tick, snapToTarget } from "./logic.ts";

export const PoseModule = {
  tick,
  snapToTarget,
} as const;
