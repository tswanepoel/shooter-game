// Body pitch shares of target — must sum to less than 1. The remainder goes to eyes.
export const PITCH_SHARE = {
  torso: 0.3,
  neck: 0.25,
} as const;

// How much of the eye remainder the arm may climb into above the shoulder line.
// Eyes still chase the full remainder for camera view; this only raises the gun setpoint.
// Crosshair offset from center ≈ (share − 1) × (1 − torso − neck) × maxPitch.
// At share 2.4 and maxPitch 55°, gunΔ ≈ 35° — near the vertical screen edge at fov 75.
export const GUN_REMAINDER_SHARE = 2.4;

// Chase rates (higher = snappier). Torso/neck/gun pitch and eye rate are speed-weighted.
export const PITCH_LAG = {
  torso: { snappy: 78, laggy: 18, speedScale: 2.5 },
  neck: { snappy: 92, laggy: 24, speedScale: 2.5 },
  gun: { snappy: 42, laggy: 14, speedScale: 2.5 },
  eyeFast: 38,
  eyeSlow: 88,
  eyeSpeedScale: 2.2,
} as const;

// Horizontal chase — speed-weighted; gun yaw blends speed + gap (max, not min).
export const YAW_LAG = {
  torso: { snappy: 90, laggy: 35, speedScale: 3.5 },
  gun: { snappy: 70, laggy: 28, speedScale: 3.5 },
  rateSmoothing: 12,
  speedSmoothing: 5,
  lagDisplaySmoothing: 22,
  lagDeadzone: 0.0002,
  maxInputSpeed: 10,
} as const;