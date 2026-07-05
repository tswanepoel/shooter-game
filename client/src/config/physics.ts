export const WORLD_BOUNDARY = 45;

export const MOVE_SPEED = {
  forward: 6,
  backward: 4,
  lateral: 5,
  sprint: 9,
} as const;

export const STAMINA = {
  max: 100,
  drainPerSecond: 25,
  recoverPerSecond: 15,
  enterFloor: 15,
} as const;

export const MOUSE_SENSITIVITY = 0.0025;
export const MAX_PITCH = Math.PI / 2 - 0.01;

export const GRAVITY = -20;
export const JUMP_SPEED = 8;

export const CROSSHAIR_DISTANCE = 20;
