import type { Vec3 } from "../../types/vec3.ts";
import rawConfig from "./config.json";
import type { ModuleConfig } from "./config.ts";

export const config: ModuleConfig = Object.freeze(rawConfig);

export interface Projectile {
  id: number;
  ownerId: string | undefined;
  position: Vec3;
  previousPosition: Vec3;
  direction: Vec3;
  distanceTraveled: number;
}

export interface BallisticsState {
  projectiles: Projectile[];
  nextId: number;
}

export function createInitialState(): BallisticsState {
  return {
    projectiles: [],
    nextId: 1,
  };
}
