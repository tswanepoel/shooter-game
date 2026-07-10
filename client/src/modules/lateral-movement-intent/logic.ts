import type { LateralMovementIntentState } from "./state.ts";

export function projectKeyDown(state: LateralMovementIntentState, code: string): void {
  switch (code) {
    case "KeyW":
      state.eagerBuffer.forward = true;
      break;
    case "KeyS":
      state.eagerBuffer.backward = true;
      break;
    case "KeyA":
      state.eagerBuffer.left = true;
      break;
    case "KeyD":
      state.eagerBuffer.right = true;
      break;
  }
}

export function projectKeyUp(state: LateralMovementIntentState, code: string): void {
  switch (code) {
    case "KeyW":
      state.eagerBuffer.forward = false;
      break;
    case "KeyS":
      state.eagerBuffer.backward = false;
      break;
    case "KeyA":
      state.eagerBuffer.left = false;
      break;
    case "KeyD":
      state.eagerBuffer.right = false;
      break;
  }
}

export function tick(state: LateralMovementIntentState): void {
  const { forward, backward, left, right } = state.eagerBuffer;
  state.forwardAxis = (forward ? 1 : 0) - (backward ? 1 : 0);
  state.strafeAxis = (right ? 1 : 0) - (left ? 1 : 0);
}

export function reset(state: LateralMovementIntentState): void {
  state.forwardAxis = 0;
  state.strafeAxis = 0;
  state.eagerBuffer.forward = false;
  state.eagerBuffer.backward = false;
  state.eagerBuffer.left = false;
  state.eagerBuffer.right = false;
}
