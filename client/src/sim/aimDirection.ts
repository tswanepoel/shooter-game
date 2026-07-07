import * as THREE from "three";

const direction = new THREE.Vector3();
const origin = new THREE.Vector3();

let sampleLocalWeaponMuzzleLine:
  | ((outOrigin: THREE.Vector3, outDirection: THREE.Vector3) => boolean)
  | undefined;

export function bindLocalWeaponMuzzleLineSampler(
  sampler: (outOrigin: THREE.Vector3, outDirection: THREE.Vector3) => boolean,
): void {
  sampleLocalWeaponMuzzleLine = sampler;
}

/**
 * Weapon-mounted aim ray from the live rig (muzzle origin + bore through grip).
 * Includes locomotion animation, aim pivots, and holding pose.
 */
export function computeAimRay(
  outOrigin: THREE.Vector3,
  outDirection: THREE.Vector3,
  camera: THREE.Camera,
): void {
  if (sampleLocalWeaponMuzzleLine?.(outOrigin, outDirection)) return;
  outOrigin.copy(camera.position);
  camera.getWorldDirection(outDirection);
}

export function computeAimDirection(camera: THREE.Camera): THREE.Vector3 {
  computeAimRay(origin, direction, camera);
  return direction;
}