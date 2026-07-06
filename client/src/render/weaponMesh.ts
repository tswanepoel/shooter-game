import * as THREE from "three";
import type { WeaponRecipe } from "../config/weapons.ts";

/** holding-right extends arm-right local +Y into "forward". */
export const HELD_ARM_FORWARD = new THREE.Vector3(0, 1, 0);

export function weaponAuthoredForward(weapon: WeaponRecipe): THREE.Vector3 {
  return new THREE.Vector3(
    weapon.forwardAxis.x,
    weapon.forwardAxis.y,
    weapon.forwardAxis.z,
  ).normalize();
}

function orientToForward(
  object: THREE.Object3D,
  authoredForward: THREE.Vector3,
  desiredForward: THREE.Vector3,
): void {
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    authoredForward.clone().normalize(),
    desiredForward.clone().normalize(),
  );
  object.quaternion.premultiply(rotation);
}

/** Map recipe forwardAxis onto the arm-right holding pose, then apply grip roll. */
export function orientWeaponForHeld(mesh: THREE.Object3D, weapon: WeaponRecipe): void {
  const authoredForward = weaponAuthoredForward(weapon);
  orientToForward(mesh, authoredForward, HELD_ARM_FORWARD);
  mesh.rotateOnAxis(authoredForward, Math.PI);
}