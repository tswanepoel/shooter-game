import { bus } from "../bus.ts";
import { ElevationModule } from "../modules/elevation/index.ts";
import { GazeModule } from "../modules/gaze/index.ts";
import { remotePlayers } from "../state/world.ts";
import { PoseModule } from "../modules/pose/index.ts";
import { RecoilModule } from "../modules/recoil/index.ts";

const REMOTE_POSITION_LERP_RATE = 12;

export function initRemoteSync(): void {
  bus.on("positionReceived", (message) => {
    const remote = remotePlayers.get(message.id);
    if (!remote) return;

    GazeModule.projectOrientation(remote, message.yaw, message.pitch);

    if (!remote.cascadeInitialized) {
      // Roster/join snapshots carry a placeholder orientation (the server
      // never tracks it); the first real pos update is the true starting
      // orientation, so snap all cascade layers to it instead of chasing there.
      PoseModule.snapToTarget(remote);
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
    ElevationModule.projectImmediateJump(remote);
  });
}

export function tickRemoteSync(dt: number): void {
  const lerpFactor = 1 - Math.exp(-REMOTE_POSITION_LERP_RATE * dt);

  for (const remote of remotePlayers.values()) {
    remote.timeSinceLastPos += dt;

    remote.x += (remote.targetPosition.x - remote.x) * lerpFactor;
    remote.z += (remote.targetPosition.z - remote.z) * lerpFactor;

    ElevationModule.tick(remote, remote.x, remote.z, dt);

    PoseModule.tick(remote, dt);

    RecoilModule.tick(remote.recoil, dt, RecoilModule.isFiring(remote.recoil, remote.weaponId));
  }
}
