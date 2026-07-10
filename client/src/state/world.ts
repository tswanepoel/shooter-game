import { staminaMax } from "../modules/sprint/index.ts";
import type { PoseState } from "../modules/pose/index.ts";
import { createInitialState as createRecoilState, type RecoilState } from "../modules/recoil/index.ts";
import {
  createInitialState as createLoadoutState,
  type LoadoutState,
  type WeaponSlotId,
} from "../modules/loadout/index.ts";
import {
  WeaponSwapModule,
  createInitialState as createWeaponSwapState,
  type WeaponSwapState,
  type ActiveSlot,
} from "../modules/weapon-swap/index.ts";
import { tryGetWeaponRecipe, type WeaponRecipe } from "../config/weapons.ts";
import type { Vec3 } from "../types/vec3.ts";

export interface LocalPlayerState extends PoseState {
  recoil: RecoilState;
  loadout: LoadoutState;
  weaponSwap: WeaponSwapState;
  id?: string;
  x: number;
  y: number;
  z: number;
  health: number;
  alive: boolean;
  stamina: number;
  sprinting: boolean;
  cooldown: number;
  velocityX: number;
  velocityZ: number;
  horizontalSpeed: number;
  velocityY: number;
  grounded: boolean;
  eagerBuffer: {
    jumpRequested: boolean;
  };
  airHorizontalX: number;
  airHorizontalZ: number;
  airCarryBuffer: {
    jumpRequested: boolean;
    pendingCarryX: number;
    pendingCarryZ: number;
  };
}

export const localPlayer: LocalPlayerState = {
  x: 0,
  y: 0,
  z: 0,
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
  loadout: createLoadoutState(),
  weaponSwap: createWeaponSwapState(),
  stamina: staminaMax,
  sprinting: false,
  cooldown: 0,
  velocityX: 0,
  velocityZ: 0,
  horizontalSpeed: 0,
  velocityY: 0,
  grounded: true,
  eagerBuffer: {
    jumpRequested: false,
  },
  airHorizontalX: 0,
  airHorizontalZ: 0,
  airCarryBuffer: {
    jumpRequested: false,
    pendingCarryX: 0,
    pendingCarryZ: 0,
  },
};

export interface RemotePlayerState extends PoseState {
  recoil: RecoilState;
  id: string;
  x: number;
  y: number;
  z: number;
  targetPosition: Vec3;
  timeSinceLastPos: number;
  measuredSpeed: number;
  velocityY: number;
  grounded: boolean;
  eagerBuffer: {
    jumpRequested: boolean;
  };
  airHorizontalX: number;
  airHorizontalZ: number;
  airCarryBuffer: {
    jumpRequested: boolean;
    pendingCarryX: number;
    pendingCarryZ: number;
  };
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

export function getActiveSlot(): ActiveSlot {
  return localPlayer.weaponSwap.activeSlot;
}

export function getActiveWeaponId(): WeaponSlotId {
  return WeaponSwapModule.resolveSlotWeapon(localPlayer.loadout, localPlayer.weaponSwap.activeSlot);
}

export function getActiveWeapon(): WeaponRecipe | undefined {
  return tryGetWeaponRecipe(getActiveWeaponId());
}

export function setLocalPlayerId(id: string | undefined): void {
  localPlayerId = id;
}