import { bus } from "../bus.ts";
import { HEALTH } from "../config/combat.ts";
import { resolveCharacterId } from "../config/characters.ts";
import { resolveWeaponSlot } from "../config/weapons.ts";
import type { JoinMessage, PlayerSnapshot, RoomJoinedMessage, WelcomeMessage } from "../net/wire.ts";
import { snapCascadeToTarget } from "../sim/aimCascade.ts";
import { createRecoilState, resetRecoil } from "../sim/recoilCascade.ts";
import { setActiveCharacterId } from "./character.ts";
import { setPlayerRole } from "./session.ts";
import { setLifeLoadout } from "./loadout.ts";
import {
  localPlayer,
  remotePlayers,
  setLocalPlayerId,
  type RemotePlayerState,
} from "./world.ts";

function createRemotePlayer(snapshot: PlayerSnapshot): RemotePlayerState {
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
    lastTargetYaw: snapshot.yaw,
    smoothedInputSpeed: 0,
    smoothedYawSpeed: 0,
    smoothedPitchSpeed: 0,
    torsoYaw: 0,
    torsoPitch: 0,
    headYaw: 0,
    headPitch: 0,
    shoulderPitch: 0,
    armPitch: 0,
    recoil: createRecoilState(snapshot.id),
    cascadeInitialized: false,
    alive: snapshot.alive,
    health: HEALTH.max,
    displayName: snapshot.displayName,
    characterId: resolveCharacterId(snapshot.characterId),
    weaponId: resolveWeaponSlot(snapshot.weaponId) ?? "",
  };
  snapCascadeToTarget(remote);
  return remote;
}

function createRemotePlayerFromJoin(message: JoinMessage): RemotePlayerState {
  return createRemotePlayer({
    id: message.id,
    displayName: message.displayName,
    position: message.position,
    yaw: message.yaw,
    pitch: message.pitch,
    alive: message.alive,
    characterId: message.characterId,
    weaponId: message.weaponId,
  });
}

export function initWorldSync(): void {
  bus.on("roomJoined", (message: RoomJoinedMessage) => {
    remotePlayers.clear();
    for (const snapshot of message.players ?? []) {
      remotePlayers.set(snapshot.id, createRemotePlayer(snapshot));
    }
  });

  bus.on("welcomed", (message: WelcomeMessage) => {
    setPlayerRole();
    setLocalPlayerId(message.id);
    localPlayer.id = message.id;
    setActiveCharacterId(resolveCharacterId(message.characterId));
    setLifeLoadout({ primary: null, secondary: null }, "primary");
    localPlayer.position.x = message.position.x;
    localPlayer.position.y = message.position.y;
    localPlayer.position.z = message.position.z;
    localPlayer.recoil.seedId = message.id;

    remotePlayers.clear();
    for (const snapshot of message.roster) {
      remotePlayers.set(snapshot.id, createRemotePlayer(snapshot));
    }
  });

  bus.on("playerJoined", (message: JoinMessage) => {
    remotePlayers.set(message.id, createRemotePlayerFromJoin(message));
  });

  bus.on("playerLeft", ({ id }) => {
    remotePlayers.delete(id);
  });

  bus.on("weaponReceived", ({ id, weaponId }) => {
    const remote = remotePlayers.get(id);
    if (!remote) return;
    remote.weaponId = resolveWeaponSlot(weaponId) ?? "";
    resetRecoil(remote.recoil);
  });
}