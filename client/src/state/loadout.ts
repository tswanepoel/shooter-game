import { tryGetWeaponRecipe, type WeaponRecipe } from "../config/weapons.ts";

export type WeaponSlotId = string | null;
export type ActiveSlot = "primary" | "secondary";

export interface Loadout {
  primary: WeaponSlotId;
  secondary: WeaponSlotId;
}

let lifeLoadout: Loadout = { primary: null, secondary: null };
let pendingLoadout: Loadout = { primary: null, secondary: null };
let activeSlot: ActiveSlot = "primary";
let preservePendingOnNextDeath = false;

export function getLifeLoadout(): Readonly<Loadout> {
  return lifeLoadout;
}

export function getPendingLoadout(): Readonly<Loadout> {
  return pendingLoadout;
}

export function getActiveSlot(): ActiveSlot {
  return activeSlot;
}

export function pickDefaultActiveSlot(loadout: Loadout): ActiveSlot {
  if (loadout.primary) return "primary";
  if (loadout.secondary) return "secondary";
  return "primary";
}

export function setLobbyLoadout(loadout: Loadout): void {
  lifeLoadout = { ...loadout };
  pendingLoadout = { ...loadout };
  activeSlot = pickDefaultActiveSlot(loadout);
}

export function preservePendingLoadoutForNextDeath(): void {
  preservePendingOnNextDeath = true;
}

export function clearPendingPreserve(): void {
  preservePendingOnNextDeath = false;
}

export function stagePendingFromLife(): void {
  if (preservePendingOnNextDeath) return;
  pendingLoadout = { ...lifeLoadout };
}

export function commitPendingToLife(): Loadout {
  preservePendingOnNextDeath = false;
  lifeLoadout = { ...pendingLoadout };
  activeSlot = pickDefaultActiveSlot(lifeLoadout);
  return lifeLoadout;
}

export function setPendingSlot(slot: ActiveSlot, weaponId: WeaponSlotId): void {
  pendingLoadout = { ...pendingLoadout, [slot]: weaponId };
}

export function setLifeLoadout(loadout: Loadout, slot: ActiveSlot = pickDefaultActiveSlot(loadout)): void {
  lifeLoadout = { ...loadout };
  pendingLoadout = { ...loadout };
  activeSlot = slot;
}

export function resolveSlotWeapon(loadout: Loadout, slot: ActiveSlot): WeaponSlotId {
  return slot === "primary" ? loadout.primary : loadout.secondary;
}

export function getActiveWeaponId(): WeaponSlotId {
  return resolveSlotWeapon(lifeLoadout, activeSlot);
}

export function getActiveWeapon(): WeaponRecipe | undefined {
  return tryGetWeaponRecipe(getActiveWeaponId());
}

/** Swap active slot only when the other slot has a weapon equipped. */
export function toggleActiveSlot(): boolean {
  const other: ActiveSlot = activeSlot === "primary" ? "secondary" : "primary";
  if (!resolveSlotWeapon(lifeLoadout, other)) return false;
  activeSlot = other;
  return true;
}

export function setActiveSlot(slot: ActiveSlot): void {
  activeSlot = slot;
}