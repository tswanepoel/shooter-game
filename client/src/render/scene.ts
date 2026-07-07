import * as THREE from "three";
import { CAMERA_FOV } from "../config/physics.ts";
import { createAsphaltTexture, createTiledStandardMaterial } from "./proceduralTextures.ts";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Static meshes the weapon-line screen projection can snap onto. */
  aimOcclusionRoots: THREE.Object3D[];
}

const GROUND_SIZE = 200;
const FOG_COLOR = 0x9eb0c0;

export function createScene(): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 36, 78);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "none";
  document.body.appendChild(renderer.domElement);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    createTiledStandardMaterial(
      createAsphaltTexture(),
      0xffffff,
      GROUND_SIZE,
      GROUND_SIZE,
      0.88,
      0,
    ),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ambient = new THREE.AmbientLight(0xffffff, 0.52);
  scene.add(ambient);

  const fill = new THREE.HemisphereLight(0xb8cce8, 0x7a6f62, 0.38);
  scene.add(fill);

  const sun = new THREE.DirectionalLight(0xfff4e8, 1.22);
  sun.position.set(28, 52, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  const shadowSpan = 48;
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
  scene.add(sun);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, aimOcclusionRoots: [ground] };
}