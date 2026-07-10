import type { SprintIntentState } from "./state.ts";

export function projectKeyDown(state: SprintIntentState, code: string): void {
  if (code === "ShiftLeft") state.eagerBuffer.sprint = true;
}

export function projectKeyUp(state: SprintIntentState, code: string): void {
  if (code === "ShiftLeft") state.eagerBuffer.sprint = false;
}

export function tick(state: SprintIntentState): void {
  state.sprint = state.eagerBuffer.sprint;
}

export function reset(state: SprintIntentState): void {
  state.sprint = false;
  state.eagerBuffer.sprint = false;
}
