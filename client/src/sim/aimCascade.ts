import { GUN_REMAINDER_SHARE, PITCH_LAG, PITCH_SHARE, YAW_LAG } from "../config/aim.ts";
import { getCurrentWeapon, type WeaponRecipe } from "../config/weapons.ts";
import { localPlayer } from "../state/world.ts";

export interface AimCascadeState {
  targetYaw: number;
  targetPitch: number;
  lastTargetPitch: number;
  lastTargetYaw: number;
  inputYawSpeed: number;
  smoothedTorsoYawRate: number;
  smoothedGunYawRate: number;
  torsoYawLag: number;
  gunYawLag: number;
  displayTorsoYawLag: number;
  displayGunYawLag: number;
  torsoYaw: number;
  torsoPitch: number;
  neckPitch: number;
  eyePitch: number;
  gunYaw: number;
  gunPitch: number;
}

export function viewPitch(state: AimCascadeState): number {
  return state.torsoPitch + state.neckPitch + state.eyePitch;
}

export function shoulderPitch(state: AimCascadeState): number {
  return state.torsoPitch + state.neckPitch;
}

/** Gun aim offset — simulation truth for projectiles. */
export function gunAimDelta(state: AimCascadeState): { pitch: number; yaw: number } {
  return {
    pitch: state.gunPitch - viewPitch(state),
    yaw: state.gunYawLag,
  };
}

/** Smoothed gun aim offset for crosshair and view-model (reduces visual jitter). */
export function gunAimDeltaVisual(state: AimCascadeState): { pitch: number; yaw: number } {
  return {
    pitch: state.gunPitch - viewPitch(state),
    yaw: state.displayGunYawLag,
  };
}

export function splitTargetPitch(targetPitch: number): {
  torso: number;
  neck: number;
  eye: number;
  shoulder: number;
  gun: number;
} {
  const torso = PITCH_SHARE.torso * targetPitch;
  const neck = PITCH_SHARE.neck * targetPitch;
  const shoulder = torso + neck;
  const remainder = targetPitch - shoulder;
  const eye = remainder;
  const gun = shoulder + GUN_REMAINDER_SHARE * remainder;
  return { torso, neck, eye, shoulder, gun };
}

export function snapCascadeToTarget(state: AimCascadeState): void {
  const { torso, neck, eye, gun } = splitTargetPitch(state.targetPitch);
  state.torsoYawLag = 0;
  state.gunYawLag = 0;
  state.displayTorsoYawLag = 0;
  state.displayGunYawLag = 0;
  state.torsoYaw = state.gunYaw = state.targetYaw;
  state.torsoPitch = torso;
  state.neckPitch = neck;
  state.eyePitch = eye;
  state.gunPitch = gun;
  state.lastTargetPitch = state.targetPitch;
  state.lastTargetYaw = state.targetYaw;
  state.inputYawSpeed = 0;
  state.smoothedTorsoYawRate = YAW_LAG.torso.snappy;
  state.smoothedGunYawRate = YAW_LAG.gun.snappy;
}

export function angularDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

