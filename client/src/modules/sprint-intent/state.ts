export interface SprintIntentState {
  sprint: boolean;

  eagerBuffer: {
    sprint: boolean;
  };
}

export function createInitialState(): SprintIntentState {
  return {
    sprint: false,
    eagerBuffer: {
      sprint: false,
    },
  };
}
