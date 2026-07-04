import { bus } from "../bus.ts";
import type { Action } from "../config/keybinds.ts";
import { MAX_PITCH, MOUSE_SENSITIVITY, MOVE_SPEED, WORLD_BOUNDARY } from "../config/physics.ts";
import { localPlayer } from "../state/world.ts";

let activeActions = new Set<Action>();
let controlEngaged = false;

bus.on("actionsChanged", (actions) => {
  activeActions = new Set(actions);
});

bus.on("controlChanged", ({ engaged }) => {
  controlEngaged = engaged;
});

bus.on("turned", ({ dx, dy }) => {
  if (!controlEngaged) return;
  localPlayer.headYaw -= dx * MOUSE_SENSITIVITY;
  localPlayer.headPitch -= dy * MOUSE_SENSITIVITY;
  localPlayer.headPitch = clamp(localPlayer.headPitch, -MAX_PITCH, MAX_PITCH);
});

export function tickMovement(dt: number): void {
  const forwardInput =
    (activeActions.has("moveForward") ? 1 : 0) - (activeActions.has("moveBackward") ? 1 : 0);
  const strafeInput =
    (activeActions.has("moveRight") ? 1 : 0) - (activeActions.has("moveLeft") ? 1 : 0);

  if (forwardInput === 0 && strafeInput === 0) return;

  const forwardSpeed = forwardInput > 0 ? MOVE_SPEED.forward : MOVE_SPEED.backward;
  let localForward = forwardInput * forwardSpeed;
  let localRight = strafeInput * MOVE_SPEED.lateral;

  const rawSpeed = Math.hypot(localForward, localRight);
  if (rawSpeed > MOVE_SPEED.forward) {
    const scale = MOVE_SPEED.forward / rawSpeed;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
