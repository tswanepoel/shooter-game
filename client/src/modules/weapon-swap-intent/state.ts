export interface WeaponSwapIntentState {
  toggled: boolean; // true for exactly one tick() after a wheel flick

  eagerBuffer: {
    toggled: boolean;
  };
}

export function createInitialState(): WeaponSwapIntentState {
  return {
    toggled: false,
    eagerBuffer: {
      toggled: false,
    },
  };
}
