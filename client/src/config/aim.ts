// Pose shares per link — torso/head split body bend; with eye remainder they sum to 1.
// The eye-line pitch remainder (1 − torso − head) is instant at the camera; the arm
// continues into that remainder for vertical aim ceiling (see AIM_ARM_EYE_REMAINDER).
export const AIM_SHARE = {
  torso: 0.3,
  head: 0.25,
} as const;

export const AIM_EYE_REMAINDER = 1 - AIM_SHARE.torso - AIM_SHARE.head;

// Lagged share budget per axis — totals must match for straight diagonal flicks.
export const AIM_LAG_SHARE = {
  azimuth: {
    head: 0.25,
    torso: 0.75,
  },
  elevation: {
    head: 0.25,
    torso: 0.3,
    arm: 0.45,
  },
} as const;

const AZIMUTH_LAGGED_TOTAL =
  AIM_LAG_SHARE.azimuth.head + AIM_LAG_SHARE.azimuth.torso;
const ELEVATION_LAGGED_TOTAL =
  AIM_LAG_SHARE.elevation.head +
  AIM_LAG_SHARE.elevation.torso +
  AIM_LAG_SHARE.elevation.arm;

if (AZIMUTH_LAGGED_TOTAL !== 1) {
  throw new Error(`aim lag shares (azimuth) must sum to 1, got ${AZIMUTH_LAGGED_TOTAL}`);
}
if (ELEVATION_LAGGED_TOTAL !== 1) {
  throw new Error(`aim lag shares (elevation) must sum to 1, got ${ELEVATION_LAGGED_TOTAL}`);
}

// How far the arm continues past the shoulder line into the eye remainder at full pitch.
export const AIM_ARM_EYE_REMAINDER = 2.4;

export interface AxisChase {
  snappy: number;
  laggy: number;
  speedScale: number;
}

// One chase curve per link, shared across axes — lag budgets stay paired on diagonals.
export const AIM_CHASE = {
  head: { snappy: 92, laggy: 24, speedScale: 1 },
  torso: { snappy: 78, laggy: 18, speedScale: 1 },
  arm: { snappy: 70, laggy: 28, speedScale: 1 },
  speedSmoothing: 5,
} as const;