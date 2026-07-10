import type { LoadoutState } from "./state.ts";

export function set(state: LoadoutState, loadout: LoadoutState): LoadoutState {
  state.primary = loadout.primary;
  state.secondary = loadout.secondary;
  return state;
}
