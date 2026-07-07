import { bus } from "../bus.ts";

import { GRAVITY, JUMP_SPEED, REMOTE_POSITION_LERP_RATE } from "../config/physics.ts";
import { getShipmentGroundHeight } from "./shipmentCollision.ts";
import { remotePlayers } from "../state/world.ts";
import { snapCascadeToTarget, tickCascade } from "./aimCascade.ts";

bus.on("positionReceived", (message) => {
  const remote = remotePlayers.get(message.id);
  if (!remote) return;

  remote.targetYaw = message.yaw;
  remote.targetPitch = message.pitch;

  if (!remote.cascadeInitialized) {
    // Roster/join snapshots carry a placeholder orientation (the server
    // never tracks it); the first real pos update is the true starting
    // orientation, so snap all cascade layers to it instead of chasing there.
    snapCascadeToTarget(remote);
    remote.cascadeInitialized = true;
  }

  if (remote.timeSinceLastPos > 0) {
    const dx = message.position.x - remote.targetPosition.x;
    const dz = message.position.z - remote.targetPosition.z;
    remote.measuredSpeed = Math.hypot(dx, dz) / remote.timeSinceLastPos;
  }

  remote.targetPosition = { ...message.position };
  remote.timeSinceLastPos = 0;
});

bus.on("jumpReceived", ({ id }) => {
  const remote = remotePlayers.get(id);
  if (!remote || !remote.grounded) return;
  remote.velocityY = JUMP_SPEED;
  remote.grounded = false;
});

export function tickRemoteSync(dt: number): void {
  const lerpFactor = 1 - Math.exp(-REMOTE_POSITION_LERP_RATE * dt);

  for (const remote of remotePlayers.values()) {
    remote.timeSinceLastPos += dt;

    remote.position.x += (remote.targetPosition.x - remote.position.x) * lerpFactor;
    remote.position.z += (remote.targetPosition.z - remote.position.z) * lerpFactor;

    if (remote.grounded) {
      const ground = getShipmentGroundHeight(remote.position.x, remote.position.z);
      remote.position.y += (ground - remote.position.y) * lerpFactor;
    } else {
      remote.velocityY += GRAVITY * dt;
      remote.position.y += remote.velocityY * dt;

      const ground = getShipmentGroundHeight(
        remote.position.x,
        remote.position.z,
        remote.position.y,
      );
      if (remote.position.y <= ground) {
        remote.position.y = ground;
        remote.velocityY = 0;
        remote.grounded = true;
      }
    }

    tickCascade(remote, dt);
  }
}
