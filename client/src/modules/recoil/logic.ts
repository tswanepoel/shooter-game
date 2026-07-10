import { type RecoilState, type RecoilJointState, type RecoilPoseOffsets, config } from "./state.ts";
import type { RecoilProfile } from "./config.ts";

const ZERO_JOINT: RecoilJointState = {
  kickPitch: 0,
  kickYaw: 0,
  residualPitch: 0,
  residualYaw: 0,
};

export function reset(state: RecoilState): void {
  state.shoulder = { ...ZERO_JOINT };
  state.torso = { ...ZERO_JOINT };
  state.head = { ...ZERO_JOINT };
  state.fatigue = 0;
  state.timeSinceLastShot = 999;
  state.activeWeaponId = undefined;
  state.shotCount = 0;
  state.recoilFrame = 0;
  state.eagerBuffer.pendingImpulseWeaponId = undefined;
}

export function projectInternalImpulse(state: RecoilState, weaponId: string): void {
  state.eagerBuffer.pendingImpulseWeaponId = weaponId;
}

export function isFiring(state: RecoilState, weaponId: string | undefined): boolean {
  const fireRate = weaponId ? config.profiles[weaponId]?.fireRate : undefined;
  if (!fireRate || fireRate <= 0) return false;
  return state.timeSinceLastShot < (1 / fireRate) * 1.6;
}

export function getPoseOffsets(state: RecoilState): RecoilPoseOffsets {
  return {
    torsoPitch: totalPitch(state.torso),
    torsoYaw: totalYaw(state.torso),
    shoulderPitch: totalPitch(state.shoulder),
    shoulderYaw: totalYaw(state.shoulder),
    headPitch: totalPitch(state.head),
    headYaw: totalYaw(state.head),
  };
}

export function tick(state: RecoilState, dt: number, firing: boolean): void {
  const pendingWeaponId = state.eagerBuffer.pendingImpulseWeaponId;
  state.eagerBuffer.pendingImpulseWeaponId = undefined;
  if (pendingWeaponId) {
    const profile = config.profiles[pendingWeaponId];
    if (profile) applyImpulse(state, pendingWeaponId, profile);
  }

  if (firing) {
    state.timeSinceLastShot = 0;
  } else {
    state.timeSinceLastShot += dt;
    state.fatigue = Math.max(0, state.fatigue - config.global.fatigueRecoverPerSecond * dt);
  }

  const { propagation, propagateChase, decayRate, baseRecovery } = config.global;

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
      config.global.firingResidualBleedRate * (1 - state.fatigue * config.global.fatigueFiringBleedReduction);
  } else if (state.timeSinceLastShot >= config.global.residualBleedDelay) {
    residualBleedRate = config.global.residualBleedRate;
  }

  if (residualBleedRate > 0) {
    bleedAllResiduals(state, 1 - Math.exp(-residualBleedRate * dt));
  }

  if (state.activeWeaponId) {
    const profile = config.profiles[state.activeWeaponId];
    if (profile) applySteadyStateJitter(state, profile, dt, firing);
  }

  state.recoilFrame += 1;
}

function applyImpulse(state: RecoilState, weaponId: string, profile: RecoilProfile): void {
  state.activeWeaponId = weaponId;

  const scale = impulseScale(state, profile);
  const kickPitch = profile.kickPitch * scale;
  const ceiling = braceCeiling(profile, state.fatigue);
  const nearPlateau = totalPitch(state.shoulder) / ceiling >= config.global.steadyStateJitterThreshold;
  const jitterMul = nearPlateau ? 1 + config.global.steadyStateJitter * state.fatigue : 1;
  const kickYaw = (recoilUnitRandom(state, 0) * 2 - 1) * kickPitch * config.global.yawJitter * jitterMul;

  applyScaledImpulse(state, kickPitch, kickYaw);

  state.shotCount += 1;
  state.fatigue = Math.min(
    config.global.maxFatigue,
    state.fatigue + config.global.fatigueGainPerShot * profile.fatigueScale,
  );
  state.timeSinceLastShot = 0;
}

function recoilUnitRandom(state: RecoilState, salt: number): number {
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
  return base * (1 - config.global.fatigueRecoveryPenalty * fatigue);
}

function braceCeiling(profile: RecoilProfile, fatigue: number): number {
  return profile.maxDriftPitch * (1 + config.global.fatiguePlateauLift * fatigue);
}

function impulseScale(state: RecoilState, profile: RecoilProfile): number {
  const ceiling = braceCeiling(profile, state.fatigue);
  if (ceiling <= 0) return 1;

  const drift = Math.max(0, totalPitch(state.shoulder));
  const t = Math.min(1, drift / ceiling);
  const saturated = 1 - Math.pow(t, config.global.impulseSaturationPower);
  return Math.max(config.global.minImpulseScale, saturated);
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

function bleedAllResiduals(state: RecoilState, amount: number): void {
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
  return 1 + config.global.propagation.headToCamera * 0.4;
}

function applyScaledImpulse(state: RecoilState, kickPitch: number, kickYaw: number): void {
  const { propagation } = config.global;
  const headBoost = headImpulseBoost();

  state.shoulder.kickPitch += kickPitch;
  state.shoulder.kickYaw += kickYaw;

  const torsoShare = kickPitch * propagation.shoulderToTorso * 0.5;
  const headShare = torsoShare * propagation.torsoToHead * 0.45;
  state.torso.kickPitch += torsoShare;
  state.head.kickPitch += headShare * headBoost;
  state.torso.kickYaw += kickYaw * propagation.shoulderToTorso * 0.5;
  state.head.kickYaw += kickYaw * propagation.shoulderToTorso * propagation.torsoToHead * 0.45 * headBoost;
}

function applySteadyStateJitter(state: RecoilState, profile: RecoilProfile, dt: number, firing: boolean): void {
  if (!firing || state.fatigue <= 0) return;

  const ceiling = braceCeiling(profile, state.fatigue);
  const drift = Math.max(0, totalPitch(state.shoulder));
  if (drift / ceiling < config.global.steadyStateJitterThreshold) return;

  const amp = config.global.steadyStateJitter * state.fatigue * profile.kickPitch * dt * 45;
  state.shoulder.kickYaw += (recoilUnitRandom(state, 11) * 2 - 1) * amp * 0.4;
  state.head.kickPitch += (recoilUnitRandom(state, 12) * 2 - 1) * amp;
  state.head.kickYaw += (recoilUnitRandom(state, 13) * 2 - 1) * amp * 0.65;
}
