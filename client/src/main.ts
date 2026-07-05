import { bus } from "./bus.ts";
import { getCurrentCharacter, setCurrentCharacterId } from "./config/characters.ts";
import { cycleWeaponId, getCurrentWeapon, getCurrentWeaponId } from "./config/weapons.ts";
import { POS_BROADCAST_INTERVAL } from "./config/network.ts";
import { initKeyboard } from "./input/keyboard.ts";
import { initMouse } from "./input/mouse.ts";
import { connect, sendPosition } from "./net/connection.ts";
import { createCrosshair } from "./render/crosshair.ts";
import { createProjectileRenderer, type ProjectileRenderer } from "./render/projectiles.ts";
import { createRemotePlayerManager, getCharacterHitRoots } from "./render/remotePlayers.ts";
import { createScene } from "./render/scene.ts";
import { loadWeaponViewModel, type WeaponViewModel } from "./render/weaponView.ts";
import { tickAimCascade, viewPitch } from "./sim/aimCascade.ts";
import { initCombatFeedback, tickCombatFeedback } from "./sim/combatFeedback.ts";
import { tickCameraEffects, type CameraEffectOffsets } from "./sim/cameraEffects.ts";
import { initHealth } from "./sim/health.ts";
import { tickMovement } from "./sim/movement.ts";
import { advanceProjectiles, tickProjectileFire } from "./sim/projectiles.ts";
import { tickRemoteSync } from "./sim/remoteSync.ts";
import { localPlayer } from "./state/world.ts";
import { createDamageIndicator } from "./ui/damageIndicator.ts";
import { showLobby } from "./ui/lobby.ts";
import { createAimDebugHud } from "./ui/aimDebugHud.ts";
import { createHitMarker } from "./ui/hitMarker.ts";
import { createWeaponHud } from "./ui/weaponHud.ts";

const MAX_DT = 0.1;

const { scene, camera, renderer } = createScene();

let weaponView: WeaponViewModel | undefined;
let projectileRenderer: ProjectileRenderer | undefined;
let currentBulletModelUrl: string | undefined;

const crosshair = createCrosshair();
const hitMarker = createHitMarker();
const damageIndicator = createDamageIndicator();
const weaponHud = createWeaponHud();
const aimDebugHud = createAimDebugHud();
const remotePlayerManager = createRemotePlayerManager(scene);

initHealth();
initCombatFeedback(hitMarker, damageIndicator);

let lastTime = performance.now();
let posBroadcastElapsed = 0;
let gameStarted = false;
let weaponLoadGeneration = 0;

async function loadLocalWeaponAssets(): Promise<void> {
  const generation = ++weaponLoadGeneration;
  const weapon = getCurrentWeapon();
  const previousView = weaponView;
  const view = await loadWeaponViewModel(camera, weapon);

  if (generation !== weaponLoadGeneration) {
    view.dispose();
    return;
  }

  previousView?.dispose();
  weaponView = view;
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
  void loadLocalWeaponAssets().catch((error) => {
    console.error("weapon swap failed", error);
  });
});

function tick(dt: number): CameraEffectOffsets {
  tickMovement(dt);
  tickAimCascade(dt);
  const effects = tickCameraEffects(dt);
  updateCamera(effects);
  tickProjectileFire(dt, camera);
  tickRemoteSync(dt);
  tickPosBroadcast(dt);
  return effects;
}

function tickPosBroadcast(dt: number): void {
  posBroadcastElapsed += dt;
  if (posBroadcastElapsed < POS_BROADCAST_INTERVAL) return;
  posBroadcastElapsed = 0;
  sendPosition(localPlayer.position, localPlayer.targetYaw, localPlayer.targetPitch);
}

function updateCamera(effects: CameraEffectOffsets = { pitch: 0, yaw: 0, bobY: 0 }): void {
  camera.position.set(
    localPlayer.position.x,
    localPlayer.position.y + getCurrentCharacter().eyeHeight + effects.bobY,
    localPlayer.position.z,
  );
  camera.rotation.y = localPlayer.targetYaw + effects.yaw;
  camera.rotation.x = viewPitch(localPlayer) + effects.pitch;
}

function loop(now: number): void {
  const dt = gameStarted ? Math.min((now - lastTime) / 1000, MAX_DT) : 0;
  lastTime = now;

  if (gameStarted) {
    tick(dt);
    weaponView?.update(dt);
    crosshair.update(camera);
    tickCombatFeedback(dt, hitMarker, damageIndicator);
    projectileRenderer?.update();
    remotePlayerManager.update(dt);
    advanceProjectiles(dt, getCharacterHitRoots());
    aimDebugHud.update(localPlayer);
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
    updateCamera();
    renderer.domElement.style.display = "block";
    gameStarted = true;
    aimDebugHud.setVisible(true);
    void loadLocalWeaponAssets().catch((error) => {
      console.error("failed to load weapon assets", error);
    });
  });

  initKeyboard();
  initMouse(renderer.domElement);
  connect(characterId);

  // Begin loading the view-model while the socket connects so it is ready at spawn.
  weaponHud.update(getCurrentWeaponId());
  void loadLocalWeaponAssets().catch((error) => {
    console.error("failed to preload weapon assets", error);
  });
}

showLobby((characterId) => {
  startGame(characterId);
});

requestAnimationFrame(loop);