import * as THREE from "three";
import { bus } from "../bus.ts";
import { getCharacterRecipe } from "../config/characters.ts";
import type { CharacterRecipe } from "../config/characters.ts";
import { getWeaponRecipe, resolveWeaponSlot, type WeaponRecipe } from "../config/weapons.ts";
import type { PoseState } from "../modules/pose/index.ts";
import { RecoilModule, type RecoilPoseOffsets } from "../modules/recoil/index.ts";
import { getLocalPlayerId, localPlayer, remotePlayers } from "../state/world.ts";
import {
  classifyLocalLocomotion,
  classifyLocomotionFromSpeed,
  loadPlayerAvatar,
  type LocomotionState,
  type PlayerAvatar,
} from "./playerAvatar.ts";
import {
  createPlayerNameTag,
  disposePlayerNameTag,
  setPlayerNameTagText,
} from "./playerNameTags.ts";

export type { LocomotionState } from "./playerAvatar.ts";
export { classifyLocomotionFromSpeed } from "./playerAvatar.ts";

export interface PlayerSceneManager {
  loadLocal(character: CharacterRecipe, weapon: WeaponRecipe | null): Promise<void>;
  update(dt: number): void;
  applyCamera(camera: THREE.PerspectiveCamera): void;
  syncLocalAimPose(): void;
  syncRemoteAimPose(playerId: string): void;
  sampleEyeWorldPosition(playerId: string, out: THREE.Vector3): boolean;
  sampleLocalWeaponMuzzleLine(outOrigin: THREE.Vector3, outDirection: THREE.Vector3): boolean;
  sampleRemoteWeaponMuzzleLine(
    playerId: string,
    outOrigin: THREE.Vector3,
    outDirection: THREE.Vector3,
  ): boolean;
}

interface LoadedPlayer {
  avatar: PlayerAvatar;
  characterId: string;
  weaponId: string;
  nameTag: THREE.Sprite;
  displayName: string;
}

const hitRoots = new Map<string, THREE.Object3D>();

export function getCharacterHitRoots(): THREE.Object3D[] {
  return Array.from(hitRoots.values());
}

export function getAimOcclusionRoots(worldRoots: readonly THREE.Object3D[]): THREE.Object3D[] {
  return [...worldRoots, ...getCharacterHitRoots()];
}

function syncAvatar(
  avatar: PlayerAvatar,
  x: number,
  y: number,
  z: number,
  torsoYaw: number,
  alive: boolean,
  locomotion: LocomotionState,
  dt: number,
  aim?: PoseState,
  recoil?: RecoilPoseOffsets,
): void {
  avatar.root.position.set(x, y, z);
  avatar.root.rotation.y = torsoYaw + Math.PI;

  if (alive) {
    avatar.setLocomotion(locomotion);
    avatar.update(dt, aim, recoil);
    return;
  }

  avatar.updateDeath(dt);
}

