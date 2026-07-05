import { getCurrentCharacterId } from "../config/characters.ts";
import { localPlayerId, remotePlayers } from "../state/world.ts";

export function labelForPlayer(playerId: string): string {
  if (playerId === localPlayerId) {
    return formatCharacterId(getCurrentCharacterId());
  }
  const remote = remotePlayers.get(playerId);
  if (remote) return formatCharacterId(remote.characterId);
  return playerId.slice(0, 6);
}

function formatCharacterId(characterId: string): string {
  return characterId.replace("character-", "").toUpperCase();
}