import * as THREE from "three";
import { CROSSHAIR_DISTANCE } from "../config/physics.ts";

const point = new THREE.Vector3();
const cameraSpace = new THREE.Vector3();

export interface AimScreenPosition {
  x: number;
  y: number;
  visible: boolean;
}

/** Project a point along the weapon line onto screen pixels; clamp to edges when past the frustum. */
export function projectWeaponLineToScreen(
  camera: THREE.Camera,
  origin: THREE.Vector3,
  worldDirection: THREE.Vector3,
  distance = CROSSHAIR_DISTANCE,
): AimScreenPosition {
  camera.updateMatrixWorld(true);

  point.copy(origin).addScaledVector(worldDirection, distance);
  point.project(camera);

  const width = window.innerWidth;
  const height = window.innerHeight;

  let ndcX = point.x;
  let ndcY = point.y;

  if (point.z >= 1) {
    cameraSpace.copy(worldDirection).transformDirection(camera.matrixWorldInverse);
    ndcX = cameraSpace.x;
    ndcY = cameraSpace.y;
    const extent = Math.max(Math.abs(ndcX), Math.abs(ndcY), 1e-6);
    const scale = 1 / extent;
    ndcX *= scale;
    ndcY *= scale;
  }

  const x = Math.min(Math.max((ndcX * 0.5 + 0.5) * width, 0), width);
  const y = Math.min(Math.max((-ndcY * 0.5 + 0.5) * height, 0), height);

  return { x, y, visible: true };
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