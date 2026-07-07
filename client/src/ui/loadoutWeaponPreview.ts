import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getWeaponRecipe, WEAPON_IDS, type WeaponRecipe } from "../config/weapons.ts";
import { orientWeaponForHeld } from "../render/weaponMesh.ts";

const SPIN_RATE = 0.55;
const loader = new GLTFLoader();

let sharedRenderer: THREE.WebGLRenderer | undefined;
let renderPixelWidth = 0;
let renderPixelHeight = 0;

const gltfCache = new Map<string, Promise<GLTF>>();

interface PreviewReferenceFrame {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly lookY: number;
}

let previewReferenceFrame: PreviewReferenceFrame | undefined;
let previewReferencePromise: Promise<PreviewReferenceFrame> | undefined;

async function ensurePreviewReferenceFrame(): Promise<PreviewReferenceFrame> {
  if (previewReferenceFrame) return previewReferenceFrame;
  previewReferencePromise ??= computePreviewReferenceFrame();
  previewReferenceFrame = await previewReferencePromise;
  return previewReferenceFrame;
}

async function computePreviewReferenceFrame(): Promise<PreviewReferenceFrame> {
  let maxWidth = 0;
  let maxHeight = 0;

  for (const weaponId of WEAPON_IDS) {
    const recipe = getWeaponRecipe(weaponId);
    const gltf = await loadWeaponGltf(recipe.modelUrl);
    const mesh = gltf.scene.clone(true);
    orientWeaponForSidePreview(mesh, recipe);
    mesh.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    maxWidth = Math.max(maxWidth, size.x);
    maxHeight = Math.max(maxHeight, size.y);
  }

  return {
    frameWidth: maxWidth * 1.2,
    frameHeight: maxHeight * 1.15,
    lookY: maxHeight * 0.42,
  };
}

function loadWeaponGltf(modelUrl: string): Promise<GLTF> {
  const cached = gltfCache.get(modelUrl);
  if (cached) return cached;
  const pending = loader.loadAsync(modelUrl);
  gltfCache.set(modelUrl, pending);
  return pending;
}

function disableFrustumCulling(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) node.frustumCulled = false;
  });
}

function frameCameraToBox(
  camera: THREE.PerspectiveCamera,
  subjectCenter: THREE.Vector3,
  lookTarget: THREE.Vector3,
  frameWidth: number,
  frameHeight: number,
  aspect: number,
  padding: number,
): void {
  const fovRad = (camera.fov * Math.PI) / 180;
  const halfFovTan = Math.tan(fovRad / 2);
  const fitHeightDistance = frameHeight / 2 / halfFovTan;
  const fitWidthDistance = frameWidth / 2 / (halfFovTan * aspect);
  const distance = Math.max(fitHeightDistance, fitWidthDistance) * padding;

  camera.position.set(subjectCenter.x, subjectCenter.y, subjectCenter.z + distance);
  camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
}

function orientWeaponForSidePreview(mesh: THREE.Object3D, recipe: WeaponRecipe): void {
  orientWeaponForHeld(mesh, recipe);
  mesh.rotateZ(-Math.PI / 2);
  mesh.rotateX(Math.PI / 2);
}

function frameSideProfileCamera(
  camera: THREE.PerspectiveCamera,
  mesh: THREE.Object3D,
  aspect: number,
  padding: number,
  reference: PreviewReferenceFrame,
): void {
  mesh.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  mesh.position.sub(center);
  mesh.updateMatrixWorld(true);

  const frameCenter = new THREE.Vector3(0, reference.lookY, 0);
  frameCameraToBox(
    camera,
    frameCenter,
    frameCenter,
    reference.frameWidth,
    reference.frameHeight,
    aspect,
    padding,
  );
}

export function beginLoadoutPreviews(width: number, height: number): THREE.WebGLRenderer {
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderPixelWidth = Math.floor(width * dpr);
  renderPixelHeight = Math.floor(height * dpr);

  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    sharedRenderer.setPixelRatio(1);
  }
  sharedRenderer.setSize(renderPixelWidth, renderPixelHeight, false);
  return sharedRenderer;
}

export function endLoadoutPreviews(): void {
  sharedRenderer?.dispose();
  sharedRenderer = undefined;
}

export interface LoadoutWeaponPreview {
  readonly canvas: HTMLCanvasElement;
  setSpinActive(active: boolean): void;
  update(dt: number, renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

export async function createLoadoutWeaponPreview(
  weaponId: string,
  width: number,
  height: number,
): Promise<LoadoutWeaponPreview> {
  const [recipe, reference] = await Promise.all([
    Promise.resolve(getWeaponRecipe(weaponId)),
    ensurePreviewReferenceFrame(),
  ]);
  const gltf = await loadWeaponGltf(recipe.modelUrl);

  const dpr = Math.min(window.devicePixelRatio, 2);
  const pixelWidth = Math.floor(width * dpr);
  const pixelHeight = Math.floor(height * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  canvas.style.cssText = `display:block;width:100%;height:${height}px;pointer-events:none;`;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141820);

  const camera = new THREE.PerspectiveCamera(28, width / height, 0.05, 20);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.92);
  key.position.set(0.6, 2.4, 3.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8c8ff, 0.42);
  fill.position.set(-2.4, 0.6, 1.2);
  scene.add(fill);

  const pivot = new THREE.Group();
  const mesh = gltf.scene.clone(true);
  disableFrustumCulling(mesh);
  orientWeaponForSidePreview(mesh, recipe);
  pivot.add(mesh);
  scene.add(pivot);

  frameSideProfileCamera(camera, pivot, width / height, 0.9, reference);

  const blitContext = canvas.getContext("2d");
  if (!blitContext) throw new Error("2d canvas unavailable for loadout weapon preview");

  let spinActive = false;

  return {
    canvas,
    setSpinActive(active: boolean): void {
      spinActive = active;
      if (!active) pivot.rotation.y = 0;
    },
    update(dt: number, renderer: THREE.WebGLRenderer): void {
      if (spinActive) pivot.rotation.y += dt * SPIN_RATE;
      renderer.render(scene, camera);
      blitContext.drawImage(
        renderer.domElement,
        0,
        0,
        renderPixelWidth,
        renderPixelHeight,
        0,
        0,
        pixelWidth,
        pixelHeight,
      );
    },
    dispose(): void {
      mesh.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          for (const material of materials) material.dispose();
        }
      });
    },
  };
}