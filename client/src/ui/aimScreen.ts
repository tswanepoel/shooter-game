import * as THREE from "three";
import { CROSSHAIR_DISTANCE } from "../config/physics.ts";
import type { AimDelta } from "../sim/aimCascade.ts";
import { applyAimDeltaToDirection } from "../sim/aimDirection.ts";

const direction = new THREE.Vector3();
const point = new THREE.Vector3();

export interface AimScreenPosition {
  x: number;
  y: number;
  visible: boolean;
}

export function projectAimDeltaToScreen(
  camera: THREE.Camera,
  delta: AimDelta,
): AimScreenPosition {
  applyAimDeltaToDirection(camera, delta.pitch, delta.yaw, direction);

  point.copy(camera.position).addScaledVector(direction, CROSSHAIR_DISTANCE);
  point.project(camera);

  return {
    x: (point.x * 0.5 + 0.5) * window.innerWidth,
    y: (-point.y * 0.5 + 0.5) * window.innerHeight,
    visible: point.z < 1,
  };
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