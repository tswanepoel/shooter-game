export { createInitialState, type WeaponSwapState, type ActiveSlot } from "./state.ts";

import { resolveSlotWeapon, resolveDefaultSlot, setActiveSlot, toggle } from "./logic.ts";

export const WeaponSwapModule = {
  resolveSlotWeapon,
  resolveDefaultSlot,
  setActiveSlot,
  toggle,
} as const;
