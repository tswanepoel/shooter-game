export { createInitialState, type LoadoutIntentState } from "./state.ts";

import { setPending } from "./logic.ts";

export const LoadoutIntentModule = {
  setPending,
} as const;
