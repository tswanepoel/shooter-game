export interface ElevationState {
  y: number;
  velocityY: number;
  grounded: boolean;
  eagerBuffer: {
    jumpRequested: boolean;
  };
}
