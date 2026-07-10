import rawConfig from "./config.json";

export const maxHealth: number = rawConfig.max;

export interface HealthState {
  health: number;
  alive: boolean;
}
