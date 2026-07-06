import * as THREE from "three";

const direction = new THREE.Vector3();

let sampleLocalWeaponAimDirection:
  | ((out: THREE.Vector3) => boolean)
  | undefined;

export function bindLocalWeaponAimSampler(
  sampler: (out: THREE.Vector3) => boolean,
): void {
  sampleLocalWeaponAimDirection = sampler;
}

/** Barrel direction from the local avatar rig; ocular line until assets load. */
export function computeAimDirection(camera: THREE.Camera): THREE.Vector3 {
  if (sampleLocalWeaponAimDirection?.(direction)) {
    return direction;
  }
  return camera.getWorldDirection(direction);
}