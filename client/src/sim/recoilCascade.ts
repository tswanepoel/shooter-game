import { getRecoilProfile, RECOIL_GLOBAL, type RecoilProfile } from "../config/recoil.ts";
import type { WeaponRecipe } from "../config/weapons.ts";

export interface RecoilJointState {
  kickPitch: number;
  kickYaw: number;
  residualPitch: number;
  residualYaw: number;
}

export interface RecoilCascadeState {
  shoulder: RecoilJointState;
  torso: RecoilJointState;
  head: RecoilJointState;
  fatigue: number;
  timeSinceLastShot: number;
  activeProfile: RecoilProfile | null;
  seedId: string;
  shotCount: number;
  recoilFrame: number;
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

export function createRecoilState(seedId = ""): RecoilCascadeState {
  return {
    shoulder: { ...ZERO_JOINT },
    torso: { ...ZERO_JOINT },
    head: { ...ZERO_JOINT },
    fatigue: 0,
    timeSinceLastShot: 999,
    activeProfile: null,
    seedId,
    shotCount: 0,
    recoilFrame: 0,
  };
}

export function resetRecoil(state: RecoilCascadeState): void {
  const seedId = state.seedId;
  Object.assign(state, createRecoilState(seedId));
}

function recoilUnitRandom(state: RecoilCascadeState, salt: number): number {
  const key = `${state.seedId}:${state.shotCount}:${state.recoilFrame}:${salt}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) / 4294967295;
}

function chase(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function recoveryCap(fatigue: number, base: number): number {
  return base * (1 - RECOIL_GLOBAL.fatigueRecoveryPenalty * fatigue);
}

function braceCeiling(profile: RecoilProfile, fatigue: number): number {
  return profile.maxDriftPitch * (1 + RECOIL_GLOBAL.fatiguePlateauLift * fatigue);
}

function impulseScale(state: RecoilCascadeState, profile: RecoilProfile): number {
  const ceiling = braceCeiling(profile, state.fatigue);
  if (ceiling <= 0) return 1;

  const drift = Math.max(0, totalPitch(state.shoulder));
  const t = Math.min(1, drift / ceiling);
  const saturated = 1 - Math.pow(t, RECOIL_GLOBAL.impulseSaturationPower);
  return Math.max(RECOIL_GLOBAL.minImpulseScale, saturated);
}

function decayJoint(joint: RecoilJointState, rate: number, baseRecovery: number, fatigue: number, dt: number): void {
  const cap = recoveryCap(fatigue, baseRecovery);
  const pitchStep = joint.kickPitch * (1 - Math.exp(-rate * dt));
  const yawStep = joint.kickYaw * (1 - Math.exp(-rate * dt));

  joint.kickPitch -= pitchStep;
  joint.kickYaw -= yawStep;

  joint.residualPitch += pitchStep * (1 - cap);
  joint.residualYaw += yawStep * (1 - cap);
}

function bleedResidual(joint: RecoilJointState, amount: number): void {
  joint.residualPitch *= 1 - amount;
  joint.residualYaw *= 1 - amount;
}

function bleedAllResiduals(state: RecoilCascadeState, amount: number): void {
  bleedResidual(state.shoulder, amount);
  bleedResidual(state.torso, amount);
  bleedResidual(state.head, amount);
}

function totalPitch(joint: RecoilJointState): number {
  return joint.kickPitch + joint.residualPitch;
}

function totalYaw(joint: RecoilJointState): number {
  return joint.kickYaw + joint.residualYaw;
}

function headImpulseBoost(): number {
  return 1 + RECOIL_GLOBAL.propagation.headToCamera * 0.4;
}

function applyScaledImpulse(state: RecoilCascadeState, kickPitch: number, kickYaw: number): void {
  const { propagation } = RECOIL_GLOBAL;
  const headBoost = headImpulseBoost();

  state.shoulder.kickPitch += kickPitch;
  state.shoulder.kickYaw += kickYaw;

  const torsoShare = kickPitch * propagation.shoulderToTorso * 0.5;
  const headShare = torsoShare * propagation.torsoToHead * 0.45;
  state.torso.kickPitch += torsoShare;
  state.head.kickPitch += headShare * headBoost;
  state.torso.kickYaw += kickYaw * propagation.shoulderToTorso * 0.5;
  state.head.kickYaw +=
    kickYaw * propagation.shoulderToTorso * propagation.torsoToHead * 0.45 * headBoost;
}

function applySteadyStateJitter(
  state: RecoilCascadeState,
  profile: RecoilProfile,
  dt: number,
  firing: boolean,
): void {
  if (!firing || state.fatigue <= 0) return;

  const ceiling = braceCeiling(profile, state.fatigue);
  const drift = Math.max(0, totalPitch(state.shoulder));
  if (drift / ceiling < RECOIL_GLOBAL.steadyStateJitterThreshold) return;

  const amp = RECOIL_GLOBAL.steadyStateJitter * state.fatigue * profile.kickPitch * dt * 45;
  state.shoulder.kickYaw += (recoilUnitRandom(state, 11) * 2 - 1) * amp * 0.4;
  state.head.kickPitch += (recoilUnitRandom(state, 12) * 2 - 1) * amp;
  state.head.kickYaw += (recoilUnitRandom(state, 13) * 2 - 1) * amp * 0.65;
}

export function getRecoilPoseOffsets(state: RecoilCascadeState): RecoilPoseOffsets {
  return {
    torsoPitch: totalPitch(state.torso),
    torsoYaw: totalYaw(state.torso),
    shoulderPitch: totalPitch(state.shoulder),
    shoulderYaw: totalYaw(state.shoulder),
    headPitch: totalPitch(state.head),
    headYaw: totalYaw(state.head),
  };
}

export function isRecoilFiring(state: RecoilCascadeState, fireRate: number | undefined): boolean {
  if (!fireRate || fireRate <= 0) return false;
  return state.timeSinceLastShot < (1 / fireRate) * 1.6;
}

export function applyRecoilImpulse(state: RecoilCascadeState, weapon: WeaponRecipe): void {
  const profile = getRecoilProfile(weapon);
  applyRecoilImpulseFromProfile(state, profile);
}

export function applyRecoilImpulseFromProfile(state: RecoilCascadeState, profile: RecoilProfile): void {
  state.activeProfile = profile;

  const scale = impulseScale(state, profile);
  const kickPitch = profile.kickPitch * scale;
  const ceiling = braceCeiling(profile, state.fatigue);
  const nearPlateau = totalPitch(state.shoulder) / ceiling >= RECOIL_GLOBAL.steadyStateJitterThreshold;
  const jitterMul = nearPlateau ? 1 + RECOIL_GLOBAL.steadyStateJitter * state.fatigue : 1;
  const kickYaw =
    (recoilUnitRandom(state, 0) * 2 - 1) * kickPitch * RECOIL_GLOBAL.yawJitter * jitterMul;

  applyScaledImpulse(state, kickPitch, kickYaw);

  state.shotCount += 1;
  state.fatigue = Math.min(
    RECOIL_GLOBAL.maxFatigue,
    state.fatigue + RECOIL_GLOBAL.fatigueGainPerShot * profile.fatigueScale,
  );
  state.timeSinceLastShot = 0;
}

export function tickRecoilCascade(state: RecoilCascadeState, dt: number, firing: boolean): void {
  if (firing) {
    state.timeSinceLastShot = 0;
  } else {
    state.timeSinceLastShot += dt;
    state.fatigue = Math.max(
      0,
      state.fatigue - RECOIL_GLOBAL.fatigueRecoverPerSecond * dt,
    );
  }

  const { propagation, propagateChase, decayRate, baseRecovery } = RECOIL_GLOBAL;

  state.torso.kickPitch = chase(
    state.torso.kickPitch,
    state.shoulder.kickPitch * propagation.shoulderToTorso,
    propagateChase.torso,
    dt,
  );
  state.torso.kickYaw = chase(
    state.torso.kickYaw,
    state.shoulder.kickYaw * propagation.shoulderToTorso,
    propagateChase.torso,
    dt,
  );

  state.head.kickPitch = chase(
    state.head.kickPitch,
    state.torso.kickPitch * propagation.torsoToHead,
    propagateChase.head,
    dt,
  );
  state.head.kickYaw = chase(
    state.head.kickYaw,
    state.torso.kickYaw * propagation.torsoToHead,
    propagateChase.head,
    dt,
  );

  decayJoint(state.shoulder, decayRate.shoulder, baseRecovery.shoulder, state.fatigue, dt);
  decayJoint(state.torso, decayRate.torso, baseRecovery.torso, state.fatigue, dt);
  decayJoint(state.head, decayRate.head, baseRecovery.head, state.fatigue, dt);

  let residualBleedRate = 0;
  if (firing) {
    residualBleedRate =
      RECOIL_GLOBAL.firingResidualBleedRate *
      (1 - state.fatigue * RECOIL_GLOBAL.fatigueFiringBleedReduction);
  } else if (state.timeSinceLastShot >= RECOIL_GLOBAL.residualBleedDelay) {
    residualBleedRate = RECOIL_GLOBAL.residualBleedRate;
  }

  if (residualBleedRate > 0) {
    bleedAllResiduals(state, 1 - Math.exp(-residualBleedRate * dt));
  }

  if (state.activeProfile) {
    applySteadyStateJitter(state, state.activeProfile, dt, firing);
  }

  state.recoilFrame += 1;
}