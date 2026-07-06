import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CharacterRecipe } from "../config/characters.ts";
import { LOCOMOTION_SPEED_THRESHOLD } from "../config/physics.ts";
import type { WeaponRecipe } from "../config/weapons.ts";
import type { AimCascadeState } from "../sim/aimCascade.ts";
import { orientWeaponForHeld } from "./weaponMesh.ts";

export type LocomotionState = "idle" | "walk" | "sprint";

const BLEND_RATE = 6;
const loader = new GLTFLoader();
const aimEuler = new THREE.Euler(0, 0, 0, "YXZ");

export function classifyLocomotionFromSpeed(speed: number): LocomotionState {
  if (speed >= LOCOMOTION_SPEED_THRESHOLD.sprint) return "sprint";
  if (speed >= LOCOMOTION_SPEED_THRESHOLD.walk) return "walk";
  return "idle";
}

export function classifyLocalLocomotion(sprinting: boolean, speed: number): LocomotionState {
  if (sprinting) return "sprint";
  return classifyLocomotionFromSpeed(speed);
}

function wrapWithAimPivot(bone: THREE.Object3D): THREE.Object3D {
  const parent = bone.parent;
  if (!parent) throw new Error(`cannot create aim pivot for detached bone: ${bone.name}`);

  const pivot = new THREE.Object3D();
  pivot.name = `${bone.name}-aim`;
  pivot.position.copy(bone.position);
  parent.remove(bone);
  bone.position.set(0, 0, 0);
  pivot.add(bone);
  parent.add(pivot);
  return pivot;
}

function setAimPivot(pivot: THREE.Object3D | undefined, pitch: number, yaw: number): void {
  if (!pivot) return;
  aimEuler.set(pitch, yaw, 0);
  pivot.quaternion.setFromEuler(aimEuler);
}

function disableFrustumCulling(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) node.frustumCulled = false;
  });
}

function scaleToHeight(object: THREE.Object3D, targetHeight: number): void {
  object.updateMatrixWorld(true);
  const height = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).y;
  object.scale.setScalar(targetHeight / height);
}

function scaleToLargestDimension(object: THREE.Object3D, targetSize: number): void {
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z));
}

