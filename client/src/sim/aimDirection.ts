import * as THREE from "three";
import { localPlayer } from "../state/world.ts";
import { armAimDelta } from "./aimCascade.ts";

const worldUp = new THREE.Vector3(0, 1, 0);
const cameraRight = new THREE.Vector3();
const rotQuat = new THREE.Quaternion();
const direction = new THREE.Vector3();

let sampleLocalWeaponAimDirection:
  | ((out: THREE.Vector3) => boolean)
  | undefined;

export function bindLocalWeaponAimSampler(
  sampler: (out: THREE.Vector3) => boolean,
): void {
  sampleLocalWeaponAimDirection = sampler;
}

/** World-yaw then camera-local pitch — screen axes stay independent on diagonals. */
export function applyAimDeltaToDirection(
  camera: THREE.Camera,
  pitch: number,
  yaw: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  out.set(0, 0, -1).applyQuaternion(camera.quaternion);

  if (yaw !== 0) {
    rotQuat.setFromAxisAngle(worldUp, yaw);
    out.applyQuaternion(rotQuat);
  }

  if (pitch !== 0) {
    cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    rotQuat.setFromAxisAngle(cameraRight, pitch);
    out.applyQuaternion(rotQuat);
  }

  return out;
}

export function computeAimDirection(camera: THREE.Camera): THREE.Vector3 {
  if (sampleLocalWeaponAimDirection?.(direction)) {
    return direction;
  }

  const { pitch, yaw } = armAimDelta(localPlayer);
  return applyAimDeltaToDirection(camera, pitch, yaw, direction);
}