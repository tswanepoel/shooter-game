export { createInitialState, type LoadoutState, type WeaponSlotId } from "./state.ts";

import { set } from "./logic.ts";

export const LoadoutModule = {
  set,
} as const;
