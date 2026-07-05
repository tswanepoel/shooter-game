import { bus } from "../bus.ts";
import { REMOTE_POSITION_LERP_RATE } from "../config/physics.ts";
import { remotePlayers } from "../state/world.ts";
import { tickCascade } from "./aimCascade.ts";

bus.on("positionReceived", (message) => {
  const remote = remotePlayers.get(message.id);
  if (!remote) return;

  if (!remote.cascadeInitialized) {
    // Roster/join snapshots carry a placeholder orientation (the server
    // never tracks it); the first real pos update is the true starting
    // orientation, so snap all three angles to it instead of chasing there.
    remote.headYaw = remote.gunYaw = remote.torsoYaw = message.yaw;
    remote.headPitch = remote.gunPitch = remote.torsoPitch = message.pitch;
    remote.cascadeInitialized = true;
  } else {
    remote.headYaw = message.yaw;
    remote.headPitch = message.pitch;
  }

  if (remote.timeSinceLastPos > 0) {
    const dx = message.position.x - remote.targetPosition.x;
    const dz = message.position.z - remote.targetPosition.z;
    remote.measuredSpeed = Math.hypot(dx, dz) / remote.timeSinceLastPos;
  }

  remote.targetPosition = { ...message.position };
  remote.timeSinceLastPos = 0;
});

export function tickRemoteSync(dt: number): void {
  const lerpFactor = 1 - Math.exp(-REMOTE_POSITION_LERP_RATE * dt);

  for (const remote of remotePlayers.values()) {
    remote.timeSinceLastPos += dt;

    remote.position.x += (remote.targetPosition.x - remote.position.x) * lerpFactor;
    remote.position.y += (remote.targetPosition.y - remote.position.y) * lerpFactor;
    remote.position.z += (remote.targetPosition.z - remote.position.z) * lerpFactor;

    tickCascade(remote, dt);
  }
}
