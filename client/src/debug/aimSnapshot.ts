import { AIM_PITCH, AIM_YAW, weaponPitchTarget } from "../config/aim.ts";
import { MAX_PITCH } from "../config/physics.ts";
import {
  armAimDelta,
  laggedShareTotals,
  pitchChaseRates,
  yawChaseRates,
  type AimCascadeState,
} from "../sim/aimCascade.ts";
import { consumeInputRateWindow } from "./inputRates.ts";
import { localPlayer } from "../state/world.ts";

const RAD_TO_DEG = 180 / Math.PI;

export interface AimAngles {
  yawRad: number;
  pitchRad: number;
  yawDeg: number;
  pitchDeg: number;
}

export interface AimDebugSession {
  id: string;
  seq: number;
  phase: DebugSessionPhase;
}

export type DebugSessionPhase = "start" | "stream" | "end";

/** Lean per-frame line for record.jsonl — grep/jq friendly, no repeated config. */
export interface AimDebugStreamFrame {
  capturedAt: string;
  session: AimDebugSession;
  targetYawDeg: number;
  targetPitchDeg: number;
  offsetYawDeg: number;
  offsetPitchDeg: number;
  torsoYawDeg: number;
  headYawDeg: number;
  shoulderPitchDeg: number;
  armPitchDeg: number;
  inputSpeedRadPerSec: number;
  yawSpeedRadPerSec: number;
  pitchSpeedRadPerSec: number;
  chaseYawHead: number;
  chaseYawTorso: number;
  chasePitchHead: number;
  chasePitchTorso: number;
  chasePitchShoulder: number;
  /** pointermove handler invocations since the previous stream frame */
  pointerEvents: number;
  /** sum(getCoalescedEvents().length) over those deliveries */
  coalescedSamples: number;
  /** tick() calls since the previous stream frame */
  simTicks: number;
  /** game-loop rAF iterations since the previous stream frame */
  renderFrames: number;
}

/** Full context once per recording (phase start). */
export interface AimDebugSessionStart {
  capturedAt: string;
  session: AimDebugSession;
  formatted: string;
  player: {
    alive: boolean;
    position: { x: number; y: number; z: number };
  };
  aim: {
    mouseTarget: AimAngles;
    eyes: AimAngles;
    torso: AimAngles;
    head: AimAngles & { note: string };
    shoulder: AimAngles & { note: string };
    weapon: AimAngles & { note: string };
    weaponTargetPitchDeg: number;
    pitchLimitEyesDeg: number;
    crosshairOffset: AimAngles & { note: string };
    inputSpeedRadPerSec: number;
    yawSpeedRadPerSec: number;
    pitchSpeedRadPerSec: number;
    yawChaseRates: ReturnType<typeof yawChaseRates>;
    pitchChaseRates: ReturnType<typeof pitchChaseRates>;
    laggedShareTotals: ReturnType<typeof laggedShareTotals>;
  };
  config: {
    aimYaw: typeof AIM_YAW;
    aimPitch: typeof AIM_PITCH;
    maxPitchDeg: number;
  };
}

export type AimDebugSnapshot = AimDebugSessionStart | AimDebugStreamFrame;

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

