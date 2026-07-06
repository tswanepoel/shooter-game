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
  enterFloor: 30,
} as const;

export const MOUSE_SENSITIVITY = 0.0025;
/** Per pointermove delivery; spikes in recordings were ~460px while normal frames are ~15px. */
export const MAX_POINTER_DELTA_PX = 80;
// Vertical look clamp. Kept below ±90° so gun aim can climb past the view toward screen edges.
export const MAX_PITCH = (60 * Math.PI) / 180;

export const GRAVITY = -32;
export const JUMP_SPEED = 7.5;

export const CROSSHAIR_DISTANCE = 20;

// Remote locomotion is inferred from measured horizontal speed against these
// bounds — safe because movement's diagonal clamp keeps walk speed from ever
// reaching sprint speed.
export const LOCOMOTION_SPEED_THRESHOLD = {
  walk: 0.5,
  sprint: 7,
} as const;

export const REMOTE_POSITION_LERP_RATE = 12;
