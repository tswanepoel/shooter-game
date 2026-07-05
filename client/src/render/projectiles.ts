import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getCurrentWeapon, type WeaponRecipe } from "../config/weapons.ts";
import { localPlayerId, projectiles } from "../state/world.ts";

export interface ProjectileRenderer {
  update(): void;
  dispose(): void;
}

const loader = new GLTFLoader();

export async function createProjectileRenderer(
  scene: THREE.Scene,
  weapon: WeaponRecipe = getCurrentWeapon(),
): Promise<ProjectileRenderer> {
  const gltf = await loader.loadAsync(weapon.bulletModelUrl);
  const template = gltf.scene;

  template.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
  const scale = weapon.bulletLength / Math.max(size.x, size.y, size.z);

  const authoredForward = new THREE.Vector3(
    weapon.bulletForwardAxis.x,
    weapon.bulletForwardAxis.y,
    weapon.bulletForwardAxis.z,
  ).normalize();

  const meshes = new Map<number, THREE.Object3D>();
  const direction = new THREE.Vector3();
  const rotation = new THREE.Quaternion();

  function update(): void {
    const seen = new Set<number>();

    for (const projectile of projectiles) {
      // Local shots are authoritative but invisible in first person — the foam
      // bullet mesh at the muzzle reads as an ugly red bloom in the view-model.
      if (projectile.ownerId === localPlayerId) continue;

      seen.add(projectile.id);

      let instance = meshes.get(projectile.id);
      if (!instance) {
        instance = template.clone(true);
        instance.scale.setScalar(scale);
        direction.set(projectile.direction.x, projectile.direction.y, projectile.direction.z);
        rotation.setFromUnitVectors(authoredForward, direction);
        instance.quaternion.copy(rotation);
        scene.add(instance);
        meshes.set(projectile.id, instance);
      }
      instance.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
    }

    for (const [id, mesh] of meshes) {
      if (!seen.has(id)) {
        scene.remove(mesh);
        meshes.delete(id);
      }
    }
  }

  function dispose(): void {
    for (const mesh of meshes.values()) {
      scene.remove(mesh);
    }
    meshes.clear();
  }

  return { update, dispose };
}