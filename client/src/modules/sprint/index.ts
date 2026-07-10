export type { SprintState } from "./state.ts";

import { tick, projectRespawn } from "./logic.ts";
import { config } from "./state.ts";

export const staminaMax = config.max;

export const SprintModule = {
  tick,
  projectRespawn,
} as const;
