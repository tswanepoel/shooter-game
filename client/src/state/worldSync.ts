import { bus } from "../bus.ts";
import { HEALTH } from "../config/combat.ts";
import { resolveCharacterId } from "../config/characters.ts";
import { resolveWeaponSlot } from "../config/weapons.ts";
import type { JoinMessage, PlayerSnapshot, WelcomeMessage } from "../net/wire.ts";
import { snapCascadeToTarget } from "../sim/aimCascade.ts";
import { setActiveCharacterId } from "./character.ts";
import {
  getLifeLoadout,
  pickDefaultActiveSlot,
  setLifeLoadout,
  type Loadout,
} from "./loadout.ts";
import {
  localPlayer,
  remotePlayers,
  setLocalPlayerId,
  type RemotePlayerState,
} from "./world.ts";

function loadoutFromWelcome(message: {
  weaponId?: string;
  primaryWeaponId?: string | null;
  secondaryWeaponId?: string | null;
  activeSlot?: "primary" | "secondary";
}): { loadout: Loadout; activeSlot: "primary" | "secondary" } {
  const hasLoadoutPayload =
    message.primaryWeaponId !== undefined ||
    message.secondaryWeaponId !== undefined ||
    message.activeSlot !== undefined;

  if (hasLoadoutPayload) {
    const loadout: Loadout = {
      primary: resolveWeaponSlot(message.primaryWeaponId ?? message.weaponId),
      secondary: resolveWeaponSlot(message.secondaryWeaponId),
    };
    return {
      loadout,
      activeSlot: message.activeSlot ?? pickDefaultActiveSlot(loadout),
    };
  }

  const staged = getLifeLoadout();
  if (staged.primary !== null || staged.secondary !== null) {
    return { loadout: { ...staged }, activeSlot: pickDefaultActiveSlot(staged) };
  }

  const legacy: Loadout = {
    primary: resolveWeaponSlot(message.weaponId),
    secondary: null,
  };
  return { loadout: legacy, activeSlot: pickDefaultActiveSlot(legacy) };
}

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
    cascadeInitialized: false,
    alive: snapshot.alive,
    health: HEALTH.max,
    characterId: resolveCharacterId(snapshot.characterId),
    weaponId: resolveWeaponSlot(snapshot.weaponId) ?? "",
  };
  snapCascadeToTarget(remote);
  return remote;
}

function createRemotePlayerFromJoin(message: JoinMessage): RemotePlayerState {
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

export function initWorldSync(): void {
  bus.on("welcomed", (message: WelcomeMessage) => {
    setLocalPlayerId(message.id);
    localPlayer.id = message.id;
    setActiveCharacterId(resolveCharacterId(message.characterId));
    const { loadout, activeSlot } = loadoutFromWelcome(message);
    setLifeLoadout(loadout, activeSlot);
    bus.emit("loadoutCommitted", loadout);
    localPlayer.position.x = message.position.x;
    localPlayer.position.y = message.position.y;
    localPlayer.position.z = message.position.z;

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
    if (remote) remote.weaponId = resolveWeaponSlot(weaponId) ?? "";
  });
}