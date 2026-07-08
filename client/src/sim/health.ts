import { bus } from "../bus.ts";
import { HEALTH } from "../config/combat.ts";
import { STAMINA } from "../config/physics.ts";
import { snapCascadeToTarget } from "./aimCascade.ts";
import { resetRecoil } from "./recoilCascade.ts";
import { getLocalPlayerId, localPlayer, remotePlayers } from "../state/world.ts";

export function initHealth(): void {
  bus.on("welcomed", () => {
    localPlayer.health = HEALTH.max;
    localPlayer.alive = true;
  });

  bus.on("healthReceived", ({ id, health, attackerId }) => {
    if (id === getLocalPlayerId()) {
      localPlayer.health = health;
      if (attackerId) bus.emit("damageTaken", { attackerId });
      return;
    }
    const remote = remotePlayers.get(id);
    if (remote) remote.health = health;
  });

  bus.on("deathReceived", ({ victimId }) => {
    if (victimId === getLocalPlayerId()) {
      localPlayer.alive = false;
      localPlayer.targetPitch = 0;
      snapCascadeToTarget(localPlayer);
      resetRecoil(localPlayer.recoil);
      return;
    }
    const remote = remotePlayers.get(victimId);
    if (remote) {
      remote.alive = false;
      resetRecoil(remote.recoil);
    }
  });

  bus.on("respawnReceived", ({ id, position }) => {
    if (id === getLocalPlayerId()) {
      localPlayer.position.x = position.x;
      localPlayer.position.y = position.y;
      localPlayer.position.z = position.z;
      localPlayer.health = HEALTH.max;
      localPlayer.stamina = STAMINA.max;
      localPlayer.alive = true;
      localPlayer.velocityY = 0;
      localPlayer.grounded = true;
      localPlayer.horizontalSpeed = 0;
      localPlayer.targetPitch = 0;
      snapCascadeToTarget(localPlayer);
      bus.emit("feedbackReset", undefined);
      return;
    }
    const remote = remotePlayers.get(id);
    if (!remote) return;
    remote.position.x = position.x;
    remote.position.y = position.y;
    remote.position.z = position.z;
    remote.targetPosition.x = position.x;
    remote.targetPosition.y = position.y;
    remote.targetPosition.z = position.z;
    remote.health = HEALTH.max;
    remote.alive = true;
    remote.velocityY = 0;
    remote.grounded = true;
    resetRecoil(remote.recoil);
  });
}