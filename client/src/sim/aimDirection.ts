import * as THREE from "three";
import { gunAimDelta, type AimCascadeState } from "./aimCascade.ts";

const deltaEuler = new THREE.Euler(0, 0, 0, "YXZ");
const deltaQuat = new THREE.Quaternion();
const aimQuat = new THREE.Quaternion();
const direction = new THREE.Vector3();

export function computeAimDirection(
  camera: THREE.Camera,
  state: AimCascadeState,
): THREE.Vector3 {
  const { pitch, yaw } = gunAimDelta(state);

  deltaEuler.set(pitch, yaw, 0);
  deltaQuat.setFromEuler(deltaEuler);
  aimQuat.copy(camera.quaternion).multiply(deltaQuat);

  return direction.set(0, 0, -1).applyQuaternion(aimQuat);
}