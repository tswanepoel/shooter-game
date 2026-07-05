import { bus } from "../bus.ts";
import { resolveCharacterId, setCurrentCharacterId } from "../config/characters.ts";
import { resolveWeaponId, setCurrentWeaponId } from "../config/weapons.ts";
import { STAMINA } from "../config/physics.ts";
import type { AimCascadeState } from "../sim/aimCascade.ts";
import { snapCascadeToTarget } from "../sim/aimCascade.ts";

export interface LocalPlayerState extends AimCascadeState {
  position: { x: number; y: number; z: number };
  stamina: number;
  sprinting: boolean;
  velocityY: number;
  grounded: boolean;
  airHorizontal: { x: number; z: number };
}

export const localPlayer: LocalPlayerState = {
  position: { x: 0, y: 0, z: 0 },
  targetYaw: 0,
  targetPitch: 0,
  lastTargetPitch: 0,
  torsoYaw: 0,
  torsoPitch: 0,
  neckPitch: 0,
  eyePitch: 0,
  gunYaw: 0,
  gunPitch: 0,
  stamina: STAMINA.max,
  sprinting: false,
  velocityY: 0,
  grounded: true,
  airHorizontal: { x: 0, z: 0 },
};

export interface Projectile {
  id: number;
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  distanceTraveled: number;
}

export const projectiles: Projectile[] = [];

export interface RemotePlayerState extends AimCascadeState {
  id: string;
  position: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  timeSinceLastPos: number;
  measuredSpeed: number;
  velocityY: number;
  grounded: boolean;
  cascadeInitialized: boolean;
  alive: boolean;
  characterId: string;
  weaponId: string;
}

export const remotePlayers = new Map<string, RemotePlayerState>();
export let localPlayerId: string | undefined;

bus.on("welcomed", (message) => {
  localPlayerId = message.id;
  setCurrentCharacterId(resolveCharacterId(message.characterId));
  setCurrentWeaponId(resolveWeaponId(message.weaponId));
  localPlayer.position.x = message.position.x;
  localPlayer.position.y = message.position.y;
  localPlayer.position.z = message.position.z;

  remotePlayers.clear();
  for (const snapshot of message.roster) {
    remotePlayers.set(snapshot.id, createRemotePlayer(snapshot));
  }
});

bus.on("playerJoined", (message) => {
  remotePlayers.set(message.id, createRemotePlayerFromJoin(message));
});

bus.on("playerLeft", (message) => {
  remotePlayers.delete(message.id);
});

bus.on("weaponReceived", ({ id, weaponId }) => {
  const remote = remotePlayers.get(id);
  if (remote) remote.weaponId = resolveWeaponId(weaponId);
});

function createRemotePlayer(snapshot: {
  id: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  alive: boolean;
  characterId?: string;
  weaponId?: string;
}): RemotePlayerState {
  const remote: RemotePlayerState = {
    id: snapshot.id,
    position: { ...snapshot.position },
    targetPosition: { ...snapshot.position },
    timeSinceLastPos: 0,
    measuredSpeed: 0,
    velocityY: 0,
    grounded: true,
    targetYaw: snapshot.yaw,
    targetPitch: snapshot.pitch,
    lastTargetPitch: snapshot.pitch,
    torsoYaw: snapshot.yaw,
    torsoPitch: 0,
    neckPitch: 0,
    eyePitch: 0,
    gunYaw: snapshot.yaw,
    gunPitch: 0,
    cascadeInitialized: false,
    alive: snapshot.alive,
    characterId: resolveCharacterId(snapshot.characterId),
    weaponId: resolveWeaponId(snapshot.weaponId),
  };
  snapCascadeToTarget(remote);
  return remote;
}

function createRemotePlayerFromJoin(message: {
  id: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  alive: boolean;
  characterId?: string;
  weaponId?: string;
}): RemotePlayerState {
  return createRemotePlayer({
    id: message.id,
    position: message.position,
    yaw: message.yaw,
    pitch: message.pitch,
    alive: message.alive,
    characterId: message.characterId,
    weaponId: message.weaponId,
  });
}