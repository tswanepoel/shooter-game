import * as THREE from "three";
import type { WeaponRecipe } from "../config/weapons.ts";

/** holding-right extends arm-right local +Y into "forward". */
export const HELD_ARM_FORWARD = new THREE.Vector3(0, 1, 0);

const weaponWorldPosition = new THREE.Vector3();
const weaponWorldQuaternion = new THREE.Quaternion();
const weaponWorldScale = new THREE.Vector3();

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

/**
 * Convert a muzzle recipe point (arm-attachment frame, same space as gripOffset)
 * into a fixed offset in weapon-mesh local space. Baked once at load.
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

function sampleWeaponWorldPose(weaponMesh: THREE.Object3D): void {
  weaponMesh.updateMatrixWorld(true);
  weaponMesh.matrixWorld.decompose(weaponWorldPosition, weaponWorldQuaternion, weaponWorldScale);
}

/** World position for a weapon-local point; ignores visual scale compensation on the mesh. */
export function sampleWeaponLocalPointWorld(
  pointInWeaponLocal: THREE.Vector3,
  weaponMesh: THREE.Object3D,
  out: THREE.Vector3,
): void {
  sampleWeaponWorldPose(weaponMesh);
  out.copy(pointInWeaponLocal).applyQuaternion(weaponWorldQuaternion).add(weaponWorldPosition);
}

/**
 * Bore direction from the live weapon mesh attitude.
 * orientWeaponForHeld aligns forwardAxis onto the arm but the π grip roll leaves
 * the exit bore opposite authored forward — negation is part of the held pose.
 */
export function sampleWeaponBoreWorldDirection(
  weapon: WeaponRecipe,
  weaponMesh: THREE.Object3D,
  out: THREE.Vector3,
): void {
  sampleWeaponWorldPose(weaponMesh);
  out.copy(weaponAuthoredForward(weapon))
    .applyQuaternion(weaponWorldQuaternion)
    .normalize()
    .negate();
}