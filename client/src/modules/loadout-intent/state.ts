import type { LoadoutState } from "../loadout/index.ts";

export interface LoadoutIntentState {
  pending: LoadoutState;
}

export function createInitialState(): LoadoutIntentState {
  return { pending: { primary: null, secondary: null } };
}
