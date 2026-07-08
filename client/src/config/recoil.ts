import type { WeaponRecipe } from "./weapons.ts";

export interface RecoilProfile {
  kickPitch: number;
  fatigueScale: number;
  /** Steady-state brace ceiling (radians) at zero fatigue. */
  maxDriftPitch: number;
}

/** Tuning knobs for reverse cascade: weapon → arms → torso → head (eyes observe head). */
export const RECOIL_GLOBAL = {
  propagation: {
    shoulderToTorso: 0.58,
    torsoToHead: 0.52,
    /** Extra head impulse fraction (formerly a separate camera-only layer). */
    headToCamera: 0.88,
  },
  propagateChase: {
    torso: 32,
    head: 24,
  },
  decayRate: {
    shoulder: 14,
    torso: 11,
    head: 9,
  },
  baseRecovery: {
    shoulder: 0.84,
    torso: 0.76,
    head: 0.66,
  },
  fatigueGainPerShot: 0.09,
  fatigueRecoverPerSecond: 0.4,
  /** Secondary: tired brace recenters slightly less per kick decay. */
  fatigueRecoveryPenalty: 0.28,
  /** Primary: tired brace settles higher before equilibrium. */
  fatiguePlateauLift: 0.38,
  maxFatigue: 1,
  yawJitter: 0.18,
  residualBleedDelay: 0,
  residualBleedRate: 8.8,
  /** Slow residual bleed while trigger is held — balances in-fire accumulation. */
  firingResidualBleedRate: 0.62,
  /** Fatigue lowers in-fire bleed so the plateau sits higher when tired. */
  fatigueFiringBleedReduction: 0.48,
  impulseSaturationPower: 1.55,
  minImpulseScale: 0.1,
  steadyStateJitterThreshold: 0.6,
  steadyStateJitter: 0.9,
} as const;

const REFERENCE_FIRE_RATE = 14;
const BASE_KICK_PITCH = (0.7 * Math.PI) / 180;
const BASE_MAX_DRIFT_PITCH = (3 * Math.PI) / 180;

export function getRecoilProfile(weapon: WeaponRecipe): RecoilProfile {
  const fireRateScale = REFERENCE_FIRE_RATE / weapon.fireRate;
  const rateFactor = weapon.fireRate / REFERENCE_FIRE_RATE;
  return {
    kickPitch: BASE_KICK_PITCH * Math.sqrt(fireRateScale),
    fatigueScale: 1 + rateFactor * 0.35,
    maxDriftPitch: BASE_MAX_DRIFT_PITCH * Math.sqrt(fireRateScale) * (1 + rateFactor * 0.12),
  };
}