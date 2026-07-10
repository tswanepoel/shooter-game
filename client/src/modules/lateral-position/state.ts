export interface LateralPositionState {
  x: number;
  z: number;
  airHorizontalX: number;
  airHorizontalZ: number;
  airCarryBuffer: {
    jumpRequested: boolean;
    pendingCarryX: number;
    pendingCarryZ: number;
  };
}
