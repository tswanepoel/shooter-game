import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  WALK_LOCOMOTION_DAMPENED_ARM_SWING,
  WALK_LOCOMOTION_DAMPENED_HEAD_SWING,
  type CharacterRecipe,
} from "../config/characters.ts";
import { LOCOMOTION_SPEED_THRESHOLD } from "../config/physics.ts";
import type { WeaponRecipe } from "../config/weapons.ts";
import type { AimCascadeState } from "../sim/aimCascade.ts";
import { makeDampedWalkLocomotionClip } from "./locomotionClips.ts";
import {
  bakeMuzzleOffsetInWeaponLocal,
  orientWeaponForHeld,
  sampleWeaponBoreWorldDirection,
  sampleWeaponLocalPointWorld,
} from "./weaponMesh.ts";

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
  readonly armed: boolean;
  setLocomotion(state: LocomotionState): void;
  triggerMuzzleFlash(): void;
  update(dt: number, aim?: AimCascadeState): void;
  updateDeath(dt: number): void;
  sampleEyeWorldPosition(out: THREE.Vector3): void;
  applyDeathCamera(camera: THREE.PerspectiveCamera): void;
  sampleWeaponMuzzleLine(outOrigin: THREE.Vector3, outDirection: THREE.Vector3): void;
  dispose(): void;
}

