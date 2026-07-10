import type { WeaponFireIntentState } from "./state.ts";

export function projectMouseDown(state: WeaponFireIntentState): void {
  state.eagerBuffer.fire = true;
}

export function projectMouseUp(state: WeaponFireIntentState): void {
  state.eagerBuffer.fire = false;
}

export function tick(state: WeaponFireIntentState): void {
  state.fire = state.eagerBuffer.fire;
}

export function reset(state: WeaponFireIntentState): void {
  state.fire = false;
  state.eagerBuffer.fire = false;
}
