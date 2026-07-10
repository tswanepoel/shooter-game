import { localPlayer, remotePlayers } from "../state/world.ts";

/** Screen-space bearing from local view to attacker (radians). 0 = ahead, + = right. */
export function bearingToAttacker(attackerId: string): number | undefined {
  const attacker = remotePlayers.get(attackerId);
  if (!attacker) return undefined;

  const dx = attacker.x - localPlayer.x;
  const dz = attacker.z - localPlayer.z;
  if (dx * dx + dz * dz < 1e-6) return undefined;

  const worldBearing = Math.atan2(-dx, -dz);
  return worldBearing - localPlayer.targetYaw;
}