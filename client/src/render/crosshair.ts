import * as THREE from "three";
import { CROSSHAIR } from "../config/feedback.ts";
import { getCurrentWeapon } from "../sim/activeWeapon.ts";
import { localPlayer } from "../state/world.ts";
import { computeAimRay } from "../sim/aimDirection.ts";
import { computeWeaponAimWorldPoint } from "../ui/aimScreen.ts";

export interface Crosshair {
  update(camera: THREE.Camera, occlusionRoots: readonly THREE.Object3D[]): void;
  dispose(): void;
}

const TEXTURE_SIZE = 64;

function createCrosshairTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  const center = TEXTURE_SIZE / 2;
  const outerRadius = center - 1;
  const innerRadius = Math.max(outerRadius - CROSSHAIR.outlinePx * 2, 1);

  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function scaleSpriteToScreenPixels(
  sprite: THREE.Sprite,
  camera: THREE.PerspectiveCamera,
  worldPosition: THREE.Vector3,
  pixelDiameter: number,
): void {
  const distance = worldPosition.distanceTo(camera.position);
  const vFov = (camera.fov * Math.PI) / 180;
  const worldHeight = 2 * Math.tan(vFov / 2) * distance;
  const worldSize = (pixelDiameter / window.innerHeight) * worldHeight;
  sprite.scale.set(worldSize, worldSize, 1);
}

export function createCrosshair(scene: THREE.Scene): Crosshair {
  const texture = createCrosshairTexture();
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

  const sprite = new THREE.Sprite(material);
  sprite.frustumCulled = false;
  sprite.renderOrder = 2;
  scene.add(sprite);

  const muzzleOrigin = new THREE.Vector3();
  const weaponDirection = new THREE.Vector3();
  const aimPoint = new THREE.Vector3();

  function update(camera: THREE.Camera, occlusionRoots: readonly THREE.Object3D[]): void {
    if (!localPlayer.alive || !getCurrentWeapon()) {
      sprite.visible = false;
      return;
    }

    computeAimRay(muzzleOrigin, weaponDirection, camera);
    sprite.visible = computeWeaponAimWorldPoint(
      muzzleOrigin,
      weaponDirection,
      camera,
      occlusionRoots,
      aimPoint,
    );
    if (!sprite.visible) return;

    sprite.position.copy(aimPoint);
    scaleSpriteToScreenPixels(
      sprite,
      camera as THREE.PerspectiveCamera,
      aimPoint,
      CROSSHAIR.sizePx,
    );
  }

  function dispose(): void {
    texture.dispose();
    material.dispose();
    scene.remove(sprite);
  }

  return { update, dispose };
}