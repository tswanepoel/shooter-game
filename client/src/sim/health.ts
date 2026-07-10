import { bus } from "../bus.ts";
import { SprintModule } from "../modules/sprint/index.ts";
import { GazeModule } from "../modules/gaze/index.ts";
import { PoseModule } from "../modules/pose/index.ts";
import { ElevationModule } from "../modules/elevation/index.ts";
import { LateralPositionModule } from "../modules/lateral-position/index.ts";
import { RecoilModule } from "../modules/recoil/index.ts";
import { HealthModule } from "../modules/health/index.ts";
import { getLocalPlayerId, localPlayer, remotePlayers } from "../state/world.ts";

export function initHealth(): void {
  bus.on("welcomed", () => {
    HealthModule.projectWelcome(localPlayer);
  });

  bus.on("healthReceived", ({ id, health, attackerId }) => {
    if (id === getLocalPlayerId()) {
      HealthModule.projectHealth(localPlayer, health);
      if (attackerId) bus.emit("damageTaken", { attackerId });
      return;
    }
    const remote = remotePlayers.get(id);
    if (remote) HealthModule.projectHealth(remote, health);
  });

  bus.on("deathReceived", ({ victimId }) => {
    if (victimId === getLocalPlayerId()) {
      HealthModule.projectDeath(localPlayer);
      GazeModule.projectOrientation(localPlayer, localPlayer.targetYaw, 0);
      PoseModule.snapToTarget(localPlayer);
      RecoilModule.reset(localPlayer.recoil);
      return;
    }
    const remote = remotePlayers.get(victimId);
    if (remote) {
      HealthModule.projectDeath(remote);
      RecoilModule.reset(remote.recoil);
    }
  });

  bus.on("respawnReceived", ({ id, position }) => {
    if (id === getLocalPlayerId()) {
      ElevationModule.projectRespawn(localPlayer, position.y);
      LateralPositionModule.projectRespawn(localPlayer, position.x, position.z);
      HealthModule.projectRespawn(localPlayer);
      SprintModule.projectRespawn(localPlayer);
      localPlayer.horizontalSpeed = 0;
      GazeModule.projectOrientation(localPlayer, localPlayer.targetYaw, 0);
      PoseModule.snapToTarget(localPlayer);
      bus.emit("feedbackReset", undefined);
      return;
    }
    const remote = remotePlayers.get(id);
    if (!remote) return;
    ElevationModule.projectRespawn(remote, position.y);
    LateralPositionModule.projectRespawn(remote, position.x, position.z);
    remote.targetPosition.x = position.x;
    remote.targetPosition.y = position.y;
    remote.targetPosition.z = position.z;
    HealthModule.projectRespawn(remote);
    RecoilModule.reset(remote.recoil);
  });
}
