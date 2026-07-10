export interface WeaponFireIntentState {
  fire: boolean;
  eagerBuffer: {
    fire: boolean;
  };
}

export function createInitialState(): WeaponFireIntentState {
  return {
    fire: false,
    eagerBuffer: {
      fire: false,
    },
  };
}
