import * as THREE from "three";
import { buildShipmentBoxes, type BoxSpec } from "../config/shipment.ts";
import {
  createConcreteTexture,
  createCorrugatedTexture,
  createPlankTexture,
  createPlatformTexture,
  createTiledStandardMaterial,
} from "./proceduralTextures.ts";

export interface ShipmentScene {
  readonly root: THREE.Group;
  readonly occlusionRoots: readonly THREE.Object3D[];
  readonly hitRoots: readonly THREE.Object3D[];
}

interface SurfaceTextures {
  readonly container: THREE.CanvasTexture;
  readonly crate: THREE.CanvasTexture;
  readonly wall: THREE.CanvasTexture;
  readonly platform: THREE.CanvasTexture;
}

function createBoxMaterials(spec: BoxSpec, textures: SurfaceTextures): THREE.MeshStandardMaterial[] {
  const { roughness, metalness } = surfacePbr(spec.surface);
  const side = createTiledStandardMaterial(
    textureForSurface(spec.surface, textures),
    spec.color,
    spec.width,
    spec.height,
    roughness,
    metalness,
  );
  const top = side.clone();
  top.color = top.color.clone().multiplyScalar(1.18);
  return [side, side, top, side, side, side];
}

function textureForSurface(surface: BoxSpec["surface"], textures: SurfaceTextures): THREE.CanvasTexture {
  switch (surface) {
    case "container":
      return textures.container;
    case "crate":
      return textures.crate;
    case "wall":
      return textures.wall;
    case "platform":
      return textures.platform;
  }
}

function surfacePbr(surface: BoxSpec["surface"]): { roughness: number; metalness: number } {
  switch (surface) {
    case "container":
      return { roughness: 0.72, metalness: 0.22 };
    case "crate":
      return { roughness: 0.9, metalness: 0 };
    case "wall":
      return { roughness: 0.92, metalness: 0 };
    case "platform":
      return { roughness: 0.78, metalness: 0.35 };
  }
}

export function buildShipment(scene: THREE.Scene): ShipmentScene {
  const root = new THREE.Group();
  root.name = "shipment";
  scene.add(root);

  const textures: SurfaceTextures = {
    container: createCorrugatedTexture(),
    crate: createPlankTexture(),
    wall: createConcreteTexture(),
    platform: createPlatformTexture(),
  };

  const occlusionRoots: THREE.Object3D[] = [];
  const hitRoots: THREE.Object3D[] = [];

  for (const spec of buildShipmentBoxes()) {
    const geometry = new THREE.BoxGeometry(spec.width, spec.height, spec.depth);
    const mesh = new THREE.Mesh(geometry, createBoxMaterials(spec, textures));
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.rotation.y = ((spec.yaw ?? 0) * Math.PI) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isWorldCollider = true;
    root.add(mesh);
    occlusionRoots.push(mesh);
    hitRoots.push(mesh);
  }

  return { root, occlusionRoots, hitRoots };
}