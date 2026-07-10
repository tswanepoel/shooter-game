export { createInitialState, type BallisticsState, type Projectile } from "./state.ts";
export type { ProjectileHit } from "./logic.ts";

import { spawnProjectile, tick, getMaxRange } from "./logic.ts";

export const BallisticsModule = {
  spawnProjectile,
  tick,
  getMaxRange,
} as const;
