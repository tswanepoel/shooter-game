import { MAX_PITCH } from "./physics.ts";

export interface ChaseConfig {
  snappy: number;
  laggy: number;
  speedScale: number;
}

/**
 * Horizontal aim — eyes instant; torso lags eyes; weapon yaw = torso yaw.
 * Head yaw is 3P cosmetic only (neck relative to torso) and is not on the weapon line.
 */
export const AIM_YAW = {
  lagShare: {
    torso: 1,
  },
  chase: {
    torso: { snappy: 256, laggy: 32, speedScale: 1 },
    headCosmetic: { snappy: 368, laggy: 96, speedScale: 1 },
  },
  speedSmoothing: 5,
} as const;

/**
 * Vertical aim — eyes instant (capped); weapon pitch = torso + shoulder.
 * Head pitch is 3P cosmetic only and is not on the weapon line.
 */
export const AIM_PITCH = {
  bendAtMax: {
    torso: (10 * Math.PI) / 180,
    shoulder: (85 * Math.PI) / 180,
    headCosmetic: (55 * Math.PI) / 180,
  },
  lagShare: {
    torso: 10 / (10 + 85),
    shoulder: 85 / (10 + 85),
  },
  chase: {
    torso: { snappy: 48, laggy: 10, speedScale: 1 },
    shoulder: { snappy: 48, laggy: 10, speedScale: 1 },
    headCosmetic: { snappy: 368, laggy: 96, speedScale: 1 },
  },
  speedSmoothing: 5,
} as const;

const YAW_LAG_TOTAL = AIM_YAW.lagShare.torso;
const PITCH_LAG_TOTAL = AIM_PITCH.lagShare.torso + AIM_PITCH.lagShare.shoulder;

if (YAW_LAG_TOTAL !== 1) {
  throw new Error(`yaw lag shares must sum to 1, got ${YAW_LAG_TOTAL}`);
}
if (PITCH_LAG_TOTAL !== 1) {
  throw new Error(`pitch lag shares must sum to 1, got ${PITCH_LAG_TOTAL}`);
}
if (YAW_LAG_TOTAL !== PITCH_LAG_TOTAL) {
  throw new Error(
    `yaw and pitch lag totals must match for straight diagonals (yaw ${YAW_LAG_TOTAL}, pitch ${PITCH_LAG_TOTAL})`,
  );
}

export function pitchBendAtCommand(commandPitch: number, bendAtMax: number): number {
  return bendAtMax * (commandPitch / MAX_PITCH);
}

export function torsoPitchTarget(commandPitch: number): number {
  return pitchBendAtCommand(commandPitch, AIM_PITCH.bendAtMax.torso);
}

export function shoulderPitchTarget(commandPitch: number): number {
  return pitchBendAtCommand(commandPitch, AIM_PITCH.bendAtMax.shoulder);
}

export function headPitchTarget(commandPitch: number): number {
  return pitchBendAtCommand(commandPitch, AIM_PITCH.bendAtMax.headCosmetic);
}

/** Lagged weapon-line pitch target (torso + shoulder). */
export function weaponPitchTarget(commandPitch: number): number {
  return torsoPitchTarget(commandPitch) + shoulderPitchTarget(commandPitch);
}