import { STAMINA } from "../config/physics.ts";
import type { AimCascadeState } from "../sim/aimCascade.ts";
import { createRecoilState, type RecoilCascadeState } from "../sim/recoilCascade.ts";
import type { Vec3 } from "../types/vec3.ts";

export interface LocalPlayerState extends AimCascadeState {
  recoil: RecoilCascadeState;
  id?: string;
  position: Vec3;
  health: number;
  alive: boolean;
  stamina: number;
  sprinting: boolean;
  horizontalSpeed: number;
  velocityY: number;
  grounded: boolean;
  airHorizontal: { x: number; z: number };
}

export const localPlayer: LocalPlayerState = {
  position: { x: 0, y: 0, z: 0 },
  health: 0,
  alive: true,
  targetYaw: 0,
  targetPitch: 0,
  lastTargetPitch: 0,
  lastTargetYaw: 0,
  smoothedInputSpeed: 0,
  smoothedYawSpeed: 0,
  smoothedPitchSpeed: 0,
  torsoYaw: 0,
  torsoPitch: 0,
  headYaw: 0,
  headPitch: 0,
  shoulderPitch: 0,
  armPitch: 0,
  recoil: createRecoilState(),
  stamina: STAMINA.max,
  sprinting: false,
  horizontalSpeed: 0,
  velocityY: 0,
  grounded: true,
  airHorizontal: { x: 0, z: 0 },
};

export interface Projectile {
  id: number;
  ownerId?: string;
  position: Vec3;
  previousPosition: Vec3;
  direction: Vec3;
  distanceTraveled: number;
}

export const projectiles: Projectile[] = [];

export interface RemotePlayerState extends AimCascadeState {
  recoil: RecoilCascadeState;
  id: string;
  position: Vec3;
  targetPosition: Vec3;
  timeSinceLastPos: number;
  measuredSpeed: number;
  velocityY: number;
  grounded: boolean;
  cascadeInitialized: boolean;
  alive: boolean;
  health: number;
  displayName: string;
  characterId: string;
  weaponId: string;
}

export const remotePlayers = new Map<string, RemotePlayerState>();

let localPlayerId: string | undefined;

export function getLocalPlayerId(): string | undefined {
  return localPlayerId;
}

export function setLocalPlayerId(id: string | undefined): void {
  localPlayerId = id;
}