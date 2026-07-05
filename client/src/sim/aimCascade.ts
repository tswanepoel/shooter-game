import { GUN_REMAINDER_SHARE, PITCH_LAG, PITCH_SHARE } from "../config/aim.ts";
import { getCurrentWeapon, type WeaponRecipe } from "../config/weapons.ts";
import { localPlayer } from "../state/world.ts";

export interface AimCascadeState {
  targetYaw: number;
  targetPitch: number;
  lastTargetPitch: number;
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

/** Gun aim offset from the camera view — drives crosshair and projectiles. */
export function gunAimDelta(state: AimCascadeState): { pitch: number; yaw: number } {
  return {
    pitch: state.gunPitch - viewPitch(state),
    yaw: state.gunYaw - state.targetYaw,
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
  state.torsoYaw = state.gunYaw = state.targetYaw;
  state.torsoPitch = torso;
  state.neckPitch = neck;
  state.eyePitch = eye;
  state.gunPitch = gun;
  state.lastTargetPitch = state.targetPitch;
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

function eyeChaseRate(pitchSpeed: number): number {
  const { eyeFast, eyeSlow, eyeSpeedScale } = PITCH_LAG;
  return eyeFast + (eyeSlow - eyeFast) * Math.exp(-eyeSpeedScale * pitchSpeed);
}

export function tickCascade(state: AimCascadeState, dt: number, weapon: WeaponRecipe = getCurrentWeapon()): void {
  const { torso, neck, eye, gun } = splitTargetPitch(state.targetPitch);

  const pitchSpeed = Math.abs(state.targetPitch - state.lastTargetPitch) / Math.max(dt, 1e-6);
  state.lastTargetPitch = state.targetPitch;

  state.torsoPitch = chase(state.torsoPitch, torso, PITCH_LAG.torso, dt);
  state.neckPitch = chase(state.neckPitch, neck, PITCH_LAG.neck, dt);
  state.eyePitch = chase(state.eyePitch, eye, eyeChaseRate(pitchSpeed), dt);

  state.torsoYaw = chase(state.torsoYaw, state.targetYaw, weapon.torsoChaseRate, dt);

  const yawRate = gunChaseRate(state.targetYaw - state.gunYaw, weapon);
  state.gunYaw = chase(state.gunYaw, state.targetYaw, yawRate, dt);
  state.gunPitch = chase(state.gunPitch, gun, PITCH_LAG.gun, dt);
}

export function tickAimCascade(dt: number): void {
  tickCascade(localPlayer, dt);
}