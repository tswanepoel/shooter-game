import { EYE_HEIGHT } from "./config/characters.ts";
import { initKeyboard } from "./input/keyboard.ts";
import { initMouse } from "./input/mouse.ts";
import { createScene } from "./render/scene.ts";
import { tickMovement } from "./sim/movement.ts";
import { localPlayer } from "./state/world.ts";

const MAX_DT = 0.1;

const { scene, camera, renderer } = createScene();

initKeyboard();
initMouse(renderer.domElement);

let lastTime = performance.now();

function tick(dt: number): void {
  tickMovement(dt);
}

function updateCamera(): void {
  camera.position.set(localPlayer.position.x, localPlayer.position.y + EYE_HEIGHT, localPlayer.position.z);
  camera.rotation.y = localPlayer.headYaw;
  camera.rotation.x = localPlayer.headPitch;
}

function loop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;

  tick(dt);
  updateCamera();
  renderer.render(scene, camera);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
