import { bus } from "../bus.ts";
import { getLoadoutOverlay } from "../ui/loadoutOverlay.ts";
import { jumpIntentState, lateralMovementIntentState, sprintIntentState, gazeIntentState } from "../main.ts";
import { localPlayer } from "../state/world.ts";
import { GazeModule } from "../modules/gaze/index.ts";
import { LateralMovementModule } from "../modules/lateral-movement/index.ts";
import { SprintModule } from "../modules/sprint/index.ts";
import { JumpModule } from "../modules/jump/index.ts";
import { ElevationModule } from "../modules/elevation/index.ts";
import { LateralPositionModule } from "../modules/lateral-position/index.ts";

let controlEngaged = false;

export function initMovement(): void {
  bus.on("controlEngaged", () => {
    controlEngaged = true;
  });
  bus.on("controlReleased", () => {
    controlEngaged = false;
  });
}

function applyJumpIntent(): void {
  if (!jumpIntentState.jump) return;

  if (!localPlayer.alive) {
    if (getLoadoutOverlay().isOpen()) return;
    bus.emit("respawnRequested", undefined);
    return;
  }
  if (!JumpModule.canJump(localPlayer.grounded, localPlayer.alive)) return;
  ElevationModule.projectInternalJump(localPlayer);
  LateralPositionModule.projectInternalJump(localPlayer, localPlayer.velocityX, localPlayer.velocityZ);
  bus.emit("jumpLaunched", undefined);
}

function applyGazeIntent(): void {
  const { yawDelta, pitchDelta } = gazeIntentState;
  if (!controlEngaged || !localPlayer.alive) return;
  if (yawDelta === 0 && pitchDelta === 0) return;

  GazeModule.tick(localPlayer, yawDelta, pitchDelta);
}

export function tickMovement(dt: number): void {
  applyGazeIntent();
  applyJumpIntent();

  if (!localPlayer.alive) {
    localPlayer.horizontalSpeed = 0;
    return;
  }

  SprintModule.tick(localPlayer, lateralMovementIntentState.forwardAxis, sprintIntentState.sprint, dt);
  LateralMovementModule.tick(
    localPlayer,
    lateralMovementIntentState.forwardAxis,
    lateralMovementIntentState.strafeAxis,
    localPlayer.sprinting,
    localPlayer.targetYaw,
  );
  LateralPositionModule.tick(localPlayer, localPlayer.velocityX, localPlayer.velocityZ, localPlayer.grounded, localPlayer.y, dt);
  ElevationModule.tick(localPlayer, localPlayer.x, localPlayer.z, dt);

  localPlayer.horizontalSpeed = localPlayer.grounded
    ? Math.hypot(localPlayer.velocityX, localPlayer.velocityZ)
    : Math.hypot(localPlayer.airHorizontalX, localPlayer.airHorizontalZ);
}
