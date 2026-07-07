// World/spawn bounds live in config/shipment.ts (yard footprint). Must match server/GameConfig.cs.

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

export const MOUSE_SENSITIVITY = 0.002;
/** Per pointermove delivery; spikes in recordings were ~460px while normal frames are ~15px. */
export const MAX_POINTER_DELTA_PX = 80;
/** Ocular pitch cap (AIM.md): below ±90° so the weapon line can pass the view toward screen edges. */
export const MAX_PITCH = (80 * Math.PI) / 180;

export const CAMERA_FOV = 90;

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
