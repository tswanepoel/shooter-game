import { bus } from "../bus.ts";
import { maxHealth } from "../modules/health/index.ts";
import { ElevationModule } from "../modules/elevation/index.ts";
import { LateralPositionModule } from "../modules/lateral-position/index.ts";
import { resolveCharacterId } from "../config/characters.ts";
import { resolveWeaponSlot } from "../config/weapons.ts";
import type { JoinMessage, PlayerSnapshot, RoomJoinedMessage, WelcomeMessage } from "../net/wire.ts";
import { PoseModule } from "../modules/pose/index.ts";
import { RecoilModule, createInitialState as createRecoilState } from "../modules/recoil/index.ts";
import { LoadoutModule } from "../modules/loadout/index.ts";
import { LoadoutIntentModule } from "../modules/loadout-intent/index.ts";
import { loadoutIntentState } from "../input/loadoutMenu.ts";
import { WeaponSwapModule } from "../modules/weapon-swap/index.ts";
import { setActiveCharacterId } from "./character.ts";
import { setPlayerRole } from "./session.ts";
import {
  localPlayer,
  remotePlayers,
  setLocalPlayerId,
  type RemotePlayerState,
} from "./world.ts";

function createRemotePlayer(snapshot: PlayerSnapshot): RemotePlayerState {
  const remote: RemotePlayerState = {
    id: snapshot.id,
    x: snapshot.position.x,
    y: snapshot.position.y,
    z: snapshot.position.z,
    targetPosition: { ...snapshot.position },
    timeSinceLastPos: 0,
    measuredSpeed: 0,
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
    health: maxHealth,
    displayName: snapshot.displayName,
    characterId: resolveCharacterId(snapshot.characterId),
    weaponId: resolveWeaponSlot(snapshot.weaponId) ?? "",
  };
  PoseModule.snapToTarget(remote);
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
    LoadoutModule.set(localPlayer.loadout, { primary: null, secondary: null });
    LoadoutIntentModule.setPending(loadoutIntentState, { primary: null, secondary: null });
    WeaponSwapModule.setActiveSlot(localPlayer.weaponSwap, "primary");
    ElevationModule.projectRespawn(localPlayer, message.position.y);
    LateralPositionModule.projectRespawn(localPlayer, message.position.x, message.position.z);
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
    RecoilModule.reset(remote.recoil);
  });
}