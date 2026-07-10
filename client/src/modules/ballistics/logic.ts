// Hit-testing rays against THREE.Object3D hitRoots (the render scene graph) is
// an existing, deliberate tradeoff: this codebase has no collision structure
// independent of the rendered meshes.
import * as THREE from "three";
import type { Vec3 } from "../../types/vec3.ts";
import { type BallisticsState, type Projectile, config } from "./state.ts";

export function spawnProjectile(
  state: BallisticsState,
  origin: Vec3,
  direction: Vec3,
  ownerId: string | undefined,
): void {
  state.projectiles.push({
    id: state.nextId++,
    ownerId,
    position: { ...origin },
    previousPosition: { ...origin },
    direction: { ...direction },
    distanceTraveled: 0,
  });
}

export interface ProjectileHit {
  readonly kind: "player" | "world";
  readonly projectileId: number;
  readonly ownerId: string | undefined;
  readonly speed: number;
  readonly playerId?: string;
  readonly bodyPart?: string;
}

export function tick(
  state: BallisticsState,
  weaponId: string,
  dt: number,
  hitRoots: THREE.Object3D[],
  excludePlayerId: string | undefined,
  isTargetAlive: (playerId: string) => boolean,
): ProjectileHit[] {
  const weapon = config.weapons[weaponId];
  if (!weapon) return [];

  const hits: ProjectileHit[] = [];

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const projectile = state.projectiles[i];
    const previous = projectile.previousPosition;

    const speed = weapon.speed * Math.exp(-config.dragPerUnitDistance * projectile.distanceTraveled);
    const step = speed * dt;

    projectile.position.x += projectile.direction.x * step;
    projectile.position.y += projectile.direction.y * step;
    projectile.position.z += projectile.direction.z * step;
    projectile.distanceTraveled += step;

    if (hitRoots.length > 0) {
      const hit = sweepHit(previous, projectile.position, hitRoots, excludePlayerId, isTargetAlive);
      if (hit) {
        hits.push({
          kind: hit.kind,
          projectileId: projectile.id,
          ownerId: projectile.ownerId,
          speed,
          playerId: hit.kind === "player" ? hit.playerId : undefined,
          bodyPart: hit.kind === "player" ? hit.bodyPart : undefined,
        });
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    projectile.previousPosition.x = projectile.position.x;
    projectile.previousPosition.y = projectile.position.y;
    projectile.previousPosition.z = projectile.position.z;

    if (projectile.distanceTraveled >= weapon.maxRange) {
      state.projectiles.splice(i, 1);
    }
  }

  return hits;
}

type SweepHit = { kind: "player"; playerId: string; bodyPart: string } | { kind: "world" };

const BODY_PART_NAMES = new Set(["head", "torso", "arm-left", "arm-right", "leg-left", "leg-right"]);

const raycaster = new THREE.Raycaster();
const rayDirection = new THREE.Vector3();
const rayOrigin = new THREE.Vector3();

function sweepHit(
  from: Vec3,
  to: Vec3,
  hitRoots: THREE.Object3D[],
  excludePlayerId: string | undefined,
  isTargetAlive: (playerId: string) => boolean,
): SweepHit | undefined {
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
    if (playerId && playerId !== excludePlayerId) {
      if (isTargetAlive(playerId)) return { kind: "player", playerId, bodyPart: findBodyPart(hit.object) };
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

function findBodyPart(object: THREE.Object3D): string {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (BODY_PART_NAMES.has(node.name)) return node.name;
    node = node.parent;
  }
  return "torso";
}

function isWorldCollider(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData.isWorldCollider === true) return true;
    node = node.parent;
  }
  return false;
}

export function getMaxRange(weaponId: string): number {
  return config.weapons[weaponId]?.maxRange ?? 0;
}

export type { Projectile };
