export { createInitialState, type RecoilState, type RecoilJointState, type RecoilPoseOffsets } from "./state.ts";

import { reset, projectInternalImpulse, isFiring, getPoseOffsets, tick } from "./logic.ts";

export const RecoilModule = {
  reset,
  projectInternalImpulse,
  isFiring,
  getPoseOffsets,
  tick,
} as const;
