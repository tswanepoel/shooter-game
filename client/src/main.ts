import { EYE_HEIGHT } from "./config/characters.ts";
import { initKeyboard } from "./input/keyboard.ts";
import { initMouse } from "./input/mouse.ts";
import { connect } from "./net/connection.ts";
import { createCrosshair } from "./render/crosshair.ts";
import { createProjectileRenderer, type ProjectileRenderer } from "./render/projectiles.ts";
import { type CharacterInstance, type LocomotionState, loadCharacterWithWeapon } from "./render/remotePlayers.ts";
import { createScene } from "./render/scene.ts";
import { loadWeaponViewModel, type WeaponViewModel } from "./render/weaponView.ts";
import { tickAimCascade } from "./sim/aimCascade.ts";
import { tickMovement } from "./sim/movement.ts";
import { tickProjectiles } from "./sim/projectiles.ts";
import { localPlayer } from "./state/world.ts";

const MAX_DT = 0.1;
const LOCOMOTION_PREVIEW_CYCLE: LocomotionState[] = ["idle", "walk", "sprint"];
const LOCOMOTION_PREVIEW_INTERVAL = 3;

const { scene, camera, renderer } = createScene();

initKeyboard();
initMouse(renderer.domElement);
connect();

const crosshair = createCrosshair();

let projectileRenderer: ProjectileRenderer | undefined;
createProjectileRenderer(scene).then((instance) => {
  projectileRenderer = instance;
});

let weaponView: WeaponViewModel | undefined;
loadWeaponViewModel(camera).then((instance) => {
  weaponView = instance;
});

let previewCharacter: CharacterInstance | undefined;
let previewElapsed = 0;
let previewIndex = 0;

loadCharacterWithWeapon().then((instance) => {
  instance.object.position.set(0, 0, -4);
  scene.add(instance.object);
  previewCharacter = instance;
});

let lastTime = performance.now();

function tick(dt: number): void {
  tickMovement(dt);
  tickAimCascade(dt);
  tickProjectiles(dt);
  tickLocomotionPreview(dt);
}

function tickLocomotionPreview(dt: number): void {
  if (!previewCharacter) return;

  previewElapsed += dt;
  if (previewElapsed >= LOCOMOTION_PREVIEW_INTERVAL) {
    previewElapsed = 0;
    previewIndex = (previewIndex + 1) % LOCOMOTION_PREVIEW_CYCLE.length;
    previewCharacter.setLocomotion(LOCOMOTION_PREVIEW_CYCLE[previewIndex]);
  }

  previewCharacter.update(dt);
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
  renderer.render(scene, camera);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
