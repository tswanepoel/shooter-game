export interface JumpIntentState {
  jump: boolean; // true for exactly one tick() after a jump keydown

  eagerBuffer: {
    jump: boolean;
  };
}

export function createInitialState(): JumpIntentState {
  return {
    jump: false,
    eagerBuffer: {
      jump: false,
    },
  };
}
