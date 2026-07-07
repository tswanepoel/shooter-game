import { bus } from "./bus.ts";
import { getCurrentCharacter } from "./config/characters.ts";
import { cycleWeaponId, getCurrentWeapon, getCurrentWeaponId } from "./config/weapons.ts";
import { POS_BROADCAST_INTERVAL } from "./config/network.ts";
import { initKeyboard } from "./input/keyboard.ts";
import { initMouse } from "./input/mouse.ts";
import { connectSpectator, sendPosition } from "./net/connection.ts";
import { createCrosshair } from "./render/crosshair.ts";
import {
  createPlayerSceneManager,
  getAimOcclusionRoots,
  getCharacterHitRoots,
} from "./render/players.ts";
import { createProjectileRenderer, type ProjectileRenderer } from "./render/projectiles.ts";
import { createScene } from "./render/scene.ts";
import { bindLocalWeaponMuzzleLineSampler } from "./sim/aimDirection.ts";
import { tickAimCascade } from "./sim/aimCascade.ts";

import { initCombatFeedback, tickCombatFeedback } from "./sim/combatFeedback.ts";
import { initHealth } from "./sim/health.ts";
import { tickMovement } from "./sim/movement.ts";
import { advanceProjectiles, bindProjectileEyeSampler, tickProjectileFire } from "./sim/projectiles.ts";
import { tickRemoteSync } from "./sim/remoteSync.ts";
import { localPlayer, localPlayerId } from "./state/world.ts";
import { createDamageOverlay } from "./ui/damageOverlay.ts";
import { createDeathOverlay } from "./ui/deathOverlay.ts";
import { showLobby } from "./ui/lobby.ts";
import { createHitMarker } from "./ui/hitMarker.ts";
import { createKillFeed } from "./ui/killFeed.ts";
import { createDevTools } from "./ui/devTools.ts";
import { createWeaponHud } from "./ui/weaponHud.ts";

const MAX_DT = 0.1;

const { scene, camera, renderer, aimOcclusionRoots: worldAimOcclusionRoots } = createScene();

let projectileRenderer: ProjectileRenderer | undefined;
let currentBulletModelUrl: string | undefined;

const crosshair = createCrosshair(scene);
const hitMarker = createHitMarker();
const damageOverlay = createDamageOverlay();
const weaponHud = createWeaponHud();
const killFeed = createKillFeed();
const deathOverlay = createDeathOverlay();
let gameStarted = false;
const playerScene = createPlayerSceneManager(scene);
const devTools = createDevTools({
  scene,
  camera,
  renderer,
  sampleEyeWorldPosition(out) {
    if (!localPlayerId) return false;
    return playerScene.sampleEyeWorldPosition(localPlayerId, out);
  },
  getViewerYaw: () => localPlayer.targetYaw,
  isActive: () => gameStarted,
});
bindProjectileEyeSampler(playerScene.sampleEyeWorldPosition);
bindLocalWeaponMuzzleLineSampler(playerScene.sampleLocalWeaponMuzzleLine);

initHealth();
initCombatFeedback(hitMarker, damageOverlay);

let lastTime = performance.now();
let posBroadcastElapsed = 0;
let assetLoadGeneration = 0;

async function loadLocalPlayerAssets(): Promise<void> {
  const generation = ++assetLoadGeneration;
  const character = getCurrentCharacter();
  const weapon = getCurrentWeapon();

  await playerScene.loadLocal(character, weapon);
  if (generation !== assetLoadGeneration) return;

  weaponHud.update(weapon.id);

  if (weapon.bulletModelUrl !== currentBulletModelUrl) {
    projectileRenderer?.dispose();
    projectileRenderer = await createProjectileRenderer(scene, weapon);
    currentBulletModelUrl = weapon.bulletModelUrl;
  }
}

bus.on("weaponCycleRequested", () => {
  if (!gameStarted) return;
  const weaponId = cycleWeaponId();
  bus.emit("weaponSwitched", { weaponId });
  void loadLocalPlayerAssets().catch((error) => {
    console.error("weapon swap failed", error);
  });
});

function tick(dt: number): void {
  tickMovement(dt);
  tickAimCascade(dt);
  playerScene.update(dt);
  playerScene.applyCamera(camera);
  tickProjectileFire(dt, camera);
  tickRemoteSync(dt);
  tickPosBroadcast(dt);
}

function tickPosBroadcast(dt: number): void {
  posBroadcastElapsed += dt;
  if (posBroadcastElapsed < POS_BROADCAST_INTERVAL) return;
  posBroadcastElapsed = 0;
  sendPosition(localPlayer.position, localPlayer.targetYaw, localPlayer.targetPitch);
}

function loop(now: number): void {
  const dt = gameStarted ? Math.min((now - lastTime) / 1000, MAX_DT) : 0;
  lastTime = now;

  if (gameStarted) {
    tick(dt);
    devTools.tick(dt);
    const aimOcclusionRoots = getAimOcclusionRoots(worldAimOcclusionRoots);
    crosshair.update(camera, aimOcclusionRoots);
    tickCombatFeedback(dt, camera, hitMarker, damageOverlay, aimOcclusionRoots);
    deathOverlay.update();
    killFeed.tick(dt);
    projectileRenderer?.update();
    advanceProjectiles(dt, getCharacterHitRoots());
  }

  if (gameStarted) {
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

function enterGame(): void {
  initKeyboard();
  initMouse(renderer.domElement);
  playerScene.applyCamera(camera);
  renderer.domElement.style.display = "block";
  gameStarted = true;
  weaponHud.update(getCurrentWeaponId());
  void loadLocalPlayerAssets().catch((error) => {
    console.error("failed to load player assets", error);
  });
}

connectSpectator();

showLobby(() => {
  enterGame();
});

requestAnimationFrame(loop);