import { MAX_PITCH } from "./physics.ts";

export interface ChaseConfig {
  snappy: number;
  laggy: number;
  speedScale: number;
}

export interface DirectionalBend {
  up: number;
  down: number;
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
 * bendAtMax is per look direction; head pitch is 3P cosmetic only.
 */
export const AIM_PITCH = {
  bendAtMax: {
    torso: { up: (7.5 * Math.PI) / 180, down: (15 * Math.PI) / 180 },
    shoulder: { up: (82.5 * Math.PI) / 180, down: (75 * Math.PI) / 180 },
    headCosmetic: { up: (50 * Math.PI) / 180, down: (55 * Math.PI) / 180 },
  },
  chase: {
    torso: { snappy: 48, laggy: 10, speedScale: 1 },
    shoulder: { snappy: 48, laggy: 10, speedScale: 1 },
    headCosmetic: { snappy: 368, laggy: 96, speedScale: 1 },
  },
  speedSmoothing: 5,
} as const;

/** All lagged weapon pitch rides the torso/shoulder chain; eyes are instant. */
export const PITCH_LAG_TOTAL = 1;

const YAW_LAG_TOTAL = AIM_YAW.lagShare.torso;

if (YAW_LAG_TOTAL !== 1) {
  throw new Error(`yaw lag shares must sum to 1, got ${YAW_LAG_TOTAL}`);
}
if (YAW_LAG_TOTAL !== PITCH_LAG_TOTAL) {
  throw new Error(
    `yaw and pitch lag totals must match for straight diagonals (yaw ${YAW_LAG_TOTAL}, pitch ${PITCH_LAG_TOTAL})`,
  );
}

export function pitchBendAtCommand(commandPitch: number, bend: DirectionalBend): number {
  if (commandPitch === 0) return 0;
  const bendAtMax = commandPitch > 0 ? bend.up : bend.down;
  if (bendAtMax === 0) return 0;
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