export async function loadPlayerAvatar(
  character: CharacterRecipe,
  weapon: WeaponRecipe | null,
): Promise<PlayerAvatar> {
  const armed = weapon !== null;
  const characterGltf = await loader.loadAsync(character.modelUrl);
  const weaponGltf = armed ? await loader.loadAsync(weapon.modelUrl) : null;

  const characterMesh = characterGltf.scene;
  disableFrustumCulling(characterMesh);
  scaleToHeight(characterMesh, character.height);

  const weaponMesh = weaponGltf ? weaponGltf.scene : new THREE.Object3D();
  if (armed && weapon) {
    disableFrustumCulling(weaponMesh);
    orientWeaponForHeld(weaponMesh, weapon);
    weaponMesh.position.set(weapon.gripOffset.x, weapon.gripOffset.y, weapon.gripOffset.z);
  }

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
  const headForward = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const lookAtMatrix = new THREE.Matrix4();
  const worldUp = new THREE.Vector3(0, 1, 0);

  const torsoAimPivot = torsoNode ? wrapWithAimPivot(torsoNode) : undefined;
  const headAimPivot = wrapWithAimPivot(headBone);
  const armAimPivot = wrapWithAimPivot(armRight);

  armRight.add(weaponMesh);

  const gripWorldScale = new THREE.Vector3();
  if (armed) {
    armRight.updateMatrixWorld(true);
    armRight.getWorldScale(gripWorldScale);
    weaponMesh.scale.divideScalar(gripWorldScale.x);
  }

  const muzzleFlashes = armed && weapon ? weapon.muzzlePoints.map((point) => {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff2a8 }),
    );
    flash.position.set(point.x, point.y, point.z);
    flash.visible = false;
    armRight.add(flash);
    return flash;
  }) : [];
  let muzzleFlashTimer = 0;

  const mixer = new THREE.AnimationMixer(characterMesh);
  const clips = characterGltf.animations;
  const staticClip = findClip(clips, "static");
  const walkClip = makeDampedWalkLocomotionClip(findClip(clips, "walk"), staticClip, {
    armRightSwing: WALK_LOCOMOTION_DAMPENED_ARM_SWING,
    headSwing: WALK_LOCOMOTION_DAMPENED_HEAD_SWING,
  });
  const sprintClip = THREE.AnimationUtils.makeClipAdditive(findClip(clips, "sprint").clone(), 0, staticClip);

  const holdingRightAction = mixer.clipAction(findClip(clips, "holding-right"));
  // Locomotion always layers on holding-right, even when unarmed (eye offset and walk/sprint
  // additive clips are authored against that pose — static base stretches the rig).
  holdingRightAction.play();

  const dieAction = mixer.clipAction(findClip(clips, "die"));
  dieAction.setLoop(THREE.LoopOnce, 1);
  dieAction.clampWhenFinished = true;

  const walkAction = mixer.clipAction(walkClip);
  const sprintAction = mixer.clipAction(sprintClip);
  for (const action of [walkAction, sprintAction]) {
    action.blendMode = THREE.AdditiveAnimationBlendMode;
    action.play();
  }
  walkAction.setEffectiveWeight(0);
  sprintAction.setEffectiveWeight(0);

  mixer.update(0);
  characterMesh.updateMatrixWorld(true);
  armRight.updateMatrixWorld(true);
  weaponMesh.updateMatrixWorld(true);

  const primaryMuzzleLocal = new THREE.Vector3();
  const primaryMuzzle = armed && weapon ? weapon.muzzlePoints[0] : undefined;
  if (primaryMuzzle) {
    bakeMuzzleOffsetInWeaponLocal(primaryMuzzle, weaponMesh, primaryMuzzleLocal);
  }

  const targetWeight = { walk: 0, sprint: 0 };
  let deathActive = false;

  function setLocomotion(state: LocomotionState): void {
    targetWeight.walk = state === "walk" ? 1 : 0;
    targetWeight.sprint = state === "sprint" ? 1 : 0;
  }

  function triggerMuzzleFlash(): void {
    if (!armed || !weapon) return;
    muzzleFlashTimer = weapon.muzzleFlashDuration;
    for (const flash of muzzleFlashes) flash.visible = true;
  }

  function resetAimPivots(): void {
    setAimPivot(torsoAimPivot, 0, 0);
    setAimPivot(headAimPivot, 0, 0);
    setAimPivot(armAimPivot, 0, 0);
  }

  function applyAimPose(aim: AimCascadeState): void {
    setAimPivot(torsoAimPivot, -aim.torsoPitch, 0);
    setAimPivot(headAimPivot, -aim.headPitch, aim.headYaw - aim.torsoYaw);
    setAimPivot(armAimPivot, -aim.shoulderPitch, 0);
  }

  function updateDeath(dt: number): void {
    if (!deathActive) {
      deathActive = true;
      resetAimPivots();
      targetWeight.walk = 0;
      targetWeight.sprint = 0;
      walkAction.setEffectiveWeight(0);
      sprintAction.setEffectiveWeight(0);
      holdingRightAction.fadeOut(0.1);
      dieAction.reset().setEffectiveWeight(1).fadeIn(0.05).play();
    }
    mixer.update(dt);
  }

  function sampleEyeWorldPosition(out: THREE.Vector3): void {
    characterMesh.updateMatrixWorld(true);
    headBone.updateMatrixWorld(true);
    out.copy(eyeOffset).applyMatrix4(headBone.matrixWorld);
  }

  function applyDeathCamera(camera: THREE.PerspectiveCamera): void {
    sampleEyeWorldPosition(camera.position);
    headForward.set(0, 0, 1).transformDirection(headBone.matrixWorld).normalize();
    lookTarget.copy(camera.position).add(headForward);
    lookAtMatrix.lookAt(camera.position, lookTarget, worldUp);
    camera.quaternion.setFromRotationMatrix(lookAtMatrix);
    camera.rotation.setFromQuaternion(camera.quaternion, "YXZ");
  }

  function sampleWeaponMuzzleLine(outOrigin: THREE.Vector3, outDirection: THREE.Vector3): void {
    if (!armed || !weapon) return;
    characterMesh.updateMatrixWorld(true);

    if (primaryMuzzle) {
      sampleWeaponLocalPointWorld(primaryMuzzleLocal, weaponMesh, outOrigin);
    } else {
      weaponMesh.updateMatrixWorld(true);
      outOrigin.setFromMatrixPosition(weaponMesh.matrixWorld);
    }

    sampleWeaponBoreWorldDirection(weapon, weaponMesh, outDirection);
  }

  function restoreAlivePose(): void {
    dieAction.stop();
    dieAction.setEffectiveWeight(0);
    resetAimPivots();
    holdingRightAction.reset().setEffectiveWeight(1).play();
    mixer.update(0);
  }

  function update(dt: number, aim?: AimCascadeState): void {
    if (deathActive) {
      deathActive = false;
      restoreAlivePose();
    }
    walkAction.setEffectiveWeight(approach(walkAction.getEffectiveWeight(), targetWeight.walk, dt));
    sprintAction.setEffectiveWeight(approach(sprintAction.getEffectiveWeight(), targetWeight.sprint, dt));
    mixer.update(dt);
    if (aim) applyAimPose(aim);

    if (muzzleFlashTimer > 0) {
      muzzleFlashTimer -= dt;
      if (muzzleFlashTimer <= 0) {
        for (const flash of muzzleFlashes) flash.visible = false;
      }
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
    armed,
    setLocomotion,
    triggerMuzzleFlash,
    update,
    updateDeath,
    sampleEyeWorldPosition,
    applyDeathCamera,
    sampleWeaponMuzzleLine,
    dispose,
  };
}