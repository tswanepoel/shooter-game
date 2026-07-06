import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getCurrentCharacter, type ViewChain } from "../config/characters.ts";
import type { WeaponRecipe } from "../config/weapons.ts";
import { localPlayer } from "../state/world.ts";

export interface WeaponViewModel {
  update(dt: number): void;
  dispose(): void;
}

const loader = new GLTFLoader();
const Y_UP = new THREE.Vector3(0, 1, 0);

const shoulderPoint = new THREE.Vector3();
const headDepthBack = new THREE.Vector3();
const neckDown = new THREE.Vector3();
const armDown = new THREE.Vector3();

interface GripPose {
  pitch: number;
  yaw: number;
}

function disableFrustumCulling(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) node.frustumCulled = false;
  });
}

function scaleToLargestDimension(object: THREE.Object3D, targetSize: number): void {
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z));
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

/** Camera-local unit vector pitched on X (before yaw). */
function setPitchedUnit(pitch: number, out: THREE.Vector3): void {
  out.set(0, Math.sin(pitch), -Math.cos(pitch));
}

function weaponAimPitch(): number {
  return localPlayer.torsoPitch + localPlayer.shoulderPitch - localPlayer.targetPitch;
}

function weaponAimYaw(): number {
  return localPlayer.torsoYaw - localPlayer.targetYaw;
}

/**
 * Reverse eye → hand chain in camera space (eyes at origin, look = −Z).
 * Neck/head steps stay on the view axis; the arm segment uses gun yaw + pitch.
 */
function computeGripPose(chain: ViewChain, outPosition: THREE.Vector3, outPose: GripPose): void {
  const aimPitch = weaponAimPitch();
  const aimYaw = weaponAimYaw();

  headDepthBack.set(0, 0, chain.halfHeadDepth);
  neckDown.set(0, 0, chain.halfHeadHeight);

  shoulderPoint.copy(headDepthBack).add(neckDown);
  shoulderPoint.x = chain.handOffsetX;

  setPitchedUnit(chain.armRestPitch + aimPitch, armDown);
  armDown.applyAxisAngle(Y_UP, aimYaw);
  outPosition.copy(shoulderPoint).addScaledVector(armDown, chain.armLength + chain.armLengthCorrection);

  outPose.pitch = aimPitch;
  outPose.yaw = aimYaw;
}

export async function loadWeaponViewModel(
  camera: THREE.PerspectiveCamera,
  weapon: WeaponRecipe,
): Promise<WeaponViewModel> {
  const gltf = await loader.loadAsync(weapon.modelUrl);
  const mesh = gltf.scene;
  disableFrustumCulling(mesh);
  scaleToLargestDimension(mesh, weapon.size);

  const authoredForward = new THREE.Vector3(
    weapon.forwardAxis.x,
    weapon.forwardAxis.y,
    weapon.forwardAxis.z,
  ).normalize();
  orientToForward(mesh, authoredForward, new THREE.Vector3(0, 0, -1));

  const mount = new THREE.Object3D();
  mount.name = "weapon-view-mount";
  mount.rotation.order = "YXZ";
  mount.add(mesh);
  camera.add(mount);

  const gripPosition = new THREE.Vector3();
  const gripPose: GripPose = { pitch: 0, yaw: 0 };

  function update(_dt: number): void {
    mount.visible = localPlayer.alive;
    computeGripPose(getCurrentCharacter().viewChain, gripPosition, gripPose);
    mount.position.copy(gripPosition);
    mount.rotation.y = gripPose.yaw;
    mount.rotation.x = gripPose.pitch;
  }

  function dispose(): void {
    camera.remove(mount);
    mesh.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) material.dispose();
      }
    });
  }

  update(0);
  return { update, dispose };
}