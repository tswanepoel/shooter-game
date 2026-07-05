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

// Chase rates (higher = snappier). Neck faster than gun; eye rate is dynamic.
export const PITCH_LAG = {
  torso: 10,
  neck: 22,
  gun: 14,
  eyeFast: 45,
  eyeSlow: 120,
  eyeSpeedScale: 2.5,
} as const;