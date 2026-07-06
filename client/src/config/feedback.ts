export const CAMERA_FEEDBACK = {
  sway: {
    yawAmplitude: 0.0025,
    pitchAmplitude: 0.0018,
    freqA: 0.45,
    freqB: 0.27,
  },
  bob: {
    moveThreshold: 0.5,
    heightAmplitude: 0.016,
    pitchAmplitude: 0.0045,
    phasePerMeter: 1.15,
    sprintMultiplier: 1.35,
  },
  flinch: {
    decayRate: 14,
    kickIntensity: 0.042,
    stackPerHit: 0.42,
    maxIntensity: 0.75,
  },
} as const;

export const CROSSHAIR = {
  sizePx: 4,
} as const;

export const HIT_MARKER = {
  holdDuration: 0.04,
  fadeDuration: 0.08,
  tickLength: 6,
  centerGap: 4,
  strokePx: 1.5,
  outlinePx: 0.75,
  cornerRadius: 999,
  scale: 1,
  tickAngles: [45, 135, 225, 315],
} as const;

export const DAMAGE_OVERLAY = {
  maxConcurrentSplats: 4,
  splatSizePx: 200,
  edgeInsetPercent: 38,
  rotationJitterDegrees: 32,
  animDuration: 0.1,
  holdDuration: 0.18,
  fadeDuration: 0.65,
  vignetteMaxOpacity: 0.85,
  vignetteStackPerHit: 0.55,
  vignettePulseDecayRate: 7,
  vignetteRestMax: 0.72,
  vignetteRestCurve: 1.2,
  vignetteRestSmoothing: 5,
} as const;

export const DEATH_POSE_PITCH = -Math.PI / 2 + 0.15;