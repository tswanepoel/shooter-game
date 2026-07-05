import { CAMERA_FEEDBACK } from "../config/feedback.ts";
import { localPlayer } from "../state/world.ts";

export interface CameraEffectOffsets {
  pitch: number;
  yaw: number;
  bobY: number;
}

let swayPhase = 0;
let bobPhase = 0;
let flinchIntensity = 0;
let flinchPitch = 0;
let flinchYaw = 0;

export function resetCameraEffects(): void {
  swayPhase = 0;
  bobPhase = 0;
  flinchIntensity = 0;
  flinchPitch = 0;
  flinchYaw = 0;
}

export function triggerFlinch(damageBearing?: number): void {
  const { flinch } = CAMERA_FEEDBACK;
  flinchIntensity = Math.min(
    flinch.maxIntensity,
    flinchIntensity + flinch.stackPerHit,
  );
  if (damageBearing !== undefined) {
    flinchYaw = Math.sin(damageBearing) * flinch.kickIntensity * 1.6;
    flinchPitch =
      (Math.random() * 0.3 - 0.15) * flinch.kickIntensity +
      Math.cos(damageBearing) * flinch.kickIntensity * 0.22;
  } else {
    flinchPitch = (Math.random() * 2 - 1) * flinch.kickIntensity;
    flinchYaw = (Math.random() * 2 - 1) * flinch.kickIntensity;
  }
}

export function tickCameraEffects(dt: number): CameraEffectOffsets {
  if (!localPlayer.alive) {
    return { pitch: 0, yaw: 0, bobY: 0 };
  }

  const { sway, bob, flinch } = CAMERA_FEEDBACK;

  swayPhase += dt;
  const swayYaw =
    Math.sin(swayPhase * sway.freqA * Math.PI * 2) * sway.yawAmplitude +
    Math.sin(swayPhase * sway.freqB * Math.PI * 2 + 1.2) * sway.yawAmplitude * 0.6;
  const swayPitch =
    Math.sin(swayPhase * sway.freqB * Math.PI * 2) * sway.pitchAmplitude +
    Math.sin(swayPhase * sway.freqA * Math.PI * 2 + 0.8) * sway.pitchAmplitude * 0.5;

  const sprinting = localPlayer.sprinting;
  const speed = localPlayer.horizontalSpeed;
  const moving = localPlayer.grounded && speed > bob.moveThreshold;
  const bobScale = sprinting ? bob.sprintMultiplier : 1;

  if (moving) {
    bobPhase += dt * speed * bob.phasePerMeter * bobScale;
  }

  const bobY = moving ? Math.sin(bobPhase) * bob.heightAmplitude * bobScale : 0;
  const bobPitch = moving
    ? Math.sin(bobPhase * 2) * bob.pitchAmplitude * bobScale
    : 0;

  flinchIntensity *= Math.exp(-flinch.decayRate * dt);
  const flinchScale = flinchIntensity;
  const flinchPitchOffset = flinchPitch * flinchScale;
  const flinchYawOffset = flinchYaw * flinchScale;

  return {
    pitch: swayPitch + bobPitch + flinchPitchOffset,
    yaw: swayYaw + flinchYawOffset,
    bobY,
  };
}