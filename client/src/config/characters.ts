import type { Vec3 } from "../types/vec3.ts";

export type { Vec3 };

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

/** Walk-only locomotion swing retained after dampening (0–1; lower = calmer). Sprint undamped. */
export const WALK_LOCOMOTION_DAMPENED_ARM_SWING = 0.005;
export const WALK_LOCOMOTION_DAMPENED_HEAD_SWING = 0.1;

function character(id: string): CharacterRecipe {
  return {
    id,
    modelUrl: `/models/${id}.glb`,
    ...CHARACTER_BODY,
  };
}

const CHARACTER_SUFFIXES = "abcdefghijklmnopqr";

export const CHARACTER_RECIPES: Record<string, CharacterRecipe> = Object.fromEntries(
  [...CHARACTER_SUFFIXES].map((suffix) => {
    const id = `character-${suffix}`;
    return [id, character(id)];
  }),
);

export const CHARACTER_IDS = Object.keys(CHARACTER_RECIPES);

export const DEFAULT_CHARACTER_ID = "character-a";

export function getCharacterRecipe(id: string): CharacterRecipe {
  const recipe = CHARACTER_RECIPES[id];
  if (!recipe) throw new Error(`unknown character recipe: ${id}`);
  return recipe;
}

export function resolveCharacterId(id: string | undefined): string {
  if (id && id in CHARACTER_RECIPES) return id;
  return DEFAULT_CHARACTER_ID;
}