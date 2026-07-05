import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { bus } from "../bus.ts";
import { getCurrentWeapon, type WeaponRecipe } from "../config/weapons.ts";
import { gunAimDelta, shoulderPitch, viewPitch } from "../sim/aimCascade.ts";
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

  let recoil = 0;
  const onFired = (): void => {
    recoil = 1;
  };
  const onFeedbackReset = (): void => {
    recoil = 0;
  };
  bus.on("fired", onFired);
  bus.on("feedbackReset", onFeedbackReset);

  function update(dt: number): void {
    recoil *= Math.exp(-weapon.recoilDecayRate * dt);

    const view = viewPitch(localPlayer);
    const shoulder = shoulderPitch(localPlayer);
    const eyeToGun = gunAimDelta(localPlayer);
    const swing = weapon.viewModelSwingScale;

    // Eye → gun: barrel matches crosshair aim (same delta crosshair uses).
    rig.rotation.x = eyeToGun.pitch - recoil * weapon.recoilKickPitch;
    rig.rotation.y = eyeToGun.yaw;
    rig.rotation.z = 0;

    // Shoulder → eye: body lag slides the mount in frame (head/torso catch-up).
    rig.position.set(
      weapon.viewModelOffset.x + (localPlayer.targetYaw - localPlayer.torsoYaw) * swing,
      weapon.viewModelOffset.y + (view - shoulder) * swing,
      weapon.viewModelOffset.z + recoil * weapon.recoilKickDistance,
    );
  }

  function dispose(): void {
    bus.off("fired", onFired);
    bus.off("feedbackReset", onFeedbackReset);
    camera.remove(rig);
  }

  update(0);

  return { object: rig, update, dispose };
}