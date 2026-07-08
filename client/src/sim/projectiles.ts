import * as THREE from "three";
import { bus } from "../bus.ts";
import { tryGetWeaponRecipe } from "../config/weapons.ts";
import { getActiveWeapon } from "../state/loadout.ts";
import { sendHit } from "../net/connection.ts";
import { getLocalPlayerId, localPlayer, projectiles, remotePlayers } from "../state/world.ts";
import type { Vec3 } from "../types/vec3.ts";
import { applyRecoilImpulse } from "./recoilCascade.ts";
import { computeAimRay } from "./aimDirection.ts";

let fireHeld = false;
let controlEngaged = false;
let syncAimPoseBeforeFire: (() => void) | undefined;
let syncRemoteAimPoseBeforeFire: ((playerId: string) => void) | undefined;
let sampleRemoteWeaponMuzzleLine:
  | ((playerId: string, outOrigin: THREE.Vector3, outDirection: THREE.Vector3) => boolean)
  | undefined;
let cooldown = 0;
let nextId = 1;

const raycaster = new THREE.Raycaster();
const rayDirection = new THREE.Vector3();
const rayOrigin = new THREE.Vector3();
const fireOrigin = new THREE.Vector3();
const fireDirection = new THREE.Vector3();

let samplePlayerEyeWorldPosition:
  | ((playerId: string, out: THREE.Vector3) => boolean)
  | undefined;

export function bindProjectileAimPoseSync(sync: () => void): void {
  syncAimPoseBeforeFire = sync;
}

export function bindRemoteProjectileAimSync(
  syncRemoteAimPose: (playerId: string) => void,
  sampleMuzzleLine: (playerId: string, outOrigin: THREE.Vector3, outDirection: THREE.Vector3) => boolean,
): void {
  syncRemoteAimPoseBeforeFire = syncRemoteAimPose;
  sampleRemoteWeaponMuzzleLine = sampleMuzzleLine;
}

export function isFireActive(): boolean {
  return fireHeld && controlEngaged && localPlayer.alive;
}

export function bindProjectileEyeSampler(
  sampler: (playerId: string, out: THREE.Vector3) => boolean,
): void {
  samplePlayerEyeWorldPosition = sampler;
}

export function initProjectiles(): void {
  bus.on("fireStarted", () => {
    fireHeld = true;
  });
  bus.on("fireStopped", () => {
    fireHeld = false;
  });
  bus.on("controlEngaged", () => {
    controlEngaged = true;
  });
  bus.on("controlReleased", () => {
    controlEngaged = false;
    fireHeld = false;
  });

  bus.on("fireReceived", ({ id }) => {
    // Cosmetic only: the remote's own client owns hit authority for its shots.
    const remote = remotePlayers.get(id);
    if (!remote?.alive || !remote.weaponId) return;

    const weapon = tryGetWeaponRecipe(remote.weaponId);
    if (!weapon) return;
    applyRecoilImpulse(remote.recoil, weapon);
    syncRemoteAimPoseBeforeFire?.(id);

    if (sampleRemoteWeaponMuzzleLine?.(id, fireOrigin, fireDirection)) {
      spawnProjectile(
        { x: fireOrigin.x, y: fireOrigin.y, z: fireOrigin.z },
        fireDirection,
        id,
      );
      return;
    }

    if (!samplePlayerEyeWorldPosition?.(id, fireOrigin)) return;
    spawnProjectile(
      { x: fireOrigin.x, y: fireOrigin.y, z: fireOrigin.z },
      { yaw: remote.torsoYaw, pitch: remote.armPitch },
      id,
    );
  });
}

export function tickProjectileFire(dt: number, camera: THREE.Camera): void {
  const weapon = getActiveWeapon();
  if (!weapon) return;

  const fireInterval = 1 / weapon.fireRate;

  cooldown = Math.max(0, cooldown - dt);

  if (fireHeld && controlEngaged && localPlayer.alive && cooldown <= 0) {
    applyRecoilImpulse(localPlayer.recoil, weapon);
    syncAimPoseBeforeFire?.();
    computeAimRay(fireOrigin, fireDirection, camera);
    spawnProjectile(
      {
        x: fireOrigin.x,
        y: fireOrigin.y,
        z: fireOrigin.z,
      },
      fireDirection,
    );
    cooldown += fireInterval;
    bus.emit("fired", undefined);
  }
}

export function advanceProjectiles(dt: number, hitRoots: THREE.Object3D[]): void {
  const weapon = getActiveWeapon();
  if (!weapon) return;

  const step = weapon.projectileSpeed * dt;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    const previous = projectile.previousPosition;

    projectile.position.x += projectile.direction.x * step;
    projectile.position.y += projectile.direction.y * step;
    projectile.position.z += projectile.direction.z * step;
    projectile.distanceTraveled += step;

    if (hitRoots.length > 0) {
      const hit = sweepHit(previous, projectile.position, hitRoots);
      if (hit) {
        if (hit.kind === "player" && projectile.ownerId === getLocalPlayerId()) {
          sendHit(hit.playerId);
          bus.emit("hitConfirmed", undefined);
        }
        projectiles.splice(i, 1);
        continue;
      }
    }

    projectile.previousPosition.x = projectile.position.x;
    projectile.previousPosition.y = projectile.position.y;
    projectile.previousPosition.z = projectile.position.z;

    if (projectile.distanceTraveled >= weapon.projectileMaxRange) {
      projectiles.splice(i, 1);
    }
  }
}

function spawnProjectile(
  origin: Vec3,
  direction: THREE.Vector3 | { yaw: number; pitch: number },
  ownerId: string = getLocalPlayerId() ?? "",
): void {
  let dir: Vec3;
  if (direction instanceof THREE.Vector3) {
    dir = { x: direction.x, y: direction.y, z: direction.z };
  } else {
    const { yaw, pitch } = direction;
    dir = {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    };
  }

  projectiles.push({
    id: nextId++,
    ownerId,
    position: { ...origin },
    previousPosition: { ...origin },
    direction: dir,
    distanceTraveled: 0,
  });
}

type SweepHit = { kind: "player"; playerId: string } | { kind: "world" };

function sweepHit(from: Vec3, to: Vec3, hitRoots: THREE.Object3D[]): SweepHit | undefined {
  rayDirection.set(to.x - from.x, to.y - from.y, to.z - from.z);
  const distance = rayDirection.length();
  if (distance <= 0) return undefined;

  rayDirection.divideScalar(distance);
  rayOrigin.set(from.x, from.y, from.z);
  raycaster.set(rayOrigin, rayDirection);
  raycaster.far = distance;

  const hits = raycaster.intersectObjects(hitRoots, true).sort((a, b) => a.distance - b.distance);
  for (const hit of hits) {
    const playerId = findPlayerId(hit.object);
    if (playerId && playerId !== getLocalPlayerId()) {
      const remote = remotePlayers.get(playerId);
      if (remote?.alive) return { kind: "player", playerId };
    }
    if (isWorldCollider(hit.object)) return { kind: "world" };
  }
  return undefined;
}

function findPlayerId(object: THREE.Object3D): string | undefined {
  let node: THREE.Object3D | null = object;
  while (node) {
    const id = node.userData.playerId;
    if (typeof id === "string") return id;
    node = node.parent;
  }
  return undefined;
}

function isWorldCollider(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData.isWorldCollider === true) return true;
    node = node.parent;
  }
  return false;
}