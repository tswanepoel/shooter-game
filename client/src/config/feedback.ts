export const CAMERA_FEEDBACK = {
  sway: {
    yawAmplitude: 0.0025,
    pitchAmplitude: 0.0018,
    freqA: 0.45,
    freqB: 0.27,
  },
  bob: {
    moveThreshold: 0.5,
    heightAmplitude: 0.035,
    pitchAmplitude: 0.01,
    phasePerMeter: 0.85,
    sprintMultiplier: 1.6,
  },
  flinch: {
    decayRate: 14,
    kickIntensity: 0.045,
    stackPerHit: 0.55,
    maxIntensity: 1,
  },
} as const;

export const HIT_MARKER = {
  duration: 0.14,
  size: 14,
} as const;

export const DAMAGE_INDICATOR = {
  duration: 0.75,
  arcDegrees: 36,
  radius: 52,
  strokeWidth: 3,
} as const;

export const DEATH_POSE_PITCH = -Math.PI / 2 + 0.15;