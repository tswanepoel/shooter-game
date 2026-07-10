import * as THREE from "three";
import { bus } from "../bus.ts";
import { tryGetWeaponRecipe } from "../config/weapons.ts";
import { sendHit } from "../net/connection.ts";
import { getActiveWeapon, getLocalPlayerId, localPlayer, remotePlayers } from "../state/world.ts";
import type { Vec3 } from "../types/vec3.ts";
import { RecoilModule } from "../modules/recoil/index.ts";
import { weaponFireIntentState } from "../main.ts";
import { WeaponFireModule } from "../modules/weapon-fire/index.ts";
import type { AimState } from "../modules/aim/index.ts";
import { BallisticsModule, createInitialState as createBallisticsState } from "../modules/ballistics/index.ts";

export const ballisticsState = createBallisticsState();

let controlEngaged = false;
let syncRemoteAimPoseBeforeFire: ((playerId: string) => void) | undefined;
let sampleRemoteWeaponMuzzleLine:
  | ((playerId: string, outOrigin: THREE.Vector3, outDirection: THREE.Vector3) => boolean)
  | undefined;

const fireOrigin = new THREE.Vector3();
const fireDirection = new THREE.Vector3();

let samplePlayerEyeWorldPosition:
  | ((playerId: string, out: THREE.Vector3) => boolean)
  | undefined;

export function bindRemoteProjectileAimSync(
  syncRemoteAimPose: (playerId: string) => void,
  sampleMuzzleLine: (playerId: string, outOrigin: THREE.Vector3, outDirection: THREE.Vector3) => boolean,
): void {
  syncRemoteAimPoseBeforeFire = syncRemoteAimPose;
  sampleRemoteWeaponMuzzleLine = sampleMuzzleLine;
}

export function isFireActive(): boolean {
  return weaponFireIntentState.fire && controlEngaged && localPlayer.alive;
}

export function bindProjectileEyeSampler(
  sampler: (playerId: string, out: THREE.Vector3) => boolean,
): void {
  samplePlayerEyeWorldPosition = sampler;
}

function directionFromYawPitch(yaw: number, pitch: number): Vec3 {
  return {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
}

export function initProjectiles(): void {
  bus.on("controlEngaged", () => {
    controlEngaged = true;
  });
  bus.on("controlReleased", () => {
    controlEngaged = false;
  });

  bus.on("fireReceived", ({ id }) => {
    // Cosmetic only: the remote's own client owns hit authority for its shots.
    const remote = remotePlayers.get(id);
    if (!remote?.alive || !remote.weaponId) return;

    const weapon = tryGetWeaponRecipe(remote.weaponId);
    if (!weapon) return;
    RecoilModule.projectInternalImpulse(remote.recoil, weapon.id);
    syncRemoteAimPoseBeforeFire?.(id);

    if (sampleRemoteWeaponMuzzleLine?.(id, fireOrigin, fireDirection)) {
      BallisticsModule.spawnProjectile(
        ballisticsState,
        { x: fireOrigin.x, y: fireOrigin.y, z: fireOrigin.z },
        { x: fireDirection.x, y: fireDirection.y, z: fireDirection.z },
        id,
      );
      return;
    }

    if (!samplePlayerEyeWorldPosition?.(id, fireOrigin)) return;
    BallisticsModule.spawnProjectile(
      ballisticsState,
      { x: fireOrigin.x, y: fireOrigin.y, z: fireOrigin.z },
      directionFromYawPitch(remote.torsoYaw, remote.armPitch),
      id,
    );
  });
}

export function tickProjectileFire(dt: number, aimState: AimState): void {
  const weapon = getActiveWeapon();
  if (!weapon) return;

  const didFire = WeaponFireModule.tick(
    localPlayer,
    weaponFireIntentState.fire,
    localPlayer.alive,
    controlEngaged,
    weapon.id,
    dt,
  );

  if (didFire) {
    RecoilModule.projectInternalImpulse(localPlayer.recoil, weapon.id);
    BallisticsModule.spawnProjectile(ballisticsState, aimState.origin, aimState.direction, getLocalPlayerId());
    bus.emit("fired", undefined);
  }
}

export function advanceProjectiles(dt: number, hitRoots: THREE.Object3D[]): void {
  const weapon = getActiveWeapon();
  if (!weapon) return;

  const hits = BallisticsModule.tick(
    ballisticsState,
    weapon.id,
    dt,
    hitRoots,
    getLocalPlayerId(),
    (playerId) => remotePlayers.get(playerId)?.alive === true,
  );

  for (const hit of hits) {
    if (hit.kind === "player" && hit.ownerId === getLocalPlayerId() && hit.playerId && hit.bodyPart) {
      sendHit(hit.playerId, hit.bodyPart, hit.speed);
      bus.emit("hitConfirmed", undefined);
    }
  }
}
