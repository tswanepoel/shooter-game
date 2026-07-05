import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { bus } from "../bus.ts";
import {
  RECOIL_DECAY_RATE,
  RECOIL_KICK_DISTANCE,
  RECOIL_KICK_PITCH,
  VIEW_MODEL_OFFSET,
  VIEW_MODEL_SWING_SCALE,
  WEAPON_FORWARD_AXIS,
  WEAPON_MODEL_URL,
  WEAPON_SIZE,
} from "../config/weapons.ts";
import { localPlayer } from "../state/world.ts";

export interface WeaponViewModel {
  object: THREE.Object3D;
  update(dt: number): void;
}

const loader = new GLTFLoader();

export async function loadWeaponViewModel(camera: THREE.Camera): Promise<WeaponViewModel> {
  const gltf = await loader.loadAsync(WEAPON_MODEL_URL);
  const weapon = gltf.scene;

  weapon.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(weapon).getSize(new THREE.Vector3());
  weapon.scale.setScalar(WEAPON_SIZE / Math.max(size.x, size.y, size.z));

  const authoredForward = new THREE.Vector3(
    WEAPON_FORWARD_AXIS.x,
    WEAPON_FORWARD_AXIS.y,
    WEAPON_FORWARD_AXIS.z,
  ).normalize();
  const baseOrientation = new THREE.Quaternion().setFromUnitVectors(
    authoredForward,
    new THREE.Vector3(0, 0, 1),
  );

  camera.add(weapon);

  let recoil = 0;
  bus.on("fired", () => {
    recoil = 1;
  });

  const wristQuaternion = new THREE.Quaternion();
  const wristEuler = new THREE.Euler(0, 0, 0, "YXZ");

  function update(dt: number): void {
    recoil *= Math.exp(-RECOIL_DECAY_RATE * dt);

    wristEuler.x = localPlayer.gunPitch - localPlayer.headPitch + recoil * RECOIL_KICK_PITCH;
    wristEuler.y = localPlayer.gunYaw - localPlayer.headYaw;
    wristQuaternion.setFromEuler(wristEuler);
    weapon.quaternion.copy(wristQuaternion).multiply(baseOrientation);

    const swingYaw = localPlayer.headYaw - localPlayer.torsoYaw;
    const swingPitch = localPlayer.headPitch - localPlayer.torsoPitch;

    weapon.position.set(
      VIEW_MODEL_OFFSET.x + swingYaw * VIEW_MODEL_SWING_SCALE,
      VIEW_MODEL_OFFSET.y - swingPitch * VIEW_MODEL_SWING_SCALE,
      VIEW_MODEL_OFFSET.z + recoil * RECOIL_KICK_DISTANCE,
    );
  }

  update(0);

  return { object: weapon, update };
}
