import * as THREE from "three";
import type { WeaponRecipe } from "../config/weapons.ts";

const CAMERA_FORWARD = new THREE.Vector3(0, 0, -1);
/** Kenney blaster-kit forwardAxis; glTF export is already view-mount aligned on this axis. */
const KIT_FORWARD_AXIS = new THREE.Vector3(0, 0, 1);
/** holding-right extends arm-right local +Y into "forward". */
const HELD_ARM_FORWARD = new THREE.Vector3(0, 1, 0);

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

/**
 * First-person: Kenney kit models export view-ready on forwardAxis — remapping onto
 * camera −Z flips the barrel back at the player. Custom forwardAxis overrides still
 * map onto look direction (−Z).
 */
export function orientWeaponForView(mesh: THREE.Object3D, weapon: WeaponRecipe): void {
  const authored = weaponAuthoredForward(weapon);
  if (authored.distanceTo(KIT_FORWARD_AXIS) < 1e-6) return;
  orientToForward(mesh, authored, CAMERA_FORWARD);
}

/**
 * Third-person held: map recipe forwardAxis onto the arm-right holding pose, then
 * apply the grip roll tuned against gripOffset.
 */
export function orientWeaponForHeld(mesh: THREE.Object3D, weapon: WeaponRecipe): void {
  const authoredForward = weaponAuthoredForward(weapon);
  orientToForward(mesh, authoredForward, HELD_ARM_FORWARD);
  mesh.rotateOnAxis(authoredForward, Math.PI);
}