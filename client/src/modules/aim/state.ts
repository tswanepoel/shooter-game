import type { Vec3 } from "../../types/vec3.ts";

export interface AimState {
  origin: Vec3;
  direction: Vec3;
}

export function createInitialState(): AimState {
  return {
    origin: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: -1 },
  };
}
