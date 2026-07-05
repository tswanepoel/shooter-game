import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getCurrentWeapon, type WeaponRecipe } from "../config/weapons.ts";
import { armAimDelta } from "../sim/aimCascade.ts";
import { localPlayer } from "../state/world.ts";

export interface WeaponViewModel {
  object: THREE.Object3D;
  update(dt: number): void;
  dispose(): void;
}

const loader = new GLTFLoader();

function disableFrustumCulling(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) node.frustumCulled = false;
  });
}

export async function loadWeaponViewModel(
  camera: THREE.Camera,
  weapon: WeaponRecipe = getCurrentWeapon(),
): Promise<WeaponViewModel> {
  const gltf = await loader.loadAsync(weapon.modelUrl);
  const mesh = gltf.scene;
  disableFrustumCulling(mesh);

  mesh.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
  mesh.scale.setScalar(weapon.size / Math.max(size.x, size.y, size.z));

  const authoredForward = new THREE.Vector3(
    weapon.forwardAxis.x,
    weapon.forwardAxis.y,
    weapon.forwardAxis.z,
  ).normalize();
  mesh.quaternion.setFromUnitVectors(authoredForward, new THREE.Vector3(0, 0, 1));

  const rig = new THREE.Group();
  rig.rotation.order = "YXZ";
  rig.add(mesh);
  camera.add(rig);

  function update(_dt: number): void {
    rig.visible = localPlayer.alive;
    if (!localPlayer.alive) return;

    const delta = armAimDelta(localPlayer);

    // Same arm–eye delta as crosshair; local Y is opposite world-up delta.
    rig.rotation.x = delta.pitch;
    rig.rotation.y = delta.yaw;
    rig.rotation.z = 0;

    rig.position.set(
      weapon.viewModelOffset.x,
      weapon.viewModelOffset.y,
      weapon.viewModelOffset.z,
    );
  }

  function dispose(): void {
    camera.remove(rig);
  }

  update(0);

  return { object: rig, update, dispose };
}