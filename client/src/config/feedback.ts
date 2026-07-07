export const CROSSHAIR = {
  sizePx: 7,
  outlinePx: 4,
} as const;

export const HIT_MARKER = {
  holdDuration: 0.03,
  fadeDuration: 0.01,
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