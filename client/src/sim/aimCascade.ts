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

export interface AimCascadeState {
  headYaw: number;
  headPitch: number;
  gunYaw: number;
  gunPitch: number;
  torsoYaw: number;
  torsoPitch: number;
}

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

// Shared by the local player and every remote player, so all clients run the
// identical cascade from whatever head orientation they're fed.
export function tickCascade(state: AimCascadeState, dt: number): void {
  const yawRate = gunChaseRate(state.headYaw - state.gunYaw);
  const pitchRate = gunPitchChaseRate(state.headPitch - state.gunPitch);

  state.gunYaw = chase(state.gunYaw, state.headYaw, yawRate, dt);
  state.gunPitch = chase(state.gunPitch, state.headPitch, pitchRate, dt);
  state.torsoYaw = chase(state.torsoYaw, state.headYaw, TORSO_CHASE_RATE, dt);
  state.torsoPitch = chase(state.torsoPitch, state.headPitch, TORSO_CHASE_RATE, dt);
}

export function tickAimCascade(dt: number): void {
  tickCascade(localPlayer, dt);
}
