export { maxHealth, type HealthState } from "./state.ts";
import { projectWelcome, projectHealth, projectDeath, projectRespawn } from "./logic.ts";

export const HealthModule = {
  projectWelcome,
  projectHealth,
  projectDeath,
  projectRespawn,
} as const;
