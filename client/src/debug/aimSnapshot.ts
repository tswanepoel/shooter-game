import {
  AIM_ARM_EYE_REMAINDER,
  AIM_CHASE,
  AIM_EYE_REMAINDER,
  AIM_LAG_SHARE,
  AIM_SHARE,
} from "../config/aim.ts";
import { MAX_PITCH } from "../config/physics.ts";
import {
  aimChaseRates,
  armAimDelta,
  armPitchTarget,
  laggedShareTotals,
  type AimCascadeState,
} from "../sim/aimCascade.ts";
import { localPlayer } from "../state/world.ts";

const RAD_TO_DEG = 180 / Math.PI;

export interface AimAngles {
  yawRad: number;
  pitchRad: number;
  yawDeg: number;
  pitchDeg: number;
}

function angles(yaw: number, pitch: number): AimAngles {
  return {
    yawRad: yaw,
    pitchRad: pitch,
    yawDeg: yaw * RAD_TO_DEG,
    pitchDeg: pitch * RAD_TO_DEG,
  };
}

function row(label: string, yaw: number, pitch: number, note?: string): string {
  const yawDeg = (yaw * RAD_TO_DEG).toFixed(1);
  const pitchDeg = (pitch * RAD_TO_DEG).toFixed(1);
  const suffix = note ? `  ${note}` : "";
  return `${label.padEnd(16)} yaw ${yawDeg.padStart(7)}°   pitch ${pitchDeg.padStart(7)}°${suffix}`;
}

export type DebugSessionPhase = "start" | "stream" | "end";

export interface AimDebugSnapshot {
  capturedAt: string;
  session: { seq: number; phase: DebugSessionPhase };
  formatted: string;
  player: {
    alive: boolean;
    position: { x: number; y: number; z: number };
  };
  aim: {
    mouseTarget: AimAngles;
    eyes: AimAngles;
    torso: AimAngles;
    head: AimAngles;
    arm: AimAngles & { note: string };
    armTargetPitchDeg: number;
    pitchLimitEyesDeg: number;
    crosshairOffset: AimAngles & { note: string };
    inputSpeedRadPerSec: number;
    yawSpeedRadPerSec: number;
    pitchSpeedRadPerSec: number;
    chaseRates: {
      head: number;
      torso: number;
      arm: number;
    };
    laggedShareTotals: {
      azimuth: number;
      elevation: number;
    };
  };
  config: {
    aimShare: typeof AIM_SHARE;
    aimLagShare: typeof AIM_LAG_SHARE;
    aimEyeRemainder: number;
    aimArmEyeRemainder: number;
    aimChase: typeof AIM_CHASE;
    maxPitchDeg: number;
  };
}

export function formatAimDebugHud(state: AimCascadeState, streamLine?: string): string {
  const delta = armAimDelta(state);
  const rates = aimChaseRates(state.smoothedInputSpeed);
  const armTarget = armPitchTarget(state.targetPitch);
  const lagTotals = laggedShareTotals();

  return [
    "Aim chain  (` toggle · C copy · streams debug/ while open)",
    row("Mouse target", state.targetYaw, state.targetPitch),
    row("Eyes / camera", state.targetYaw, state.targetPitch, "(instant)"),
    row("Head", state.headYaw, state.headPitch, "(lags eyes)"),
    row("Torso", state.torsoYaw, state.torsoPitch, "(lags head)"),
    row("Arm", state.torsoYaw, state.armPitch, "(yaw = torso)"),
    `Arm target pitch     ${(armTarget * RAD_TO_DEG).toFixed(1)}°`,
    `Pitch limit (eyes)   ${(MAX_PITCH * RAD_TO_DEG).toFixed(1)}°`,
    row("Crosshair offset", delta.yaw, delta.pitch, "(arm − eyes)"),
    `Input speed          ${state.smoothedInputSpeed.toFixed(1)} rad/s  (yaw ${state.smoothedYawSpeed.toFixed(1)} · pitch ${state.smoothedPitchSpeed.toFixed(1)})`,
    `Chase rates          head ${rates.head.toFixed(0)}   torso ${rates.torso.toFixed(0)}   arm ${rates.arm.toFixed(0)}`,
    `Lagged share totals  az ${lagTotals.azimuth.toFixed(2)}   el ${lagTotals.elevation.toFixed(2)}`,
    streamLine ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function captureAimDebugSnapshot(
  state: AimCascadeState = localPlayer,
  session: { seq: number; phase: DebugSessionPhase },
  streamLine?: string,
): AimDebugSnapshot {
  const delta = armAimDelta(state);
  const rates = aimChaseRates(state.smoothedInputSpeed);
  const armTarget = armPitchTarget(state.targetPitch);
  const formatted = formatAimDebugHud(state, streamLine);

  return {
    capturedAt: new Date().toISOString(),
    session,
    formatted,
    player: {
      alive: localPlayer.alive,
      position: { ...localPlayer.position },
    },
    aim: {
      mouseTarget: angles(state.targetYaw, state.targetPitch),
      eyes: angles(state.targetYaw, state.targetPitch),
      torso: angles(state.torsoYaw, state.torsoPitch),
      head: angles(state.headYaw, state.headPitch),
      arm: { ...angles(state.torsoYaw, state.armPitch), note: "yaw = torso" },
      armTargetPitchDeg: armTarget * RAD_TO_DEG,
      pitchLimitEyesDeg: MAX_PITCH * RAD_TO_DEG,
      crosshairOffset: { ...angles(delta.yaw, delta.pitch), note: "arm − eyes" },
      inputSpeedRadPerSec: state.smoothedInputSpeed,
      yawSpeedRadPerSec: state.smoothedYawSpeed,
      pitchSpeedRadPerSec: state.smoothedPitchSpeed,
      chaseRates: rates,
      laggedShareTotals: laggedShareTotals(),
    },
    config: {
      aimShare: AIM_SHARE,
      aimLagShare: AIM_LAG_SHARE,
      aimEyeRemainder: AIM_EYE_REMAINDER,
      aimArmEyeRemainder: AIM_ARM_EYE_REMAINDER,
      aimChase: AIM_CHASE,
      maxPitchDeg: MAX_PITCH * RAD_TO_DEG,
    },
  };
}