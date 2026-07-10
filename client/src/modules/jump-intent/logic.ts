import type { JumpIntentState } from "./state.ts";

export function projectKeyDown(state: JumpIntentState, code: string): void {
  if (code === "Space") state.eagerBuffer.jump = true;
}

export function tick(state: JumpIntentState): void {
  state.jump = state.eagerBuffer.jump;
  state.eagerBuffer.jump = false;
}

export function reset(state: JumpIntentState): void {
  state.jump = false;
  state.eagerBuffer.jump = false;
}
