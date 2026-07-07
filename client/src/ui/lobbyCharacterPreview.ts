import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getCharacterRecipe } from "../config/characters.ts";

const BLEND_RATE = 8;
const loader = new GLTFLoader();

let sharedRenderer: THREE.WebGLRenderer | undefined;
let renderPixelWidth = 0;
let renderPixelHeight = 0;

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

function placeOnGround(mesh: THREE.Object3D): void {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.x -= center.x;
  mesh.position.z -= center.z;
  mesh.position.y -= box.min.y;
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
  const fitHeightDistance = (frameHeight / 2) / halfFovTan;
  const fitWidthDistance = (frameWidth / 2) / (halfFovTan * aspect);
  const distance = Math.max(fitHeightDistance, fitWidthDistance) * padding;

  camera.position.set(subjectCenter.x, subjectCenter.y, subjectCenter.z + distance);
  camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
}

function frameMugshotCamera(
  camera: THREE.PerspectiveCamera,
  mesh: THREE.Object3D,
  aspect: number,
  padding: number,
): void {
  const head = mesh.getObjectByName("head");
  if (!head) throw new Error("missing head bone for lobby preview");

  mesh.updateMatrixWorld(true);
  head.updateMatrixWorld(true);

  const headBox = new THREE.Box3().setFromObject(head);
  const headSize = headBox.getSize(new THREE.Vector3());
  const headCenter = headBox.getCenter(new THREE.Vector3());

  const frameCenter = headCenter.clone();
  frameCenter.y -= headSize.y * 0.28;

  const frameWidth = headSize.x * 1.9;
  const frameHeight = headSize.y * 1.55;

  // Pan the look target left so the mugshot sits slightly right in the tile.
  const lookTarget = frameCenter.clone();
  lookTarget.x -= frameWidth * 0.055;
  frameCameraToBox(camera, frameCenter, lookTarget, frameWidth, frameHeight, aspect, padding);
}

export function beginLobbyPreviews(width: number, height: number): THREE.WebGLRenderer {
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

export function endLobbyPreviews(): void {
  sharedRenderer?.dispose();
  sharedRenderer = undefined;
}

export interface LobbyCharacterPreview {
  readonly canvas: HTMLCanvasElement;
  setIdleActive(active: boolean): void;
  update(dt: number, renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

export async function createLobbyCharacterPreview(
  characterId: string,
  width: number,
  height: number,
): Promise<LobbyCharacterPreview> {
  const character = getCharacterRecipe(characterId);
  const gltf = await loader.loadAsync(character.modelUrl);

  const dpr = Math.min(window.devicePixelRatio, 2);
  const pixelWidth = Math.floor(width * dpr);
  const pixelHeight = Math.floor(height * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  canvas.style.cssText = `display:block;width:${width}px;height:${height}px;pointer-events:none;`;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141820);

  const camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 20);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(1.2, 2.5, 2.8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8c8ff, 0.35);
  fill.position.set(-2, 1.2, 1.5);
  scene.add(fill);

  const mesh = gltf.scene;
  disableFrustumCulling(mesh);
  scaleToHeight(mesh, character.height);
  placeOnGround(mesh);
  mesh.rotation.y = 0;
  scene.add(mesh);

  frameMugshotCamera(camera, mesh, width / height, 1.2);

  const mixer = new THREE.AnimationMixer(mesh);
  const staticAction = mixer.clipAction(findClip(gltf.animations, "static"));
  const idleAction = mixer.clipAction(findClip(gltf.animations, "idle"));
  staticAction.play();
  idleAction.play();
  idleAction.setEffectiveWeight(0);

  let targetIdleWeight = 0;
  const blitContext = canvas.getContext("2d");
  if (!blitContext) throw new Error("2d canvas unavailable for lobby preview");

  return {
    canvas,
    setIdleActive(active: boolean): void {
      targetIdleWeight = active ? 1 : 0;
    },
    update(dt: number, renderer: THREE.WebGLRenderer): void {
      const idleWeight = approach(idleAction.getEffectiveWeight(), targetIdleWeight, dt);
      staticAction.setEffectiveWeight(1 - idleWeight);
      idleAction.setEffectiveWeight(idleWeight);
      mixer.update(dt);

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
      mixer.stopAllAction();
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