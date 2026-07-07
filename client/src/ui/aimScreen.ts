/**
 * Weapon-line aim → screen projection.
 *
 * 1. Bore ray (muzzle + direction): where the reticle sits in world space.
 * 2. Screen-space ray (camera through that pixel): hide if closer geometry blocks
 *    the view. Do not use eye→aim world rays — they graze unrelated colliders.
 */
import * as THREE from "three";
import { CROSSHAIR_DISTANCE } from "../config/physics.ts";
import { getActiveWeapon } from "../state/loadout.ts";
import { getLocalPlayerId } from "../state/world.ts";

const point = new THREE.Vector3();
const aimWorld = new THREE.Vector3();
const towardCamera = new THREE.Vector3();
const screenNdc = new THREE.Vector2();
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

const AIM_SURFACE_BIAS = 0.03;
const MUZZLE_SELF_HIT_EPSILON = 0.02;
/** Hits this close to the aim point in world space are the target surface, not occlusion. */
const AIM_SURFACE_POINT_EPSILON = 0.1;

export interface AimScreenPosition {
  x: number;
  y: number;
  visible: boolean;
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

function isLocalPlayerHit(object: THREE.Object3D): boolean {
  const playerId = findPlayerId(object);
  return playerId === getLocalPlayerId();
}

function isWorldCollider(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData.isWorldCollider === true) return true;
    node = node.parent;
  }
  return false;
}

function resolveWeaponAimHit(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  occlusionRoots: readonly THREE.Object3D[],
): { distance: number; fallback: boolean } {
  if (occlusionRoots.length === 0) {
    return { distance: CROSSHAIR_DISTANCE, fallback: true };
  }

  rayOrigin.copy(origin);
  rayDirection.copy(direction);
  raycaster.set(rayOrigin, rayDirection);
  raycaster.far = getActiveWeapon()?.projectileMaxRange ?? CROSSHAIR_DISTANCE;

  const hits = raycaster
    .intersectObjects(occlusionRoots as THREE.Object3D[], true)
    .sort((a, b) => a.distance - b.distance);
  for (const hit of hits) {
    if (isLocalPlayerHit(hit.object)) continue;
    if (hit.distance < MUZZLE_SELF_HIT_EPSILON && !isWorldCollider(hit.object)) continue;
    return { distance: hit.distance, fallback: false };
  }

  return { distance: CROSSHAIR_DISTANCE, fallback: true };
}

function isAimPointVisibleFromCamera(
  camera: THREE.Camera,
  aimPoint: THREE.Vector3,
  occlusionRoots: readonly THREE.Object3D[],
): boolean {
  if (occlusionRoots.length === 0) return true;

  camera.updateMatrixWorld(true);
  const distanceToAim = camera.position.distanceTo(aimPoint);
  if (distanceToAim <= 0.01) return false;

  point.copy(aimPoint).project(camera);
  if (point.z < -1 || point.z > 1) return false;

  screenNdc.set(point.x, point.y);
  raycaster.setFromCamera(screenNdc, camera as THREE.PerspectiveCamera);
  raycaster.far = distanceToAim + 0.25;

  const hits = raycaster
    .intersectObjects(occlusionRoots as THREE.Object3D[], true)
    .sort((a, b) => a.distance - b.distance);
  for (const hit of hits) {
    if (hit.distance < 0.05) continue;
    if (isLocalPlayerHit(hit.object)) continue;
    const pointDelta = hit.point.distanceTo(aimPoint);
    if (pointDelta <= AIM_SURFACE_POINT_EPSILON) continue;
    if (hit.distance < distanceToAim - 0.05) return false;
  }

  return true;
}

/** Weapon-line aim point in world space, biased slightly toward the camera on surfaces. */
export function computeWeaponAimWorldPoint(
  muzzleOrigin: THREE.Vector3,
  weaponDirection: THREE.Vector3,
  camera: THREE.Camera,
  occlusionRoots: readonly THREE.Object3D[],
  out: THREE.Vector3,
): boolean {
  const { distance } = resolveWeaponAimHit(muzzleOrigin, weaponDirection, occlusionRoots);
  out.copy(muzzleOrigin).addScaledVector(weaponDirection, distance);

  if (!isAimPointVisibleFromCamera(camera, out, occlusionRoots)) return false;

  towardCamera.subVectors(camera.position, out);
  if (towardCamera.lengthSq() > 1e-8) {
    out.addScaledVector(towardCamera.normalize(), AIM_SURFACE_BIAS);
  }

  return true;
}

export function projectWorldPointToScreen(
  camera: THREE.Camera,
  world: THREE.Vector3,
): AimScreenPosition {
  camera.updateMatrixWorld(true);
  point.copy(world).project(camera);

  const width = window.innerWidth;
  const height = window.innerHeight;

  if (point.z < -1 || point.z > 1) {
    return { x: width * 0.5, y: height * 0.5, visible: false };
  }

  const x = (point.x * 0.5 + 0.5) * width;
  const y = (-point.y * 0.5 + 0.5) * height;
  return { x, y, visible: true };
}

/** Screen position of the weapon-line aim point (same world target as the crosshair). */
export function resolveWeaponAimScreenPosition(
  camera: THREE.Camera,
  muzzleOrigin: THREE.Vector3,
  weaponDirection: THREE.Vector3,
  occlusionRoots: readonly THREE.Object3D[],
): AimScreenPosition {
  const visible = computeWeaponAimWorldPoint(
    muzzleOrigin,
    weaponDirection,
    camera,
    occlusionRoots,
    aimWorld,
  );
  const projected = projectWorldPointToScreen(camera, aimWorld);
  return { ...projected, visible: visible && projected.visible };
}

/**
 * Map a weapon-line aim point to screen pixels.
 * World aim = origin + direction * distance; camera is only the projection viewport.
 */
export function projectWeaponLineToScreen(
  camera: THREE.Camera,
  origin: THREE.Vector3,
  worldDirection: THREE.Vector3,
  occlusionRoots?: readonly THREE.Object3D[],
): AimScreenPosition {
  if (!occlusionRoots) {
    point.copy(origin).addScaledVector(worldDirection, CROSSHAIR_DISTANCE);
    return projectWorldPointToScreen(camera, point);
  }

  return resolveWeaponAimScreenPosition(camera, origin, worldDirection, occlusionRoots);
}

export function applyAimScreenPosition(
  element: HTMLElement,
  position: AimScreenPosition,
  centerOffsetX = 0,
  centerOffsetY = 0,
): void {
  const x = position.x + centerOffsetX;
  const y = position.y + centerOffsetY;
  element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  element.style.display = position.visible ? "" : "none";
}