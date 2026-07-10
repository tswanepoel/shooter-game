import * as THREE from "three";
import { bus } from "./bus.ts";
import { getActiveCharacter } from "./state/character.ts";
import { initLoadoutMenu } from "./input/loadoutMenu.ts";
import { initMouse } from "./input/mouse.ts";
import { bindPointerLockTarget } from "./input/pointerLock.ts";
import { sendPosition } from "./net/connection.ts";
import { createCrosshair } from "./render/crosshair.ts";
import {
  createPlayerSceneManager,
  getAimOcclusionRoots,
  getCharacterHitRoots,
} from "./render/players.ts";
import { createProjectileRenderer, type ProjectileRenderer } from "./render/projectiles.ts";
import { buildShipment } from "./render/shipment.ts";
import { createScene } from "./render/scene.ts";

import { PoseModule } from "./modules/pose/index.ts";
import { AimModule, createInitialState as createAimState } from "./modules/aim/index.ts";
import { RecoilModule } from "./modules/recoil/index.ts";
import {
  GazeIntentModule,
  createInitialState as createGazeIntentState,
  type GazeIntentState,
} from "./modules/gaze-intent/index.ts";
import {
  LateralMovementIntentModule,
  createInitialState as createLateralMovementIntentState,
  type LateralMovementIntentState,
} from "./modules/lateral-movement-intent/index.ts";
import {
  SprintIntentModule,
  createInitialState as createSprintIntentState,
  type SprintIntentState,
} from "./modules/sprint-intent/index.ts";
import {
  JumpIntentModule,
  createInitialState as createJumpIntentState,
  type JumpIntentState,
} from "./modules/jump-intent/index.ts";
import {
  WeaponFireIntentModule,
  createInitialState as createWeaponFireIntentState,
  type WeaponFireIntentState,
} from "./modules/weapon-fire-intent/index.ts";
import {
  WeaponSwapIntentModule,
  createInitialState as createWeaponSwapIntentState,
  type WeaponSwapIntentState,
} from "./modules/weapon-swap-intent/index.ts";
import { WeaponSwapModule, type ActiveSlot } from "./modules/weapon-swap/index.ts";
import { initCombatFeedback, tickCombatFeedback } from "./sim/combatFeedback.ts";
import { initHealth } from "./sim/health.ts";
import { initMovement, tickMovement } from "./sim/movement.ts";
import {
  advanceProjectiles,
  bindRemoteProjectileAimSync,
  bindProjectileEyeSampler,
  initProjectiles,
  isFireActive,
  tickProjectileFire,
} from "./sim/projectiles.ts";
import { initRemoteSync, tickRemoteSync } from "./sim/remoteSync.ts";
import { initWorldSync } from "./state/worldSync.ts";
import { getActiveSlot, getActiveWeapon, getActiveWeaponId, getLocalPlayerId, localPlayer } from "./state/world.ts";
import { createDamageOverlay } from "./ui/damageOverlay.ts";
import { createDeathOverlay } from "./ui/deathOverlay.ts";
import { showLobby } from "./ui/lobby.ts";
import { createHitMarker } from "./ui/hitMarker.ts";
import { createKillFeed } from "./ui/killFeed.ts";
import { showRoomGate } from "./ui/roomGate.ts";
import { createWeaponHud } from "./ui/weaponHud.ts";

const MAX_DT = 0.1;
const POS_BROADCAST_INTERVAL = 0.1;

// Passive modules (gaze-intent, lateral-movement-intent, sprint-intent,
// jump-intent, weapon-fire-intent) never call addEventListener themselves —
// this file is the sole owner of raw hardware input listeners for the
// movement/look/fire path, binding hardware events and calling module
// functions explicitly, then driving tick() in a fixed order once per frame.
//
// Pointer-lock-mode toggling is NOT covered here yet — it still runs through
// the legacy bus (input/mouse.ts) because it belongs to a module (UI mode
// state) that doesn't exist yet. Migrating it without that module would just
// move the mess, not fix it.

export const gazeIntentState: GazeIntentState = createGazeIntentState();
export const lateralMovementIntentState: LateralMovementIntentState = createLateralMovementIntentState();
export const sprintIntentState: SprintIntentState = createSprintIntentState();
export const jumpIntentState: JumpIntentState = createJumpIntentState();
export const weaponFireIntentState: WeaponFireIntentState = createWeaponFireIntentState();
export const weaponSwapIntentState: WeaponSwapIntentState = createWeaponSwapIntentState();

const LATERAL_KEY_CODES = new Set(["KeyW", "KeyS", "KeyA", "KeyD"]);

