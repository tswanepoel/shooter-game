import {
  AIM_PITCH,
  AIM_YAW,
  headPitchTarget,
  shoulderPitchTarget,
  torsoPitchTarget,
  weaponPitchTarget,
  type ChaseConfig,
} from "../config/aim.ts";
import { localPlayer } from "../state/world.ts";

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
  shoulderPitch: number;
  armPitch: number;
}

export function snapCascadeToTarget(state: AimCascadeState): void {
  state.headPitch = headPitchTarget(state.targetPitch);
  state.torsoPitch = torsoPitchTarget(state.targetPitch);
  state.shoulderPitch = shoulderPitchTarget(state.targetPitch);
  state.armPitch = weaponPitchTarget(state.targetPitch);
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

function chaseRate(config: ChaseConfig, inputSpeed: number): number {
  const { snappy, laggy, speedScale } = config;
  return laggy + (snappy - laggy) * Math.exp(-speedScale * inputSpeed);
}

export function yawChaseRates(yawSpeed: number): {
  headCosmetic: number;
  torso: number;
} {
  return {
    headCosmetic: chaseRate(AIM_YAW.chase.headCosmetic, yawSpeed),
    torso: chaseRate(AIM_YAW.chase.torso, yawSpeed),
  };
}

export function pitchChaseRates(pitchSpeed: number): {
  headCosmetic: number;
  torso: number;
  shoulder: number;
} {
  return {
    headCosmetic: chaseRate(AIM_PITCH.chase.headCosmetic, pitchSpeed),
    torso: chaseRate(AIM_PITCH.chase.torso, pitchSpeed),
    shoulder: chaseRate(AIM_PITCH.chase.shoulder, pitchSpeed),
  };
}

function smoothToward(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function tickCascade(state: AimCascadeState, dt: number): void {
  const pitchStep = state.targetPitch - state.lastTargetPitch;
  const pitchSpeed = Math.abs(pitchStep) / Math.max(dt, 1e-6);
  state.lastTargetPitch = state.targetPitch;

  const yawStep = state.targetYaw - state.lastTargetYaw;
  const yawSpeed = Math.abs(yawStep) / Math.max(dt, 1e-6);
  state.lastTargetYaw = state.targetYaw;

  state.smoothedInputSpeed = smoothToward(
    state.smoothedInputSpeed,
    Math.hypot(pitchSpeed, yawSpeed),
    Math.max(AIM_YAW.speedSmoothing, AIM_PITCH.speedSmoothing),
    dt,
  );
  state.smoothedYawSpeed = smoothToward(
    state.smoothedYawSpeed,
    yawSpeed,
    AIM_YAW.speedSmoothing,
    dt,
  );
  state.smoothedPitchSpeed = smoothToward(
    state.smoothedPitchSpeed,
    pitchSpeed,
    AIM_PITCH.speedSmoothing,
    dt,
  );

  const yawRates = yawChaseRates(state.smoothedYawSpeed);
  const pitchRates = pitchChaseRates(state.smoothedPitchSpeed);

  state.headYaw = chase(state.headYaw, state.targetYaw, yawRates.headCosmetic, dt);
  state.torsoYaw = chase(state.torsoYaw, state.targetYaw, yawRates.torso, dt);

  state.headPitch = chase(
    state.headPitch,
    headPitchTarget(state.targetPitch),
    pitchRates.headCosmetic,
    dt,
  );
  state.torsoPitch = chase(
    state.torsoPitch,
    torsoPitchTarget(state.targetPitch),
    pitchRates.torso,
    dt,
  );
  state.shoulderPitch = chase(
    state.shoulderPitch,
    shoulderPitchTarget(state.targetPitch),
    pitchRates.shoulder,
    dt,
  );
  state.armPitch = state.torsoPitch + state.shoulderPitch;
}

export function tickAimCascade(dt: number): void {
  tickCascade(localPlayer, dt);
}