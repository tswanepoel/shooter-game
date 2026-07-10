import rawConfig from "./config.json";
import type { ModuleConfig } from "./config.ts";

export const config: ModuleConfig = Object.freeze(rawConfig);

export interface WeaponFireState {
  cooldown: number;
}