function bindDeviceInputListeners(pointerLockTarget: HTMLElement): void {
  document.addEventListener("pointermove", (event) => {
    if (document.pointerLockElement !== pointerLockTarget) return;
    const { movementX: dx, movementY: dy } = event;
    if (dx === 0 && dy === 0) return;
    GazeIntentModule.projectPointerMove(gazeIntentState, { dx, dy });
  });

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (LATERAL_KEY_CODES.has(event.code)) {
      LateralMovementIntentModule.projectKeyDown(lateralMovementIntentState, event.code);
    }
    if (event.code === "ShiftLeft") SprintIntentModule.projectKeyDown(sprintIntentState, event.code);
    if (event.code === "Space") JumpIntentModule.projectKeyDown(jumpIntentState, event.code);
  });

  window.addEventListener("keyup", (event) => {
    if (LATERAL_KEY_CODES.has(event.code)) {
      LateralMovementIntentModule.projectKeyUp(lateralMovementIntentState, event.code);
    }
    if (event.code === "ShiftLeft") SprintIntentModule.projectKeyUp(sprintIntentState, event.code);
  });

  document.addEventListener("mousedown", (event) => {
    if (event.button === 0) WeaponFireIntentModule.projectMouseDown(weaponFireIntentState);
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) WeaponFireIntentModule.projectMouseUp(weaponFireIntentState);
  });

  document.addEventListener(
    "wheel",
    (event) => {
      if (document.pointerLockElement !== pointerLockTarget) return;
      event.preventDefault();
      WeaponSwapIntentModule.projectWheel(weaponSwapIntentState);
    },
    { passive: false },
  );

  const resetDeviceInput = (): void => {
    LateralMovementIntentModule.reset(lateralMovementIntentState);
    SprintIntentModule.reset(sprintIntentState);
    JumpIntentModule.reset(jumpIntentState);
    GazeIntentModule.reset(gazeIntentState);
    WeaponFireIntentModule.reset(weaponFireIntentState);
    WeaponSwapIntentModule.reset(weaponSwapIntentState);
  };

  window.addEventListener("blur", resetDeviceInput);
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === null) resetDeviceInput();
  });
}

function tickDeviceInput(): void {
  GazeIntentModule.tick(gazeIntentState);
  LateralMovementIntentModule.tick(lateralMovementIntentState);
  SprintIntentModule.tick(sprintIntentState);
  JumpIntentModule.tick(jumpIntentState);
  WeaponFireIntentModule.tick(weaponFireIntentState);
  WeaponSwapIntentModule.tick(weaponSwapIntentState);
}

const { scene, camera, renderer, aimOcclusionRoots: worldAimOcclusionRoots } = createScene();
bindPointerLockTarget(renderer.domElement);
bindDeviceInputListeners(renderer.domElement);

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
bindRemoteProjectileAimSync(playerScene.syncRemoteAimPose, playerScene.sampleRemoteWeaponMuzzleLine);

export const aimState = createAimState();
const localAimOrigin = new THREE.Vector3();
const localAimDirection = new THREE.Vector3();

// Direct call to the bottom of the sampling chain (no bind/callback indirection) —
// this is the only place that needs the render rig's live muzzle line for fire
// purposes, so it just asks for it and pushes the result into aim's own state.
function pushLocalAim(): void {
  playerScene.syncLocalAimPose();
  const hasSample = playerScene.sampleLocalWeaponMuzzleLine(localAimOrigin, localAimDirection);
  if (!hasSample) {
    localAimOrigin.copy(camera.position);
    camera.getWorldDirection(localAimDirection);
  }
  AimModule.projectMuzzleLine(
    aimState,
    { x: localAimOrigin.x, y: localAimOrigin.y, z: localAimOrigin.z },
    { x: localAimDirection.x, y: localAimDirection.y, z: localAimDirection.z },
  );
}

initWorldSync();
initMovement();
initProjectiles();
initRemoteSync();
initHealth();
initCombatFeedback(hitMarker, damageOverlay);
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

function applyWeaponSwapIntent(): void {
  if (!weaponSwapIntentState.toggled) return;
  if (!gameStarted || !localPlayer.alive) return;

  const other: ActiveSlot = localPlayer.weaponSwap.activeSlot === "primary" ? "secondary" : "primary";
  const otherSlotHasWeapon = WeaponSwapModule.resolveSlotWeapon(localPlayer.loadout, other) !== null;
  if (!WeaponSwapModule.toggle(localPlayer.weaponSwap, otherSlotHasWeapon)) return;

  refreshWeaponHud();
  bus.emit("weaponSwitched", { activeSlot: getActiveSlot() });
  void loadLocalPlayerAssets().catch((error) => {
    console.error("weapon slot swap failed", error);
  });
}

bus.on("loadoutCommitted", () => {
  if (!gameStarted) return;
  refreshWeaponHud();
  void loadLocalPlayerAssets().catch((error) => {
    console.error("loadout apply failed", error);
  });
});

function tick(dt: number): void {
  tickDeviceInput();
  applyWeaponSwapIntent();
  tickMovement(dt);
  if (localPlayer.alive) PoseModule.tick(localPlayer, dt);
  RecoilModule.tick(localPlayer.recoil, dt, isFireActive());
  pushLocalAim();
  tickProjectileFire(dt, aimState);
  playerScene.update(dt);
  playerScene.applyCamera(camera);
  tickRemoteSync(dt);
  tickPosBroadcast(dt);
}

function tickPosBroadcast(dt: number): void {
  if (!getLocalPlayerId()) return;
  posBroadcastElapsed += dt;
  if (posBroadcastElapsed < POS_BROADCAST_INTERVAL) return;
  posBroadcastElapsed = 0;
  sendPosition({ x: localPlayer.x, y: localPlayer.y, z: localPlayer.z }, localPlayer.targetYaw, localPlayer.targetPitch);
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

function enterGameAsPlayer(): void {
  initMouse(renderer.domElement);
  playerScene.applyCamera(camera);
  renderer.domElement.style.display = "block";
  gameStarted = true;
  refreshWeaponHud();
  void loadLocalPlayerAssets().catch((error) => {
    console.error("failed to load player assets", error);
  });
}

showRoomGate({
  onJoined: () => {
    showLobby({
      onSpawn: enterGameAsPlayer,
      onSpectate: () => {},
    });
  },
});

requestAnimationFrame(loop);
