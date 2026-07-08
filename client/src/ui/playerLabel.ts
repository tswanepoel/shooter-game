import { getDisplayName } from "../state/session.ts";
import { getLocalPlayerId, remotePlayers } from "../state/world.ts";

export function labelForPlayer(playerId: string): string {
  if (playerId === getLocalPlayerId()) {
    return getDisplayName() || "You";
  }
  const remote = remotePlayers.get(playerId);
  if (remote?.displayName) return remote.displayName;
  return playerId.slice(0, 6);
}