export function formatAimDebugHud(state: AimCascadeState, streamLine?: string): string {
  const delta = armAimDelta(state);
  const yawRates = yawChaseRates(state.smoothedYawSpeed);
  const pitchRates = pitchChaseRates(state.smoothedPitchSpeed);
  const weaponTarget = weaponPitchTarget(state.targetPitch);
  const lagTotals = laggedShareTotals();

  return [
    "Aim chain  (` show/hide · hold . record · C copy)",
    row("Mouse target", state.targetYaw, state.targetPitch),
    row("Eyes / camera", state.targetYaw, state.targetPitch, "(instant)"),
    row("Head", state.headYaw, state.headPitch, "(3P cosmetic)"),
    row("Torso", state.torsoYaw, state.torsoPitch),
    row("Shoulder", state.torsoYaw, state.shoulderPitch, "(weapon pitch)"),
    row("Weapon", state.torsoYaw, state.armPitch, "(torso + shoulder)"),
    `Weapon target pitch ${(weaponTarget * RAD_TO_DEG).toFixed(1)}°`,
    `Pitch limit (eyes)   ${(MAX_PITCH * RAD_TO_DEG).toFixed(1)}°`,
    row("Crosshair offset", delta.yaw, delta.pitch, "(weapon − eyes)"),
    `Input speed          ${state.smoothedInputSpeed.toFixed(1)} rad/s  (yaw ${state.smoothedYawSpeed.toFixed(1)} · pitch ${state.smoothedPitchSpeed.toFixed(1)})`,
    `Yaw chase            head ${yawRates.headCosmetic.toFixed(0)}   torso ${yawRates.torso.toFixed(0)}`,
    `Pitch chase          head ${pitchRates.headCosmetic.toFixed(0)}   torso ${pitchRates.torso.toFixed(0)}   shoulder ${pitchRates.shoulder.toFixed(0)}`,
    `Lagged share totals  yaw ${lagTotals.yaw.toFixed(2)}   pitch ${lagTotals.pitch.toFixed(2)}`,
    streamLine ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

function captureStreamFrame(state: AimCascadeState, session: AimDebugSession): AimDebugStreamFrame {
  const delta = armAimDelta(state);
  const yawRates = yawChaseRates(state.smoothedYawSpeed);
  const pitchRates = pitchChaseRates(state.smoothedPitchSpeed);
  const inputRates = consumeInputRateWindow();

  return {
    capturedAt: new Date().toISOString(),
    session,
    targetYawDeg: state.targetYaw * RAD_TO_DEG,
    targetPitchDeg: state.targetPitch * RAD_TO_DEG,
    offsetYawDeg: delta.yaw * RAD_TO_DEG,
    offsetPitchDeg: delta.pitch * RAD_TO_DEG,
    torsoYawDeg: state.torsoYaw * RAD_TO_DEG,
    headYawDeg: state.headYaw * RAD_TO_DEG,
    shoulderPitchDeg: state.shoulderPitch * RAD_TO_DEG,
    armPitchDeg: state.armPitch * RAD_TO_DEG,
    inputSpeedRadPerSec: state.smoothedInputSpeed,
    yawSpeedRadPerSec: state.smoothedYawSpeed,
    pitchSpeedRadPerSec: state.smoothedPitchSpeed,
    chaseYawHead: yawRates.headCosmetic,
    chaseYawTorso: yawRates.torso,
    chasePitchHead: pitchRates.headCosmetic,
    chasePitchTorso: pitchRates.torso,
    chasePitchShoulder: pitchRates.shoulder,
    pointerEvents: inputRates.pointerEvents,
    coalescedSamples: inputRates.coalescedSamples,
    simTicks: inputRates.simTicks,
    renderFrames: inputRates.renderFrames,
  };
}

function captureSessionStart(
  state: AimCascadeState,
  session: AimDebugSession,
  streamLine?: string,
): AimDebugSessionStart {
  const delta = armAimDelta(state);
  const yawRates = yawChaseRates(state.smoothedYawSpeed);
  const pitchRates = pitchChaseRates(state.smoothedPitchSpeed);
  const weaponTarget = weaponPitchTarget(state.targetPitch);
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
      head: { ...angles(state.headYaw, state.headPitch), note: "3P cosmetic" },
      shoulder: { ...angles(state.torsoYaw, state.shoulderPitch), note: "weapon pitch" },
      weapon: { ...angles(state.torsoYaw, state.armPitch), note: "torso + shoulder" },
      weaponTargetPitchDeg: weaponTarget * RAD_TO_DEG,
      pitchLimitEyesDeg: MAX_PITCH * RAD_TO_DEG,
      crosshairOffset: { ...angles(delta.yaw, delta.pitch), note: "weapon − eyes" },
      inputSpeedRadPerSec: state.smoothedInputSpeed,
      yawSpeedRadPerSec: state.smoothedYawSpeed,
      pitchSpeedRadPerSec: state.smoothedPitchSpeed,
      yawChaseRates: yawRates,
      pitchChaseRates: pitchRates,
      laggedShareTotals: laggedShareTotals(),
    },
    config: {
      aimYaw: AIM_YAW,
      aimPitch: AIM_PITCH,
      maxPitchDeg: MAX_PITCH * RAD_TO_DEG,
    },
  };
}

export function captureAimDebugSnapshot(
  state: AimCascadeState = localPlayer,
  session: AimDebugSession,
  streamLine?: string,
): AimDebugSnapshot {
  if (session.phase === "start") {
    return captureSessionStart(state, session, streamLine);
  }
  return captureStreamFrame(state, session);
}

export function snapshotFormatted(snapshot: AimDebugSnapshot): string | undefined {
  return "formatted" in snapshot ? snapshot.formatted : undefined;
}