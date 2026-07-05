import { EYE_HEIGHT } from "./config/characters.ts";
import { POS_BROADCAST_INTERVAL } from "./config/network.ts";
import { initKeyboard } from "./input/keyboard.ts";
import { initMouse } from "./input/mouse.ts";
import { connect, sendPosition } from "./net/connection.ts";
import { createCrosshair } from "./render/crosshair.ts";
import { createProjectileRenderer, type ProjectileRenderer } from "./render/projectiles.ts";
import { createRemotePlayerManager } from "./render/remotePlayers.ts";
import { createScene } from "./render/scene.ts";
import { loadWeaponViewModel, type WeaponViewModel } from "./render/weaponView.ts";
import { tickAimCascade } from "./sim/aimCascade.ts";
import { tickMovement } from "./sim/movement.ts";
import { tickProjectiles } from "./sim/projectiles.ts";
import { tickRemoteSync } from "./sim/remoteSync.ts";
import { localPlayer } from "./state/world.ts";

const MAX_DT = 0.1;

const { scene, camera, renderer } = createScene();

initKeyboard();
initMouse(renderer.domElement);
connect();

const crosshair = createCrosshair();
const remotePlayerManager = createRemotePlayerManager(scene);

let projectileRenderer: ProjectileRenderer | undefined;
createProjectileRenderer(scene).then((instance) => {
  projectileRenderer = instance;
});

let weaponView: WeaponViewModel | undefined;
loadWeaponViewModel(camera).then((instance) => {
  weaponView = instance;
});

let lastTime = performance.now();
let posBroadcastElapsed = 0;

function tick(dt: number): void {
  tickMovement(dt);
  tickAimCascade(dt);
  tickProjectiles(dt);
  tickRemoteSync(dt);
  tickPosBroadcast(dt);
}

function tickPosBroadcast(dt: number): void {
  posBroadcastElapsed += dt;
  if (posBroadcastElapsed < POS_BROADCAST_INTERVAL) return;
  posBroadcastElapsed = 0;
  sendPosition(localPlayer.position, localPlayer.headYaw, localPlayer.headPitch);
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
  weaponView?.update(dt);
  crosshair.update(camera);
  projectileRenderer?.update();
  remotePlayerManager.update(dt);
  renderer.render(scene, camera);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
