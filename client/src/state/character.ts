import {
  DEFAULT_CHARACTER_ID,
  getCharacterRecipe,
  resolveCharacterId,
  type CharacterRecipe,
} from "../config/characters.ts";

let activeCharacterId = DEFAULT_CHARACTER_ID;

export function getActiveCharacterId(): string {
  return activeCharacterId;
}

export function setActiveCharacterId(id: string): void {
  activeCharacterId = resolveCharacterId(id);
}

export function getActiveCharacter(): CharacterRecipe {
  return getCharacterRecipe(activeCharacterId);
}