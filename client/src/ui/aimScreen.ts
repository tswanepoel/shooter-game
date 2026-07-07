import * as THREE from "three";
import { getCurrentWeapon } from "../config/weapons.ts";
import { CROSSHAIR_DISTANCE } from "../config/physics.ts";
import { localPlayerId } from "../state/world.ts";

const point = new THREE.Vector3();
const cameraRayOrigin = new THREE.Vector3();
const cameraRayDirection = new THREE.Vector3();
const towardCamera = new THREE.Vector3();
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

const AIM_SURFACE_BIAS = 0.03;
const CAMERA_OCCLUSION_EPSILON = 0.04;

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
  return playerId === localPlayerId;
}

/** Distance along the weapon bore to the first valid occluder, else fallback range. */
export function resolveWeaponAimDistance(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  occlusionRoots: readonly THREE.Object3D[],
): number {
  if (occlusionRoots.length === 0) return CROSSHAIR_DISTANCE;

  rayOrigin.copy(origin);
  rayDirection.copy(direction);
  raycaster.set(rayOrigin, rayDirection);
  raycaster.far = getCurrentWeapon().projectileMaxRange;

  const hits = raycaster.intersectObjects(occlusionRoots as THREE.Object3D[], true);
  for (const hit of hits) {
    if (hit.distance < 0.05) continue;
    if (isLocalPlayerHit(hit.object)) continue;
    return hit.distance;
  }

  return CROSSHAIR_DISTANCE;
}

function isAimPointVisibleFromCamera(
  camera: THREE.Camera,
  aimPoint: THREE.Vector3,
  occlusionRoots: readonly THREE.Object3D[],
): boolean {
  if (occlusionRoots.length === 0) return true;

  camera.updateMatrixWorld(true);
  towardCamera.subVectors(camera.position, aimPoint);
  const distanceToAim = towardCamera.length();
  if (distanceToAim <= CAMERA_OCCLUSION_EPSILON) return false;

  cameraRayOrigin.copy(camera.position);
  cameraRayDirection.copy(towardCamera).divideScalar(distanceToAim);
  raycaster.set(cameraRayOrigin, cameraRayDirection);
  raycaster.far = distanceToAim - CAMERA_OCCLUSION_EPSILON;

  const hits = raycaster.intersectObjects(occlusionRoots as THREE.Object3D[], true);
  for (const hit of hits) {
    if (hit.distance < 0.05) continue;
    if (isLocalPlayerHit(hit.object)) continue;
    return false;
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
  const distance = resolveWeaponAimDistance(muzzleOrigin, weaponDirection, occlusionRoots);
  out.copy(muzzleOrigin).addScaledVector(weaponDirection, distance);

  towardCamera.subVectors(camera.position, out);
  if (towardCamera.lengthSq() > 1e-8) {
    out.addScaledVector(towardCamera.normalize(), AIM_SURFACE_BIAS);
  }

  return isAimPointVisibleFromCamera(camera, out, occlusionRoots);
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

  const visible = computeWeaponAimWorldPoint(
    origin,
    worldDirection,
    camera,
    occlusionRoots,
    point,
  );
  const projected = projectWorldPointToScreen(camera, point);
  return { ...projected, visible: visible && projected.visible };
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