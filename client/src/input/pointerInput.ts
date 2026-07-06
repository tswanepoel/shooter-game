import { MAX_POINTER_DELTA_PX } from "../config/physics.ts";

let pendingDx = 0;
let pendingDy = 0;

export function accumulatePointerDelta(dx: number, dy: number): void {
  if (Math.abs(dx) > MAX_POINTER_DELTA_PX || Math.abs(dy) > MAX_POINTER_DELTA_PX) return;
  pendingDx += dx;
  pendingDy += dy;
}

export function drainPointerDelta(): { dx: number; dy: number } {
  const delta = { dx: pendingDx, dy: pendingDy };
  pendingDx = 0;
  pendingDy = 0;
  return delta;
}

export function clearPointerDelta(): void {
  pendingDx = 0;
  pendingDy = 0;
}