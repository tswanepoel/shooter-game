import {
  GUN_CHASE_RATE_FAST,
  GUN_CHASE_RATE_SLOW,
  GUN_LAG_THRESHOLD_HIGH,
  GUN_LAG_THRESHOLD_LOW,
  GUN_PITCH_DOWN_RATE_SCALE,
  GUN_PITCH_UP_RATE_SCALE,
  TORSO_CHASE_RATE,
} from "../config/weapons.ts";
import { localPlayer } from "../state/world.ts";

function chase(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function gunChaseRate(gap: number): number {
  const t = smoothstep(Math.abs(gap), GUN_LAG_THRESHOLD_LOW, GUN_LAG_THRESHOLD_HIGH);
  return GUN_CHASE_RATE_FAST + (GUN_CHASE_RATE_SLOW - GUN_CHASE_RATE_FAST) * t;
}

function gunPitchChaseRate(gap: number): number {
  // gap > 0 means the gun still has to rise (head pitched up ahead of it).
  const directionScale = gap > 0 ? GUN_PITCH_UP_RATE_SCALE : GUN_PITCH_DOWN_RATE_SCALE;
  return gunChaseRate(gap) * directionScale;
}

export function tickAimCascade(dt: number): void {
  const yawRate = gunChaseRate(localPlayer.headYaw - localPlayer.gunYaw);
  const pitchRate = gunPitchChaseRate(localPlayer.headPitch - localPlayer.gunPitch);

  localPlayer.gunYaw = chase(localPlayer.gunYaw, localPlayer.headYaw, yawRate, dt);
  localPlayer.gunPitch = chase(localPlayer.gunPitch, localPlayer.headPitch, pitchRate, dt);
  localPlayer.torsoYaw = chase(localPlayer.torsoYaw, localPlayer.headYaw, TORSO_CHASE_RATE, dt);
  localPlayer.torsoPitch = chase(localPlayer.torsoPitch, localPlayer.headPitch, TORSO_CHASE_RATE, dt);
}
