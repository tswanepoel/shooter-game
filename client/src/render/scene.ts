import * as THREE from "three";
import { CAMERA_FOV } from "../config/physics.ts";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Static meshes the weapon-line screen projection can snap onto. */
  aimOcclusionRoots: THREE.Object3D[];
}

export function createScene(): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

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
  renderer.domElement.style.display = "none";
  document.body.appendChild(renderer.domElement);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x3a5f3a }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new THREE.GridHelper(200, 40, 0x1f2f1f, 0x1f2f1f);
  grid.position.y = 0.01;
  scene.add(grid);

  const skyGrid = new THREE.GridHelper(200, 40, 0xffe8a8, 0xd4b870);
  skyGrid.position.y = 60;
  scene.add(skyGrid);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(50, 100, 25);
  scene.add(sun);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, aimOcclusionRoots: [ground] };
}