function findClip(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip {
  const clip = clips.find((candidate) => candidate.name === name);
  if (!clip) throw new Error(`missing animation clip: ${name}`);
  return clip;
}

function approach(current: number, target: number, dt: number): number {
  const delta = target - current;
  const step = BLEND_RATE * dt;
  return Math.abs(delta) <= step ? target : current + Math.sign(delta) * step;
}

export interface PlayerAvatar {
  readonly root: THREE.Object3D;
  readonly weaponMesh: THREE.Object3D;
  setLocomotion(state: LocomotionState): void;
  triggerMuzzleFlash(): void;
  update(dt: number, aim?: AimCascadeState): void;
  sampleEyeWorldPosition(out: THREE.Vector3): void;
  sampleWeaponAimDirection(out: THREE.Vector3): void;
  dispose(): void;
}

export async function loadPlayerAvatar(
  character: CharacterRecipe,
  weapon: WeaponRecipe,
): Promise<PlayerAvatar> {
  const [characterGltf, weaponGltf] = await Promise.all([
    loader.loadAsync(character.modelUrl),
    loader.loadAsync(weapon.modelUrl),
  ]);

  const characterMesh = characterGltf.scene;
  disableFrustumCulling(characterMesh);
  scaleToHeight(characterMesh, character.height);

  const weaponMesh = weaponGltf.scene;
  disableFrustumCulling(weaponMesh);
  scaleToLargestDimension(weaponMesh, weapon.size);
  orientWeaponForHeld(weaponMesh, weapon);
  weaponMesh.position.set(weapon.gripOffset.x, weapon.gripOffset.y, weapon.gripOffset.z);

  const torsoNode = characterMesh.getObjectByName("torso");
  const headLookup = characterMesh.getObjectByName("head");
  const armRightLookup = characterMesh.getObjectByName("arm-right");
  if (!headLookup) throw new Error(`missing head bone on ${character.id}`);
  if (!armRightLookup) throw new Error(`missing arm-right bone on ${character.id}`);
  const headBone: THREE.Object3D = headLookup;
  const armRight: THREE.Object3D = armRightLookup;

  const eyeOffset = new THREE.Vector3(
    character.eyeOffset.x,
    character.eyeOffset.y,
    character.eyeOffset.z,
  );

  const torsoAimPivot = torsoNode ? wrapWithAimPivot(torsoNode) : undefined;
  const headAimPivot = wrapWithAimPivot(headBone);
  const armAimPivot = wrapWithAimPivot(armRight);

  armRight.add(weaponMesh);

  const gripWorldScale = new THREE.Vector3();
  armRight.updateMatrixWorld(true);
  armRight.getWorldScale(gripWorldScale);
  weaponMesh.scale.divideScalar(gripWorldScale.x);

  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2a8 }),
  );
  muzzleFlash.position.set(
    weapon.muzzleFlashOffset.x,
    weapon.muzzleFlashOffset.y,
    weapon.muzzleFlashOffset.z,
  );
  muzzleFlash.visible = false;
  armRight.add(muzzleFlash);
  let muzzleFlashTimer = 0;

  const mixer = new THREE.AnimationMixer(characterMesh);
  const clips = characterGltf.animations;
  const staticClip = findClip(clips, "static");
  const walkClip = THREE.AnimationUtils.makeClipAdditive(findClip(clips, "walk").clone(), 0, staticClip);
  const sprintClip = THREE.AnimationUtils.makeClipAdditive(findClip(clips, "sprint").clone(), 0, staticClip);

  mixer.clipAction(findClip(clips, "holding-right")).play();

  const walkAction = mixer.clipAction(walkClip);
  const sprintAction = mixer.clipAction(sprintClip);
  for (const action of [walkAction, sprintAction]) {
    action.blendMode = THREE.AdditiveAnimationBlendMode;
    action.play();
  }
  walkAction.setEffectiveWeight(0);
  sprintAction.setEffectiveWeight(0);

  const targetWeight = { walk: 0, sprint: 0 };

  function setLocomotion(state: LocomotionState): void {
    targetWeight.walk = state === "walk" ? 1 : 0;
    targetWeight.sprint = state === "sprint" ? 1 : 0;
  }

  function triggerMuzzleFlash(): void {
    muzzleFlashTimer = weapon.muzzleFlashDuration;
    muzzleFlash.visible = true;
  }

  function applyAimPose(aim: AimCascadeState): void {
    setAimPivot(torsoAimPivot, -aim.torsoPitch, 0);
    setAimPivot(headAimPivot, -aim.headPitch, aim.headYaw - aim.torsoYaw);
    setAimPivot(armAimPivot, -aim.shoulderPitch, 0);
  }

  function sampleEyeWorldPosition(out: THREE.Vector3): void {
    characterMesh.updateMatrixWorld(true);
    headBone.updateMatrixWorld(true);
    out.copy(eyeOffset).applyMatrix4(headBone.matrixWorld);
  }

  const gripWorld = new THREE.Vector3();
  const muzzleWorld = new THREE.Vector3();

  function sampleWeaponAimDirection(out: THREE.Vector3): void {
    characterMesh.updateMatrixWorld(true);
    armRight.updateMatrixWorld(true);
    weaponMesh.updateMatrixWorld(true);
    gripWorld.setFromMatrixPosition(weaponMesh.matrixWorld);
    muzzleWorld
      .set(
        weapon.muzzleFlashOffset.x,
        weapon.muzzleFlashOffset.y,
        weapon.muzzleFlashOffset.z,
      )
      .applyMatrix4(armRight.matrixWorld);
    out.copy(muzzleWorld).sub(gripWorld);
    if (out.lengthSq() < 1e-8) {
      out.set(0, 0, -1).transformDirection(characterMesh.matrixWorld);
    } else {
      out.normalize();
    }
  }

  function update(dt: number, aim?: AimCascadeState): void {
    walkAction.setEffectiveWeight(approach(walkAction.getEffectiveWeight(), targetWeight.walk, dt));
    sprintAction.setEffectiveWeight(approach(sprintAction.getEffectiveWeight(), targetWeight.sprint, dt));
    mixer.update(dt);
    if (aim) applyAimPose(aim);

    if (muzzleFlashTimer > 0) {
      muzzleFlashTimer -= dt;
      if (muzzleFlashTimer <= 0) muzzleFlash.visible = false;
    }
  }

  function dispose(): void {
    mixer.stopAllAction();
    characterMesh.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) material.dispose();
      }
    });
  }

  return {
    root: characterMesh,
    weaponMesh,
    setLocomotion,
    triggerMuzzleFlash,
    update,
    sampleEyeWorldPosition,
    sampleWeaponAimDirection,
    dispose,
  };
}