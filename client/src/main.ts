import { bus } from "./bus.ts";
import { getCurrentCharacter, setCurrentCharacterId } from "./config/characters.ts";
import { cycleWeaponId, getCurrentWeapon, getCurrentWeaponId } from "./config/weapons.ts";
import { POS_BROADCAST_INTERVAL } from "./config/network.ts";
import { initKeyboard } from "./input/keyboard.ts";
import { initMouse } from "./input/mouse.ts";
import { connect, sendPosition } from "./net/connection.ts";
import { createCrosshair } from "./render/crosshair.ts";
import { createPlayerSceneManager, getCharacterHitRoots } from "./render/players.ts";
import { createProjectileRenderer, type ProjectileRenderer } from "./render/projectiles.ts";
import { createScene } from "./render/scene.ts";
import { bindLocalWeaponAimSampler } from "./sim/aimDirection.ts";
import { tickAimCascade } from "./sim/aimCascade.ts";

import { initCombatFeedback, tickCombatFeedback } from "./sim/combatFeedback.ts";
import { tickCameraEffects } from "./sim/cameraEffects.ts";
import { initHealth } from "./sim/health.ts";
import { tickMovement } from "./sim/movement.ts";
import { advanceProjectiles, bindProjectileEyeSampler, tickProjectileFire } from "./sim/projectiles.ts";
import { tickRemoteSync } from "./sim/remoteSync.ts";
import { localPlayer } from "./state/world.ts";
import { createDamageOverlay } from "./ui/damageOverlay.ts";
import { createDeathOverlay } from "./ui/deathOverlay.ts";
import { showLobby } from "./ui/lobby.ts";
import { createHitMarker } from "./ui/hitMarker.ts";
import { createKillFeed } from "./ui/killFeed.ts";
import { createWeaponHud } from "./ui/weaponHud.ts";

const MAX_DT = 0.1;

const { scene, camera, renderer } = createScene();

let projectileRenderer: ProjectileRenderer | undefined;
let currentBulletModelUrl: string | undefined;

const crosshair = createCrosshair();
const hitMarker = createHitMarker();
const damageOverlay = createDamageOverlay();
const weaponHud = createWeaponHud();
const killFeed = createKillFeed();
const deathOverlay = createDeathOverlay();
const playerScene = createPlayerSceneManager(scene);
bindProjectileEyeSampler(playerScene.sampleEyeWorldPosition);
bindLocalWeaponAimSampler(playerScene.sampleLocalWeaponAimDirection);

initHealth();
initCombatFeedback(hitMarker, damageOverlay);

let lastTime = performance.now();
let posBroadcastElapsed = 0;
let gameStarted = false;
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
  playerScene.applyCamera(camera, tickCameraEffects(dt));
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
    crosshair.update(camera);
    tickCombatFeedback(dt, camera, hitMarker, damageOverlay);
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

function showConnectingOverlay(): () => void {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "background:#000",
    "color:#888",
    "font-family:system-ui,sans-serif",
    "font-size:0.95rem",
    "z-index:100",
  ].join(";");
  overlay.textContent = "Connecting…";
  document.body.appendChild(overlay);
  return () => overlay.remove();
}

function startGame(characterId: string): void {
  setCurrentCharacterId(characterId);
  const dismissConnecting = showConnectingOverlay();

  bus.on("welcomed", (message) => {
    console.log("joined as", message.characterId);
    dismissConnecting();
    playerScene.applyCamera(camera, { pitch: 0, yaw: 0, bobY: 0 });
    renderer.domElement.style.display = "block";
    gameStarted = true;
    void loadLocalPlayerAssets().catch((error) => {
      console.error("failed to load player assets", error);
    });
  });

  initKeyboard();
  initMouse(renderer.domElement);
  connect(characterId);

  weaponHud.update(getCurrentWeaponId());
}

showLobby((characterId) => {
  startGame(characterId);
});

requestAnimationFrame(loop);