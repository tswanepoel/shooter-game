import { bus } from "../bus.ts";
import { MAX_PITCH, MOUSE_SENSITIVITY, MOVE_SPEED, STAMINA, WORLD_BOUNDARY } from "../config/physics.ts";
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
});

bus.on("turned", ({ dx, dy }) => {
  if (!controlEngaged) return;
  localPlayer.headYaw -= dx * MOUSE_SENSITIVITY;
  localPlayer.headPitch -= dy * MOUSE_SENSITIVITY;
  localPlayer.headPitch = clamp(localPlayer.headPitch, -MAX_PITCH, MAX_PITCH);
});

export function tickMovement(dt: number): void {
  const forwardInput = (forwardHeld ? 1 : 0) - (backwardHeld ? 1 : 0);
  const strafeInput = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);

  updateSprint(dt);

  if (forwardInput === 0 && strafeInput === 0) return;

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

  const yaw = localPlayer.headYaw;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  localPlayer.position.x += (forwardX * localForward + rightX * localRight) * dt;
  localPlayer.position.z += (forwardZ * localForward + rightZ * localRight) * dt;

  localPlayer.position.x = clamp(localPlayer.position.x, -WORLD_BOUNDARY, WORLD_BOUNDARY);
  localPlayer.position.z = clamp(localPlayer.position.z, -WORLD_BOUNDARY, WORLD_BOUNDARY);
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
