import { tryGetWeaponRecipe, type WeaponRecipe } from "../config/weapons.ts";
import { getActiveWeaponId } from "../state/loadout.ts";

export function getCurrentWeapon(): WeaponRecipe | undefined {
  return tryGetWeaponRecipe(getActiveWeaponId());
}