import type { LoadoutIntentState } from "./state.ts";
import type { LoadoutState } from "../loadout/index.ts";

/** Records an established intent — call only at the moment the player actually commits (Apply/Spawn), not on every UI edit. */
export function setPending(state: LoadoutIntentState, loadout: LoadoutState): void {
  state.pending = { ...loadout };
}
