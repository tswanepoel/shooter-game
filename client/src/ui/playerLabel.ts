import { getActiveCharacterId } from "../state/character.ts";
import { getLocalPlayerId, remotePlayers } from "../state/world.ts";

export function labelForPlayer(playerId: string): string {
  if (playerId === getLocalPlayerId()) {
    return formatCharacterId(getActiveCharacterId());
  }
  const remote = remotePlayers.get(playerId);
  if (remote) return formatCharacterId(remote.characterId);
  return playerId.slice(0, 6);
}

function formatCharacterId(characterId: string): string {
  return characterId.replace("character-", "").toUpperCase();
}