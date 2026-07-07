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

const boreHint = new THREE.Vector3();

/**
 * Convert a muzzle recipe point (arm-attachment frame, same space as gripOffset)
 * into a fixed offset in weapon-mesh local space.
 */
export function bakeMuzzleOffsetInWeaponLocal(
  muzzleInArmSpace: { x: number; y: number; z: number },
  weaponMesh: THREE.Object3D,
  out: THREE.Vector3,
): void {
  out.set(muzzleInArmSpace.x, muzzleInArmSpace.y, muzzleInArmSpace.z)
    .sub(weaponMesh.position)
    .applyQuaternion(weaponMesh.quaternion.clone().invert());
}

/** Muzzle world position from a baked weapon-local offset. */
export function sampleBakedMuzzleWorldPosition(
  muzzleInWeaponLocal: THREE.Vector3,
  weaponMesh: THREE.Object3D,
  out: THREE.Vector3,
): void {
  out.copy(muzzleInWeaponLocal).applyMatrix4(weaponMesh.matrixWorld);
}

/**
 * Bore direction from the oriented forwardAxis, including live animation.
 * When muzzle and grip are known, flip so the ray exits the muzzle end.
 */
export function sampleWeaponBoreWorldDirection(
  weapon: WeaponRecipe,
  weaponMesh: THREE.Object3D,
  out: THREE.Vector3,
  muzzleWorld?: THREE.Vector3,
  gripWorld?: THREE.Vector3,
): void {
  out.copy(weaponAuthoredForward(weapon)).transformDirection(weaponMesh.matrixWorld).normalize();
  if (!muzzleWorld || !gripWorld) return;

  boreHint.subVectors(muzzleWorld, gripWorld);
  if (boreHint.lengthSq() < 1e-8) return;
  boreHint.normalize();
  if (out.dot(boreHint) < 0) out.negate();
}