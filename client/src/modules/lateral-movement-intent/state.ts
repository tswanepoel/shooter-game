export interface LateralMovementIntentState {
  forwardAxis: number; // -1 backward, 0 none, 1 forward
  strafeAxis: number; // -1 left, 0 none, 1 right

  eagerBuffer: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  };
}

export function createInitialState(): LateralMovementIntentState {
  return {
    forwardAxis: 0,
    strafeAxis: 0,
    eagerBuffer: {
      forward: false,
      backward: false,
      left: false,
      right: false,
    },
  };
}
