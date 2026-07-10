import rawConfig from "./config.json";
import type { ModuleConfig } from "./config.ts";

export const config: ModuleConfig = Object.freeze(rawConfig);

export interface RecoilJointState {
  kickPitch: number;
  kickYaw: number;
  residualPitch: number;
  residualYaw: number;
}

export interface RecoilState {
  shoulder: RecoilJointState;
  torso: RecoilJointState;
  head: RecoilJointState;
  fatigue: number;
  timeSinceLastShot: number;
  activeWeaponId: string | undefined;
  seedId: string;
  shotCount: number;
  recoilFrame: number;
  eagerBuffer: {
    pendingImpulseWeaponId: string | undefined;
  };
}

export interface RecoilPoseOffsets {
  torsoPitch: number;
  torsoYaw: number;
  shoulderPitch: number;
  shoulderYaw: number;
  headPitch: number;
  headYaw: number;
}

const ZERO_JOINT: RecoilJointState = {
  kickPitch: 0,
  kickYaw: 0,
  residualPitch: 0,
  residualYaw: 0,
};

export function createInitialState(seedId = ""): RecoilState {
  return {
    shoulder: { ...ZERO_JOINT },
    torso: { ...ZERO_JOINT },
    head: { ...ZERO_JOINT },
    fatigue: 0,
    timeSinceLastShot: 999,
    activeWeaponId: undefined,
    seedId,
    shotCount: 0,
    recoilFrame: 0,
    eagerBuffer: {
      pendingImpulseWeaponId: undefined,
    },
  };
}
