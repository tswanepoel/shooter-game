import type { PoseState } from "./state.ts";
import type { ChaseConfig, FlexConfig } from "./config.ts";
import rawConfig from "./config.json";
import type { ModuleConfig } from "./config.ts";
import { maxPitch } from "../gaze/index.ts";

const config: ModuleConfig = Object.freeze(rawConfig);

export function snapToTarget(state: PoseState): void {
  state.headPitch = flexTarget(state.targetPitch, config.head.flex);
  state.torsoPitch = flexTarget(state.targetPitch, config.torso.flex);
  state.shoulderPitch = flexTarget(state.targetPitch, config.shoulder.flex);
  state.armPitch = state.torsoPitch + state.shoulderPitch;
  state.headYaw = state.targetYaw;
  state.torsoYaw = state.targetYaw;
  state.lastTargetPitch = state.targetPitch;
  state.lastTargetYaw = state.targetYaw;
  state.smoothedInputSpeed = 0;
  state.smoothedYawSpeed = 0;
  state.smoothedPitchSpeed = 0;
}

export function tick(state: PoseState, dt: number): void {
  const pitchStep = state.targetPitch - state.lastTargetPitch;
  const pitchSpeed = Math.abs(pitchStep) / Math.max(dt, 1e-6);
  state.lastTargetPitch = state.targetPitch;

  const yawStep = state.targetYaw - state.lastTargetYaw;
  const yawSpeed = Math.abs(yawStep) / Math.max(dt, 1e-6);
  state.lastTargetYaw = state.targetYaw;

  state.smoothedInputSpeed = chase(state.smoothedInputSpeed, Math.hypot(pitchSpeed, yawSpeed), config.smoothing, dt);
  state.smoothedYawSpeed = chase(state.smoothedYawSpeed, yawSpeed, config.smoothing, dt);
  state.smoothedPitchSpeed = chase(state.smoothedPitchSpeed, pitchSpeed, config.smoothing, dt);

  const headPivotRate = chaseRate(config.head.pivot.chase, state.smoothedYawSpeed);
  const torsoPivotRate = chaseRate(config.torso.pivot.chase, state.smoothedYawSpeed);

  const headFlexRate = chaseRate(config.head.flex.chase, state.smoothedPitchSpeed);
  const torsoFlexRate = chaseRate(config.torso.flex.chase, state.smoothedPitchSpeed);
  const shoulderFlexRate = chaseRate(config.shoulder.flex.chase, state.smoothedPitchSpeed);

  state.headYaw = chase(state.headYaw, state.targetYaw, headPivotRate, dt);
  state.torsoYaw = chase(state.torsoYaw, state.targetYaw, torsoPivotRate, dt);

  state.headPitch = chase(state.headPitch, flexTarget(state.targetPitch, config.head.flex), headFlexRate, dt);
  state.torsoPitch = chase(state.torsoPitch, flexTarget(state.targetPitch, config.torso.flex), torsoFlexRate, dt);
  state.shoulderPitch = chase(
    state.shoulderPitch,
    flexTarget(state.targetPitch, config.shoulder.flex),
    shoulderFlexRate,
    dt,
  );
  state.armPitch = state.torsoPitch + state.shoulderPitch;
}

function chase(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function chaseRate(chaseConfig: ChaseConfig, inputSpeed: number): number {
  const { snappy, laggy, speedScale } = chaseConfig;
  return laggy + (snappy - laggy) * Math.exp(-speedScale * inputSpeed);
}

function flexTarget(commandPitch: number, flex: FlexConfig): number {
  if (commandPitch === 0) return 0;
  const bendAtMax = commandPitch > 0 ? flex.max.outward : flex.max.inward;
  if (bendAtMax === 0) return 0;
  return bendAtMax * (commandPitch / maxPitch);
}