import type { AimState } from "./state.ts";
import type { Vec3 } from "../../types/vec3.ts";

export function projectMuzzleLine(state: AimState, origin: Vec3, direction: Vec3): void {
  state.origin.x = origin.x;
  state.origin.y = origin.y;
  state.origin.z = origin.z;
  state.direction.x = direction.x;
  state.direction.y = direction.y;
  state.direction.z = direction.z;
}
