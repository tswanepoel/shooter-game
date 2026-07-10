export type { WeaponFireState } from "./state.ts";

import { tick } from "./logic.ts";

export const WeaponFireModule = {
  tick,
} as const;
