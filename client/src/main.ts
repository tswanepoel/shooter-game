import { bus } from "./bus.ts";
import { getActiveCharacter } from "./state/character.ts";
import { POS_BROADCAST_INTERVAL } from "./config/network.ts";
import { initForfeit, tickForfeit } from "./input/forfeit.ts";
import { initKeyboard } from "./input/keyboard.ts";
import { initLoadoutMenu } from "./input/loadoutMenu.ts";
import { initMouse } from "./input/mouse.ts";
import { bindPointerLockTarget } from "./input/pointerLock.ts";
import { connectSpectator, sendPosition } from "./net/connection.ts";
import { createCrosshair } from "./render/crosshair.ts";
import {
  createPlayerSceneManager,
  getAimOcclusionRoots,
  getCharacterHitRoots,
} from "./render/players.ts";
import { createProjectileRenderer, type ProjectileRenderer } from "./render/projectiles.ts";
import { buildShipment } from "./render/shipment.ts";
import { createScene } from "./render/scene.ts";

import { bindLocalWeaponMuzzleLineSampler } from "./sim/aimDirection.ts";
import { tickAimCascade } from "./sim/aimCascade.ts";
import { initCombatFeedback, tickCombatFeedback } from "./sim/combatFeedback.ts";
import { initHealth } from "./sim/health.ts";
import { initMovement, tickMovement } from "./sim/movement.ts";
import {
  advanceProjectiles,
  bindProjectileEyeSampler,
  initProjectiles,
  tickProjectileFire,
} from "./sim/projectiles.ts";
import { initRemoteSync, tickRemoteSync } from "./sim/remoteSync.ts";
import { initWorldSync } from "./state/worldSync.ts";
import {
  getActiveSlot,
  getActiveWeapon,
  getActiveWeaponId,
  toggleActiveSlot,
} from "./state/loadout.ts";
import { localPlayer } from "./state/world.ts";
import { createDamageOverlay } from "./ui/damageOverlay.ts";
import { createDeathOverlay } from "./ui/deathOverlay.ts";
import { showLobby } from "./ui/lobby.ts";
import { createHitMarker } from "./ui/hitMarker.ts";
import { createKillFeed } from "./ui/killFeed.ts";
import { createWeaponHud } from "./ui/weaponHud.ts";

const MAX_DT = 0.1;

const { scene, camera, renderer, aimOcclusionRoots: worldAimOcclusionRoots } = createScene();
bindPointerLockTarget(renderer.domElement);

const shipment = buildShipment(scene);
worldAimOcclusionRoots.push(...shipment.occlusionRoots);
const worldHitRoots = shipment.hitRoots;

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
bindProjectileEyeSampler(playerScene.sampleEyeWorldPosition);
bindLocalWeaponMuzzleLineSampler(playerScene.sampleLocalWeaponMuzzleLine);

initWorldSync();
initMovement();
initProjectiles();
initRemoteSync();
initHealth();
initCombatFeedback(hitMarker, damageOverlay);
initForfeit();
initLoadoutMenu();

let lastTime = performance.now();
let posBroadcastElapsed = 0;
let assetLoadGeneration = 0;

function refreshWeaponHud(): void {
  weaponHud.update(getActiveSlot(), getActiveWeaponId());
}

async function loadLocalPlayerAssets(): Promise<void> {
  const generation = ++assetLoadGeneration;
  const character = getActiveCharacter();
  const weapon = getActiveWeapon();

  await playerScene.loadLocal(character, weapon ?? null);
  if (generation !== assetLoadGeneration) return;

  refreshWeaponHud();

  const bulletModelUrl = weapon?.bulletModelUrl;
  if (bulletModelUrl && bulletModelUrl !== currentBulletModelUrl) {
    projectileRenderer?.dispose();
    projectileRenderer = await createProjectileRenderer(scene, weapon);
    currentBulletModelUrl = bulletModelUrl;
  } else if (!bulletModelUrl) {
    projectileRenderer?.dispose();
    projectileRenderer = undefined;
    currentBulletModelUrl = undefined;
  }
}

bus.on("weaponSlotToggled", () => {
  if (!gameStarted || !localPlayer.alive) return;
  toggleActiveSlot();
  refreshWeaponHud();
  bus.emit("weaponSwitched", { activeSlot: getActiveSlot() });
  void loadLocalPlayerAssets().catch((error) => {
    console.error("weapon slot swap failed", error);
  });
});

bus.on("loadoutCommitted", () => {
  if (!gameStarted) return;
  refreshWeaponHud();
  void loadLocalPlayerAssets().catch((error) => {
    console.error("loadout apply failed", error);
  });
});

function tick(dt: number): void {
  tickForfeit();
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
    advanceProjectiles(dt, [...getCharacterHitRoots(), ...worldHitRoots]);
    const aimOcclusionRoots = getAimOcclusionRoots(worldAimOcclusionRoots);
    crosshair.update(camera, aimOcclusionRoots);
    tickCombatFeedback(dt, camera, hitMarker, damageOverlay, aimOcclusionRoots);
    deathOverlay.update();
    killFeed.tick(dt);
    projectileRenderer?.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

bus.on("joinSpawnClicked", () => {
  renderer.domElement.style.display = "block";
});

function enterGame(): void {
  initKeyboard();
  initMouse(renderer.domElement);
  playerScene.applyCamera(camera);
  renderer.domElement.style.display = "block";
  gameStarted = true;
  refreshWeaponHud();
  void loadLocalPlayerAssets().catch((error) => {
    console.error("failed to load player assets", error);
  });
}

connectSpectator();

showLobby(() => {
  enterGame();
});

requestAnimationFrame(loop);