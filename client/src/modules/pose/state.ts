export interface PoseState {
  targetYaw: number;
  targetPitch: number;
  lastTargetYaw: number;
  lastTargetPitch: number;
  smoothedInputSpeed: number;
  smoothedYawSpeed: number;
  smoothedPitchSpeed: number;
  torsoYaw: number;
  torsoPitch: number;
  headYaw: number;
  headPitch: number;
  shoulderPitch: number;
  armPitch: number;
}
