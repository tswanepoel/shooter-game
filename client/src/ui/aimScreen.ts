import * as THREE from "three";
import { CROSSHAIR_DISTANCE } from "../config/physics.ts";
import { gunAimDeltaVisual } from "../sim/aimCascade.ts";
import { localPlayer } from "../state/world.ts";

const direction = new THREE.Vector3();
const point = new THREE.Vector3();
const aimQuat = new THREE.Quaternion();
const deltaEuler = new THREE.Euler(0, 0, 0, "YXZ");
const deltaQuat = new THREE.Quaternion();

export interface AimScreenPosition {
  x: number;
  y: number;
  visible: boolean;
}

export function projectGunAimToScreen(camera: THREE.Camera): AimScreenPosition {
  const { pitch, yaw } = gunAimDeltaVisual(localPlayer);

  deltaEuler.set(pitch, yaw, 0);
  deltaQuat.setFromEuler(deltaEuler);
  aimQuat.copy(camera.quaternion).multiply(deltaQuat);
  direction.set(0, 0, -1).applyQuaternion(aimQuat);

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
  element.style.left = `${position.x + centerOffsetX}px`;
  element.style.top = `${position.y + centerOffsetY}px`;
  element.style.display = position.visible ? "" : "none";
}