export function createPlayerSceneManager(scene: THREE.Scene): PlayerSceneManager {
  const remotes = new Map<string, LoadedPlayer>();
  const pending = new Set<string>();
  const pendingRecipe = new Map<string, { characterId: string; weaponId: string }>();

  let localAvatar: PlayerAvatar | undefined;
  let localLoadGeneration = 0;

  bus.on("fireReceived", ({ id }) => {
    if (id === getLocalPlayerId()) {
      localAvatar?.triggerMuzzleFlash();
      return;
    }
    remotes.get(id)?.avatar.triggerMuzzleFlash();
  });

  bus.on("fired", () => {
    localAvatar?.triggerMuzzleFlash();
  });

  bus.on("feedbackReset", () => {
    localAvatar?.setLocomotion("idle");
  });

  function sampleEyeWorldPosition(playerId: string, out: THREE.Vector3): boolean {
    if (playerId === getLocalPlayerId() && localAvatar) {
      localAvatar.sampleEyeWorldPosition(out);
      return true;
    }
    const remote = remotes.get(playerId);
    if (!remote) return false;
    remote.avatar.sampleEyeWorldPosition(out);
    return true;
  }

  function sampleLocalWeaponMuzzleLine(
    outOrigin: THREE.Vector3,
    outDirection: THREE.Vector3,
  ): boolean {
    if (!localAvatar?.armed) return false;
    localAvatar.sampleWeaponMuzzleLine(outOrigin, outDirection);
    return true;
  }

  function sampleRemoteWeaponMuzzleLine(
    playerId: string,
    outOrigin: THREE.Vector3,
    outDirection: THREE.Vector3,
  ): boolean {
    const entry = remotes.get(playerId);
    if (!entry?.avatar.armed) return false;
    entry.avatar.sampleWeaponMuzzleLine(outOrigin, outDirection);
    return true;
  }

  function removeRemote(id: string): void {
    const entry = remotes.get(id);
    if (!entry) return;
    disposePlayerNameTag(entry.nameTag);
    scene.remove(entry.avatar.root);
    hitRoots.delete(id);
    remotes.delete(id);
  }

  function ensureRemote(id: string): void {
    const remote = remotePlayers.get(id);
    if (!remote) return;

    const entry = remotes.get(id);
    if (entry && entry.characterId === remote.characterId && entry.weaponId === remote.weaponId) {
      return;
    }

    const queued = pendingRecipe.get(id);
    if (
      pending.has(id) &&
      queued?.characterId === remote.characterId &&
      queued?.weaponId === remote.weaponId
    ) {
      return;
    }
    if (entry) removeRemote(id);

    pending.add(id);
    const character = getCharacterRecipe(remote.characterId);
    const weaponSlot = resolveWeaponSlot(remote.weaponId);
    const weapon = weaponSlot ? getWeaponRecipe(weaponSlot) : null;
    const weaponKey = weaponSlot ?? "";
    pendingRecipe.set(id, { characterId: character.id, weaponId: weaponKey });
    loadPlayerAvatar(character, weapon).then((avatar) => {
      pending.delete(id);
      pendingRecipe.delete(id);
      const current = remotePlayers.get(id);
      if (!current) return;
      if (current.characterId !== character.id || current.weaponId !== weaponKey) return;

      avatar.root.userData.playerId = id;
      const nameTag = createPlayerNameTag(current.displayName);
      avatar.root.add(nameTag);
      scene.add(avatar.root);
      hitRoots.set(id, avatar.root);
      remotes.set(id, {
        avatar,
        characterId: character.id,
        weaponId: weaponKey,
        nameTag,
        displayName: current.displayName,
      });
    });
  }

  async function loadLocal(character: CharacterRecipe, weapon: WeaponRecipe | null): Promise<void> {
    const generation = ++localLoadGeneration;
    const avatar = await loadPlayerAvatar(character, weapon);
    if (generation !== localLoadGeneration) {
      avatar.dispose();
      return;
    }

    const previous = localAvatar;
    localAvatar = avatar;
    const playerId = getLocalPlayerId();
    avatar.root.userData.playerId = playerId;
    scene.add(avatar.root);
    if (playerId) hitRoots.set(playerId, avatar.root);

    if (previous) {
      previous.root.parent?.remove(previous.root);
      previous.dispose();
    }
  }

  function updateLocal(dt: number): void {
    if (!localAvatar) return;

    localAvatar.weaponMesh.visible = localPlayer.alive && localAvatar.armed;
    const recoilPose = RecoilModule.getPoseOffsets(localPlayer.recoil);
    syncAvatar(
      localAvatar,
      localPlayer.x,
      localPlayer.y,
      localPlayer.z,
      localPlayer.torsoYaw,
      localPlayer.alive,
      classifyLocalLocomotion(localPlayer.sprinting, localPlayer.horizontalSpeed),
      dt,
      localPlayer,
      recoilPose,
    );
  }

  function syncLocalAimPose(): void {
    if (!localAvatar || !localPlayer.alive) return;
    localAvatar.syncAimPose(localPlayer, RecoilModule.getPoseOffsets(localPlayer.recoil));
  }

  function syncRemoteAimPose(playerId: string): void {
    const entry = remotes.get(playerId);
    const remote = remotePlayers.get(playerId);
    if (!entry || !remote?.alive) return;
    entry.avatar.syncAimPose(remote, RecoilModule.getPoseOffsets(remote.recoil));
  }

  function applyCamera(camera: THREE.PerspectiveCamera): void {
    if (!localAvatar) return;

    if (localPlayer.alive) {
      localAvatar.applyObserverCamera(camera);
      return;
    }

    localAvatar.applyDeathCamera(camera);
  }

  function update(dt: number): void {
    for (const id of remotePlayers.keys()) {
      ensureRemote(id);
    }

    for (const [id, entry] of remotes) {
      const remote = remotePlayers.get(id);
      if (!remote) {
        removeRemote(id);
        continue;
      }

      if (entry.characterId !== remote.characterId || entry.weaponId !== remote.weaponId) {
        ensureRemote(id);
        continue;
      }

      entry.avatar.weaponMesh.visible = remote.alive && entry.avatar.armed;
      entry.nameTag.visible = remote.alive;
      if (entry.displayName !== remote.displayName) {
        entry.nameTag = setPlayerNameTagText(entry.nameTag, remote.displayName);
        entry.displayName = remote.displayName;
      }
      syncAvatar(
        entry.avatar,
        remote.x,
        remote.y,
        remote.z,
        remote.torsoYaw,
        remote.alive,
        classifyLocomotionFromSpeed(remote.measuredSpeed),
        dt,
        remote,
        RecoilModule.getPoseOffsets(remote.recoil),
      );
    }

    updateLocal(dt);
  }

  return {
    loadLocal,
    update,
    applyCamera,
    syncLocalAimPose,
    syncRemoteAimPose,
    sampleEyeWorldPosition,
    sampleLocalWeaponMuzzleLine,
    sampleRemoteWeaponMuzzleLine,
  };
}