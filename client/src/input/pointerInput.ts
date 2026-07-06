let pendingDx = 0;
let pendingDy = 0;

export function accumulatePointerDelta(dx: number, dy: number): void {
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