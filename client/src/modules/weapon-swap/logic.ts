import type { WeaponSwapState, ActiveSlot } from "./state.ts";
import type { LoadoutState, WeaponSlotId } from "../loadout/index.ts";

export function resolveSlotWeapon(loadout: LoadoutState, slot: ActiveSlot): WeaponSlotId {
  return slot === "primary" ? loadout.primary : loadout.secondary;
}

export function resolveDefaultSlot(loadout: LoadoutState): ActiveSlot {
  if (loadout.primary) return "primary";
  if (loadout.secondary) return "secondary";
  return "primary";
}

export function setActiveSlot(state: WeaponSwapState, slot: ActiveSlot): void {
  state.activeSlot = slot;
}

/** Validated toggle: flips only if the other slot has a weapon equipped. Returns whether it happened. */
export function toggle(state: WeaponSwapState, otherSlotHasWeapon: boolean): boolean {
  if (!otherSlotHasWeapon) return false;
  state.activeSlot = state.activeSlot === "primary" ? "secondary" : "primary";
  return true;
}
