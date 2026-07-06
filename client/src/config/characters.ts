/** Camera-local eye → hand chain lengths (blocky-character rig). */
export interface ViewChain {
  halfHeadDepth: number;
  halfHeadHeight: number;
  armLength: number;
  /** Extra reach on the shoulder→grip segment (rig is short vs first-person expectation). */
  armLengthCorrection: number;
  handOffsetX: number;
  /** Downward shoulder→grip angle at neutral aim (camera-local pitch, radians). */
  armRestPitch: number;
}

export interface CharacterRecipe {
  id: string;
  modelUrl: string;
  height: number;
  eyeHeight: number;
  viewChain: ViewChain;
}

// All blocky-character variants share the same rig and canonical world height.
const CHARACTER_BODY = {
  height: 1.8,
  eyeHeight: 1.505,
  viewChain: {
    halfHeadDepth: 0.1,
    halfHeadHeight: (1.8 - 1.505) * 0.5,
    armLength: 0.55,
    armLengthCorrection: 0.25,
    handOffsetX: 0.2,
    armRestPitch: -0.35,
  },
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