export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface CharacterRecipe {
  id: string;
  modelUrl: string;
  height: number;
  /** Eye socket offset in head-local space (authored from the scaled blocky-character glb). */
  eyeOffset: Vec3;
}

// Shared blocky-character rig at height 1.8.
// eyeOffset is in head-bone local space (holding-right pose), not world metres.
const CHARACTER_BODY = {
  height: 1.8,
  eyeOffset: { x: 0, y: 3.575, z: 3.36 },
} as const;

function character(id: string): CharacterRecipe {
  return {
    id,
    modelUrl: `/models/${id}.glb`,
    ...CHARACTER_BODY,
  };
}

export const CHARACTER_RECIPES: Record<string, CharacterRecipe> = {
  "character-a": character("character-a"),
  "character-b": character("character-b"),
  "character-c": character("character-c"),
  "character-d": character("character-d"),
  "character-e": character("character-e"),
  "character-f": character("character-f"),
};

export const CHARACTER_IDS = Object.keys(CHARACTER_RECIPES);

export const DEFAULT_CHARACTER_ID = "character-a";

let currentCharacterId = DEFAULT_CHARACTER_ID;

export function getCurrentCharacterId(): string {
  return currentCharacterId;
}

export function getCharacterRecipe(id: string): CharacterRecipe {
  const recipe = CHARACTER_RECIPES[id];
  if (!recipe) throw new Error(`unknown character recipe: ${id}`);
  return recipe;
}

export function getCurrentCharacter(): CharacterRecipe {
  return getCharacterRecipe(currentCharacterId);
}

export function resolveCharacterId(id: string | undefined): string {
  if (id && id in CHARACTER_RECIPES) return id;
  return DEFAULT_CHARACTER_ID;
}

export function setCurrentCharacterId(id: string): void {
  currentCharacterId = resolveCharacterId(id);
}