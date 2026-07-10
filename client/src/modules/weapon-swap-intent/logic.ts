import type { WeaponSwapIntentState } from "./state.ts";

export function projectWheel(state: WeaponSwapIntentState): void {
  state.eagerBuffer.toggled = true;
}

export function tick(state: WeaponSwapIntentState): void {
  state.toggled = state.eagerBuffer.toggled;
  state.eagerBuffer.toggled = false;
}

export function reset(state: WeaponSwapIntentState): void {
  state.toggled = false;
  state.eagerBuffer.toggled = false;
}
