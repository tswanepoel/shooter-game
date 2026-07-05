import {
  AIM_ARM_EYE_REMAINDER,
  AIM_CHASE,
  AIM_EYE_REMAINDER,
  AIM_LAG_SHARE,
  AIM_SHARE,
  type AxisChase,
} from "../config/aim.ts";
import { getCurrentWeapon, type WeaponRecipe } from "../config/weapons.ts";
import { localPlayer } from "../state/world.ts";

export interface AimDelta {
  pitch: number;
  yaw: number;
}

export interface AimCascadeState {
  targetYaw: number;
  targetPitch: number;
  lastTargetYaw: number;
  lastTargetPitch: number;
  smoothedInputSpeed: number;
  smoothedYawSpeed: number;
  smoothedPitchSpeed: number;
  torsoYaw: number;
  torsoPitch: number;
  headYaw: number;
  headPitch: number;
  armPitch: number;
}

/** Pelvis is implicit: locomotion root / torso anchor carries world yaw; rig bones are torso → head → arm. */
export function shoulderPitch(state: AimCascadeState): number {
  return state.torsoPitch + state.headPitch;
}

export function armPitchTarget(targetPitch: number): number {
  return (
    AIM_SHARE.torso * targetPitch +
    AIM_SHARE.head * targetPitch +
    AIM_ARM_EYE_REMAINDER * AIM_EYE_REMAINDER * targetPitch
  );
}

export function laggedShareTotals(): { azimuth: number; elevation: number } {
  return {
    azimuth: AIM_LAG_SHARE.azimuth.head + AIM_LAG_SHARE.azimuth.torso,
    elevation:
      AIM_LAG_SHARE.elevation.head +
      AIM_LAG_SHARE.elevation.torso +
      AIM_LAG_SHARE.elevation.arm,
  };
}

/** Arm aim relative to instant eye (target) — drives crosshair, view-model, projectiles. */
export function armAimDelta(state: AimCascadeState): AimDelta {
  return {
    pitch: state.armPitch - state.targetPitch,
    yaw: state.torsoYaw - state.targetYaw,
  };
}

export function snapCascadeToTarget(state: AimCascadeState): void {
  state.headPitch = AIM_SHARE.head * state.targetPitch;
  state.torsoPitch = AIM_SHARE.torso * state.targetPitch;
  state.armPitch = armPitchTarget(state.targetPitch);
  state.headYaw = state.targetYaw;
  state.torsoYaw = state.targetYaw;
  state.lastTargetPitch = state.targetPitch;
  state.lastTargetYaw = state.targetYaw;
  state.smoothedInputSpeed = 0;
  state.smoothedYawSpeed = 0;
  state.smoothedPitchSpeed = 0;
}

function chase(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function chaseRate(config: AxisChase, inputSpeed: number): number {
  const { snappy, laggy, speedScale } = config;
  return laggy + (snappy - laggy) * Math.exp(-speedScale * inputSpeed);
}

export function aimChaseRates(inputSpeed: number): {
  head: number;
  torso: number;
  arm: number;
} {
  return {
    head: chaseRate(AIM_CHASE.head, inputSpeed),
    torso: chaseRate(AIM_CHASE.torso, inputSpeed),
    arm: chaseRate(AIM_CHASE.arm, inputSpeed),
  };
}

function smoothToward(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function tickCascade(
  state: AimCascadeState,
  dt: number,
  _weapon: WeaponRecipe = getCurrentWeapon(),
): void {
  const pitchStep = state.targetPitch - state.lastTargetPitch;
  const pitchSpeed = Math.abs(pitchStep) / Math.max(dt, 1e-6);
  state.lastTargetPitch = state.targetPitch;

  const yawStep = state.targetYaw - state.lastTargetYaw;
  const yawSpeed = Math.abs(yawStep) / Math.max(dt, 1e-6);
  state.lastTargetYaw = state.targetYaw;

  const instantInputSpeed = Math.hypot(pitchSpeed, yawSpeed);
  const speedSmoothing = AIM_CHASE.speedSmoothing;
  state.smoothedInputSpeed = smoothToward(
    state.smoothedInputSpeed,
    instantInputSpeed,
    speedSmoothing,
    dt,
  );
  state.smoothedYawSpeed = smoothToward(state.smoothedYawSpeed, yawSpeed, speedSmoothing, dt);
  state.smoothedPitchSpeed = smoothToward(
    state.smoothedPitchSpeed,
    pitchSpeed,
    speedSmoothing,
    dt,
  );

  const rates = aimChaseRates(state.smoothedInputSpeed);

  // Serial chain: ocular → head → torso → arm (weapon line reads torso yaw + arm pitch).
  state.headYaw = chase(state.headYaw, state.targetYaw, rates.head, dt);
  state.torsoYaw = chase(state.torsoYaw, state.headYaw, rates.torso, dt);

  const headPitchTarget = AIM_SHARE.head * state.targetPitch;
  state.headPitch = chase(state.headPitch, headPitchTarget, rates.head, dt);

  const torsoPitchTarget = state.headPitch * (AIM_SHARE.torso / AIM_SHARE.head);
  state.torsoPitch = chase(state.torsoPitch, torsoPitchTarget, rates.torso, dt);

  state.armPitch = chase(state.armPitch, armPitchTarget(state.targetPitch), rates.arm, dt);
}

export function tickAimCascade(dt: number): void {
  tickCascade(localPlayer, dt);
}