function chase(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function gunChaseRate(gap: number, weapon: WeaponRecipe): number {
  const t = smoothstep(Math.abs(gap), weapon.gunLagThresholdLow, weapon.gunLagThresholdHigh);
  return weapon.gunChaseRateFast + (weapon.gunChaseRateSlow - weapon.gunChaseRateFast) * t;
}

function speedWeightedChaseRate(
  snappy: number,
  laggy: number,
  speed: number,
  speedScale: number,
): number {
  return laggy + (snappy - laggy) * Math.exp(-speedScale * speed);
}

function eyeChaseRate(pitchSpeed: number): number {
  const { eyeFast, eyeSlow, eyeSpeedScale } = PITCH_LAG;
  return speedWeightedChaseRate(eyeSlow, eyeFast, pitchSpeed, eyeSpeedScale);
}

function torsoPitchChaseRate(pitchSpeed: number): number {
  const { snappy, laggy, speedScale } = PITCH_LAG.torso;
  return speedWeightedChaseRate(snappy, laggy, pitchSpeed, speedScale);
}

function neckPitchChaseRate(pitchSpeed: number): number {
  const { snappy, laggy, speedScale } = PITCH_LAG.neck;
  return speedWeightedChaseRate(snappy, laggy, pitchSpeed, speedScale);
}

function gunPitchChaseRate(pitchSpeed: number): number {
  const { snappy, laggy, speedScale } = PITCH_LAG.gun;
  return speedWeightedChaseRate(snappy, laggy, pitchSpeed, speedScale);
}

function torsoYawChaseRate(yawSpeed: number): number {
  const { snappy, laggy, speedScale } = YAW_LAG.torso;
  return speedWeightedChaseRate(snappy, laggy, yawSpeed, speedScale);
}

function gunYawSpeedChaseRate(yawSpeed: number): number {
  const { snappy, laggy, speedScale } = YAW_LAG.gun;
  return speedWeightedChaseRate(snappy, laggy, yawSpeed, speedScale);
}

function smoothToward(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function applyLagDeadzone(lag: number, deadzone: number): number {
  return Math.abs(lag) < deadzone ? 0 : lag;
}

export function tickCascade(state: AimCascadeState, dt: number, weapon: WeaponRecipe = getCurrentWeapon()): void {
  const { torso, neck, eye, gun } = splitTargetPitch(state.targetPitch);
  const { rateSmoothing, speedSmoothing, lagDisplaySmoothing, lagDeadzone, maxInputSpeed } = YAW_LAG;

  const pitchSpeed = Math.abs(state.targetPitch - state.lastTargetPitch) / Math.max(dt, 1e-6);
  state.lastTargetPitch = state.targetPitch;

  const targetYawStep = angularDelta(state.lastTargetYaw, state.targetYaw);
  const instantYawSpeed = Math.min(
    Math.abs(targetYawStep) / Math.max(dt, 1e-6),
    maxInputSpeed,
  );
  state.inputYawSpeed = smoothToward(state.inputYawSpeed, instantYawSpeed, speedSmoothing, dt);
  state.lastTargetYaw = state.targetYaw;

  state.torsoPitch = chase(state.torsoPitch, torso, torsoPitchChaseRate(pitchSpeed), dt);
  state.neckPitch = chase(state.neckPitch, neck, neckPitchChaseRate(pitchSpeed), dt);
  state.eyePitch = chase(state.eyePitch, eye, eyeChaseRate(pitchSpeed), dt);

  // Lag-offset yaw: stays near zero, anchored to target — avoids unbounded-angle delta jitter.
  state.torsoYawLag += targetYawStep;
  state.gunYawLag -= targetYawStep;

  const targetTorsoYawRate = torsoYawChaseRate(state.inputYawSpeed);
  state.smoothedTorsoYawRate = smoothToward(
    state.smoothedTorsoYawRate,
    targetTorsoYawRate,
    rateSmoothing,
    dt,
  );
  state.torsoYawLag = applyLagDeadzone(
    chase(state.torsoYawLag, 0, state.smoothedTorsoYawRate, dt),
    lagDeadzone,
  );

  const targetGunYawRate = gunYawSpeedChaseRate(state.inputYawSpeed);
  state.smoothedGunYawRate = smoothToward(
    state.smoothedGunYawRate,
    targetGunYawRate,
    rateSmoothing,
    dt,
  );
  state.gunYawLag = applyLagDeadzone(
    chase(state.gunYawLag, 0, state.smoothedGunYawRate, dt),
    lagDeadzone,
  );

  state.displayTorsoYawLag = smoothToward(
    state.displayTorsoYawLag,
    state.torsoYawLag,
    lagDisplaySmoothing,
    dt,
  );
  state.displayGunYawLag = smoothToward(
    state.displayGunYawLag,
    state.gunYawLag,
    lagDisplaySmoothing,
    dt,
  );

  state.torsoYaw = state.targetYaw - state.torsoYawLag;
  state.gunYaw = state.targetYaw + state.gunYawLag;
  state.gunPitch = chase(state.gunPitch, gun, gunPitchChaseRate(pitchSpeed), dt);
}

export function tickAimCascade(dt: number): void {
  tickCascade(localPlayer, dt);
}