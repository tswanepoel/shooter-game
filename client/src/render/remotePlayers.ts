import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { bus } from "../bus.ts";
import { getCharacterRecipe, type CharacterRecipe } from "../config/characters.ts";
import { DEATH_POSE_PITCH } from "../config/feedback.ts";
import { LOCOMOTION_SPEED_THRESHOLD } from "../config/physics.ts";
import { getWeaponRecipe, type WeaponRecipe } from "../config/weapons.ts";
import type { AimCascadeState } from "../sim/aimCascade.ts";
import { remotePlayers } from "../state/world.ts";

export type LocomotionState = "idle" | "walk" | "sprint";

export interface CharacterInstance {
  object: THREE.Object3D;
  setLocomotion(state: LocomotionState): void;
  triggerMuzzleFlash(): void;
  update(dt: number, aim?: AimCascadeState): void;
}

const BLEND_RATE = 6;

const loader = new GLTFLoader();

const aimEuler = new THREE.Euler(0, 0, 0, "YXZ");

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

export async function loadCharacterWithWeapon(
  character: CharacterRecipe,
  weapon: WeaponRecipe,
): Promise<CharacterInstance> {
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
  const authoredForward = new THREE.Vector3(
    weapon.forwardAxis.x,
    weapon.forwardAxis.y,
    weapon.forwardAxis.z,
  ).normalize();
  //orientToForward(weaponMesh, authoredForward, new THREE.Vector3(0, 1, 0));
  //weaponMesh.rotateOnAxis(authoredForward, Math.PI);
  weaponMesh.position.set(weapon.gripOffset.x, weapon.gripOffset.y, weapon.gripOffset.z);

  const torsoNode = characterMesh.getObjectByName("torso");
  const headNode = characterMesh.getObjectByName("head");
  const gripNode = characterMesh.getObjectByName("arm-right") ?? characterMesh;

  const torsoAimPivot = torsoNode ? wrapWithAimPivot(torsoNode) : undefined;
  const headAimPivot = headNode ? wrapWithAimPivot(headNode) : undefined;
  const armAimPivot = gripNode !== characterMesh ? wrapWithAimPivot(gripNode) : undefined;

  gripNode.add(weaponMesh);

  const gripWorldScale = new THREE.Vector3();
  gripNode.updateMatrixWorld(true);
  gripNode.getWorldScale(gripWorldScale);
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
  gripNode.add(muzzleFlash);
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
    // Aim lives on pivots the mixer never touches; animated bones stay inside.
    // Pivots are reassigned every frame so pitch cannot stack across walk cycles.
    // Cascade pitch is camera convention (positive = look up); rig local X is
    // opposite, so only the bone mapping is negated — wire/cascade stay as-is.
    //
    // Pelvis/root rotation.y already faces torsoYaw (+ π model forward). Pivots only
    // add local bend: neck yaw relative to torso, pitch slices on the chain.
    setAimPivot(torsoAimPivot, -aim.torsoPitch, 0);
    setAimPivot(headAimPivot, -aim.headPitch, aim.headYaw - aim.torsoYaw);
    setAimPivot(armAimPivot, -aim.shoulderPitch, 0);
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

  return { object: characterMesh, setLocomotion, triggerMuzzleFlash, update };
}

export interface RemotePlayerManager {
  update(dt: number): void;
}

interface LoadedRemote {
  instance: CharacterInstance;
  characterId: string;
  weaponId: string;
}

function classifyLocomotion(speed: number): LocomotionState {
  if (speed >= LOCOMOTION_SPEED_THRESHOLD.sprint) return "sprint";
  if (speed >= LOCOMOTION_SPEED_THRESHOLD.walk) return "walk";
  return "idle";
}

export function getCharacterHitRoots(): THREE.Object3D[] {
  return Array.from(hitRoots.values());
}

const hitRoots = new Map<string, THREE.Object3D>();

export function createRemotePlayerManager(scene: THREE.Scene): RemotePlayerManager {
  const loaded = new Map<string, LoadedRemote>();
  const pending = new Set<string>();
  const pendingRecipe = new Map<string, { characterId: string; weaponId: string }>();

  bus.on("fireReceived", ({ id }) => {
    loaded.get(id)?.instance.triggerMuzzleFlash();
  });

  function removeInstance(id: string): void {
    const entry = loaded.get(id);
    if (!entry) return;
    scene.remove(entry.instance.object);
    hitRoots.delete(id);
    loaded.delete(id);
  }

  function ensureInstance(id: string): void {
    const remote = remotePlayers.get(id);
    if (!remote) return;

    const entry = loaded.get(id);
    if (
      entry &&
      entry.characterId === remote.characterId &&
      entry.weaponId === remote.weaponId
    ) {
      return;
    }

    const queued = pendingRecipe.get(id);
    if (
      pending.has(id) &&
      queued?.characterId === remote.characterId &&
      queued?.weaponId === remote.weaponId
    ) {
      return;
    }
    if (entry) removeInstance(id);

    pending.add(id);
    const character = getCharacterRecipe(remote.characterId);
    const weapon = getWeaponRecipe(remote.weaponId);
    pendingRecipe.set(id, { characterId: character.id, weaponId: weapon.id });
    loadCharacterWithWeapon(character, weapon).then((instance) => {
      pending.delete(id);
      pendingRecipe.delete(id);
      const current = remotePlayers.get(id);
      if (!current) return;
      if (
        current.characterId !== character.id ||
        current.weaponId !== weapon.id
      ) {
        return; // stale load; a newer recipe is already queued
      }
      instance.object.userData.playerId = id;
      scene.add(instance.object);
      hitRoots.set(id, instance.object);
      loaded.set(id, { instance, characterId: character.id, weaponId: weapon.id });
    });
  }

  function update(dt: number): void {
    for (const id of remotePlayers.keys()) {
      ensureInstance(id);
    }

    for (const [id, entry] of loaded) {
      const remote = remotePlayers.get(id);
      if (!remote) {
        removeInstance(id);
        continue;
      }

      if (entry.characterId !== remote.characterId || entry.weaponId !== remote.weaponId) {
        ensureInstance(id);
        continue;
      }

      entry.instance.object.position.set(remote.position.x, remote.position.y, remote.position.z);
      entry.instance.object.rotation.y = remote.torsoYaw + Math.PI;

      if (remote.alive) {
        entry.instance.object.rotation.x = 0;
        entry.instance.setLocomotion(classifyLocomotion(remote.measuredSpeed));
        entry.instance.update(dt, remote);
      } else {
        entry.instance.object.rotation.x = DEATH_POSE_PITCH;
      }
    }
  }

  return { update };
}