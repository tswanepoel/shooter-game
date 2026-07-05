import { bus } from "../bus.ts";
import { STAMINA } from "../config/physics.ts";

export interface LocalPlayerState {
  position: { x: number; y: number; z: number };
  headYaw: number;
  headPitch: number;
  gunYaw: number;
  gunPitch: number;
  torsoYaw: number;
  torsoPitch: number;
  stamina: number;
  sprinting: boolean;
  velocityY: number;
  grounded: boolean;
  airHorizontal: { x: number; z: number };
}

export const localPlayer: LocalPlayerState = {
  position: { x: 0, y: 0, z: 0 },
  headYaw: 0,
  headPitch: 0,
  gunYaw: 0,
  gunPitch: 0,
  torsoYaw: 0,
  torsoPitch: 0,
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

export interface RemotePlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  timeSinceLastPos: number;
  measuredSpeed: number;
  headYaw: number;
  headPitch: number;
  gunYaw: number;
  gunPitch: number;
  torsoYaw: number;
  torsoPitch: number;
  cascadeInitialized: boolean;
  alive: boolean;
}

export const remotePlayers = new Map<string, RemotePlayerState>();
export let localPlayerId: string | undefined;

bus.on("welcomed", (message) => {
  localPlayerId = message.id;
  localPlayer.position.x = message.position.x;
  localPlayer.position.y = message.position.y;
  localPlayer.position.z = message.position.z;

  remotePlayers.clear();
  for (const snapshot of message.roster) {
    remotePlayers.set(snapshot.id, createRemotePlayer(snapshot.id, snapshot.position, snapshot.yaw, snapshot.pitch, snapshot.alive));
  }
});

bus.on("playerJoined", (message) => {
  remotePlayers.set(message.id, createRemotePlayer(message.id, message.position, message.yaw, message.pitch, message.alive));
});

bus.on("playerLeft", (message) => {
  remotePlayers.delete(message.id);
});

function createRemotePlayer(
  id: string,
  position: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
  alive: boolean,
): RemotePlayerState {
  return {
    id,
    position: { ...position },
    targetPosition: { ...position },
    timeSinceLastPos: 0,
    measuredSpeed: 0,
    headYaw: yaw,
    headPitch: pitch,
    gunYaw: yaw,
    gunPitch: pitch,
    torsoYaw: yaw,
    torsoPitch: pitch,
    cascadeInitialized: false,
    alive,
  };
}
