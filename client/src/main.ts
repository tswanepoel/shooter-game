import { createScene } from "./render/scene.ts";

const MAX_DT = 0.1;

const { scene, camera, renderer } = createScene();

let lastTime = performance.now();

function tick(dt: number): void {
  // input -> sim runs here once those modules exist
  void dt;
}

function loop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;

  tick(dt);
  renderer.render(scene, camera);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
