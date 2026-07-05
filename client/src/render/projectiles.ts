import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BULLET_FORWARD_AXIS, BULLET_LENGTH, BULLET_MODEL_URL } from "../config/weapons.ts";
import { projectiles } from "../state/world.ts";

export interface ProjectileRenderer {
  update(): void;
}

const loader = new GLTFLoader();

export async function createProjectileRenderer(scene: THREE.Scene): Promise<ProjectileRenderer> {
  const gltf = await loader.loadAsync(BULLET_MODEL_URL);
  const template = gltf.scene;

  template.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
  const scale = BULLET_LENGTH / Math.max(size.x, size.y, size.z);

  const authoredForward = new THREE.Vector3(
    BULLET_FORWARD_AXIS.x,
    BULLET_FORWARD_AXIS.y,
    BULLET_FORWARD_AXIS.z,
  ).normalize();

  const meshes = new Map<number, THREE.Object3D>();
  const direction = new THREE.Vector3();
  const rotation = new THREE.Quaternion();

  function update(): void {
    const seen = new Set<number>();

    for (const projectile of projectiles) {
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

  return { update };
}
