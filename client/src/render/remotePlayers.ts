import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CHARACTER_HEIGHT, CHARACTER_MODEL_URL } from "../config/characters.ts";
import { WEAPON_FORWARD_AXIS, WEAPON_GRIP_OFFSET, WEAPON_MODEL_URL, WEAPON_SIZE } from "../config/weapons.ts";

export type LocomotionState = "idle" | "walk" | "sprint";

export interface CharacterInstance {
  object: THREE.Object3D;
  setLocomotion(state: LocomotionState): void;
  update(dt: number): void;
}

const IDLE_WEIGHT = 0.4;
const BLEND_RATE = 6;

const loader = new GLTFLoader();

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

function orientToForward(object: THREE.Object3D, authoredForward: THREE.Vector3, desiredForward: THREE.Vector3): void {
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    authoredForward.clone().normalize(),
    desiredForward.clone().normalize(),
  );
  object.quaternion.premultiply(rotation);
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

export async function loadCharacterWithWeapon(): Promise<CharacterInstance> {
  const [characterGltf, weaponGltf] = await Promise.all([
    loader.loadAsync(CHARACTER_MODEL_URL),
    loader.loadAsync(WEAPON_MODEL_URL),
  ]);

  const character = characterGltf.scene;
  scaleToHeight(character, CHARACTER_HEIGHT);

  const weapon = weaponGltf.scene;
  scaleToLargestDimension(weapon, WEAPON_SIZE);
  // arm-right's rest-pose "hanging down" axis is what the holding-right pose rotates
  // into "forward" — aligning to that (not to world-forward) survives the pose.
  const authoredForward = new THREE.Vector3(
    WEAPON_FORWARD_AXIS.x,
    WEAPON_FORWARD_AXIS.y,
    WEAPON_FORWARD_AXIS.z,
  ).normalize();
  orientToForward(weapon, authoredForward, new THREE.Vector3(0, 1, 0));
  weapon.rotateOnAxis(authoredForward, Math.PI);
  weapon.position.set(WEAPON_GRIP_OFFSET.x, WEAPON_GRIP_OFFSET.y, WEAPON_GRIP_OFFSET.z);

  const gripNode = character.getObjectByName("arm-right") ?? character;
  gripNode.add(weapon);

  // gripNode inherits the character's own scale; counteract it so the weapon
  // keeps the world-space size set above instead of being scaled a second time.
  const gripWorldScale = new THREE.Vector3();
  gripNode.updateMatrixWorld(true);
  gripNode.getWorldScale(gripWorldScale);
  weapon.scale.divideScalar(gripWorldScale.x);

  const mixer = new THREE.AnimationMixer(character);
  const clips = characterGltf.animations;
  const staticClip = findClip(clips, "static");

  const idleClip = THREE.AnimationUtils.makeClipAdditive(findClip(clips, "idle").clone(), 0, staticClip);
  const walkClip = THREE.AnimationUtils.makeClipAdditive(findClip(clips, "walk").clone(), 0, staticClip);
  const sprintClip = THREE.AnimationUtils.makeClipAdditive(findClip(clips, "sprint").clone(), 0, staticClip);

  mixer.clipAction(findClip(clips, "holding-right")).play();

  const idleAction = mixer.clipAction(idleClip);
  const walkAction = mixer.clipAction(walkClip);
  const sprintAction = mixer.clipAction(sprintClip);

  for (const action of [idleAction, walkAction, sprintAction]) {
    action.blendMode = THREE.AdditiveAnimationBlendMode;
    action.play();
  }
  idleAction.setEffectiveWeight(IDLE_WEIGHT);
  walkAction.setEffectiveWeight(0);
  sprintAction.setEffectiveWeight(0);

  const targetWeight = { idle: IDLE_WEIGHT, walk: 0, sprint: 0 };

  function setLocomotion(state: LocomotionState): void {
    targetWeight.idle = state === "idle" ? IDLE_WEIGHT : 0;
    targetWeight.walk = state === "walk" ? 1 : 0;
    targetWeight.sprint = state === "sprint" ? 1 : 0;
  }

  function update(dt: number): void {
    idleAction.setEffectiveWeight(approach(idleAction.getEffectiveWeight(), targetWeight.idle, dt));
    walkAction.setEffectiveWeight(approach(walkAction.getEffectiveWeight(), targetWeight.walk, dt));
    sprintAction.setEffectiveWeight(approach(sprintAction.getEffectiveWeight(), targetWeight.sprint, dt));
    mixer.update(dt);
  }

  return { object: character, setLocomotion, update };
}
