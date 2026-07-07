import { bus } from "../bus.ts";
import { getLoadoutOverlay } from "../ui/loadoutOverlay.ts";
import { clearPointerDelta, drainPointerDelta } from "../input/pointerInput.ts";
import {
  GRAVITY,
  JUMP_SPEED,
  MAX_PITCH,
  MOUSE_SENSITIVITY,
  MOVE_SPEED,
  STAMINA,
} from "../config/physics.ts";
import { getShipmentGroundHeight, resolveShipmentMovement } from "./shipmentCollision.ts";
import { localPlayer } from "../state/world.ts";

let forwardHeld = false;
let backwardHeld = false;
let leftHeld = false;
let rightHeld = false;
let sprintKeyHeld = false;
let controlEngaged = false;

bus.on("moveForwardStarted", () => {
  forwardHeld = true;
});
bus.on("moveForwardStopped", () => {
  forwardHeld = false;
});
bus.on("moveBackwardStarted", () => {
  backwardHeld = true;
});
bus.on("moveBackwardStopped", () => {
  backwardHeld = false;
});
bus.on("moveLeftStarted", () => {
  leftHeld = true;
});
bus.on("moveLeftStopped", () => {
  leftHeld = false;
});
bus.on("moveRightStarted", () => {
  rightHeld = true;
});
bus.on("moveRightStopped", () => {
  rightHeld = false;
});
bus.on("sprintStarted", () => {
  sprintKeyHeld = true;
});
bus.on("sprintStopped", () => {
  sprintKeyHeld = false;
});

bus.on("controlEngaged", () => {
  controlEngaged = true;
});
bus.on("controlReleased", () => {
  controlEngaged = false;
  clearPointerDelta();
});

function applyBufferedPointerTurn(): void {
  const { dx, dy } = drainPointerDelta();
  if (!controlEngaged || !localPlayer.alive) return;
  if (dx === 0 && dy === 0) return;

  localPlayer.targetYaw -= dx * MOUSE_SENSITIVITY;
  localPlayer.targetPitch -= dy * MOUSE_SENSITIVITY;
  localPlayer.targetPitch = clamp(localPlayer.targetPitch, -MAX_PITCH, MAX_PITCH);
}

bus.on("jumped", () => {
  if (!localPlayer.alive) {
    if (getLoadoutOverlay().isOpen()) return;
    bus.emit("respawnRequested", undefined);
    return;
  }
  if (!localPlayer.grounded) return;
  const velocity = computeHorizontalVelocity();
  localPlayer.airHorizontal.x = velocity.x;
  localPlayer.airHorizontal.z = velocity.z;
  localPlayer.velocityY = JUMP_SPEED;
  localPlayer.grounded = false;
  bus.emit("jumpLaunched", undefined);
});

export function tickMovement(dt: number): void {
  applyBufferedPointerTurn();

  if (!localPlayer.alive) {
    localPlayer.horizontalSpeed = 0;
    return;
  }

  updateSprint(dt);

  if (localPlayer.grounded) {
    const velocity = computeHorizontalVelocity();
    localPlayer.position.x += velocity.x * dt;
    localPlayer.position.z += velocity.z * dt;
  } else {
    localPlayer.position.x += localPlayer.airHorizontal.x * dt;
    localPlayer.position.z += localPlayer.airHorizontal.z * dt;

    localPlayer.velocityY += GRAVITY * dt;
    localPlayer.position.y += localPlayer.velocityY * dt;

    const ground = getShipmentGroundHeight(
      localPlayer.position.x,
      localPlayer.position.z,
      localPlayer.position.y,
    );
    if (localPlayer.position.y <= ground) {
      localPlayer.position.y = ground;
      localPlayer.velocityY = 0;
      localPlayer.grounded = true;
    }
  }

  const resolved = resolveShipmentMovement(
    localPlayer.position.x,
    localPlayer.position.z,
    localPlayer.position.y,
  );
  localPlayer.position.x = resolved.x;
  localPlayer.position.z = resolved.z;
  localPlayer.position.y = resolved.y;

  if (localPlayer.grounded) {
    const ground = getShipmentGroundHeight(localPlayer.position.x, localPlayer.position.z);
    if (ground < localPlayer.position.y - 0.05) {
      localPlayer.grounded = false;
      localPlayer.velocityY = 0;
    } else {
      localPlayer.position.y = ground;
    }
  }

  if (localPlayer.grounded) {
    const velocity = computeHorizontalVelocity();
    localPlayer.horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  } else {
    localPlayer.horizontalSpeed = Math.hypot(localPlayer.airHorizontal.x, localPlayer.airHorizontal.z);
  }
}

function computeHorizontalVelocity(): { x: number; z: number } {
  const forwardInput = (forwardHeld ? 1 : 0) - (backwardHeld ? 1 : 0);
  const strafeInput = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);

  if (forwardInput === 0 && strafeInput === 0) return { x: 0, z: 0 };

  const forwardCap = localPlayer.sprinting ? MOVE_SPEED.sprint : MOVE_SPEED.forward;
  const forwardSpeed = forwardInput > 0 ? forwardCap : MOVE_SPEED.backward;
  let localForward = forwardInput * forwardSpeed;
  let localRight = strafeInput * MOVE_SPEED.lateral;

  const rawSpeed = Math.hypot(localForward, localRight);
  if (rawSpeed > forwardCap) {
    const scale = forwardCap / rawSpeed;
    localForward *= scale;
    localRight *= scale;
  }

  const yaw = localPlayer.targetYaw;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  return {
    x: forwardX * localForward + rightX * localRight,
    z: forwardZ * localForward + rightZ * localRight,
  };
}

function updateSprint(dt: number): void {
  if (
    !localPlayer.sprinting &&
    sprintKeyHeld &&
    forwardHeld &&
    localPlayer.stamina > STAMINA.enterFloor
  ) {
    localPlayer.sprinting = true;
  }

  if (localPlayer.sprinting && (!forwardHeld || localPlayer.stamina <= 0)) {
    localPlayer.sprinting = false;
  }

  localPlayer.stamina = localPlayer.sprinting
    ? Math.max(0, localPlayer.stamina - STAMINA.drainPerSecond * dt)
    : Math.min(STAMINA.max, localPlayer.stamina + STAMINA.recoverPerSecond * dt);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
