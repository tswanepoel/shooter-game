import type { WeaponRecipe } from "./weapons.ts";

/**
 * Shared ground truth for the fire event: muzzle impulse = mass x muzzle velocity.
 * The projectile carries this impulse forward (momentum, decaying via drag, driving
 * impact damage); recoil is the equal-and-opposite reaction driving the kick.
 * Must match server/GameConfig.cs DamagePerMomentum calibration.
 */
export const BALLISTICS = {
  /** Converts muzzle impulse (mass x speed) into recoil kick pitch (radians). */
  impulseToKickPitch: 4e-5,
  /** Exponential velocity decay per unit distance traveled. */
  dragPerUnitDistance: 0.008,
} as const;

export function muzzleImpulse(weapon: WeaponRecipe): number {
  return weapon.mass * weapon.projectileSpeed;
}

export function speedAtDistance(weapon: WeaponRecipe, distanceTraveled: number): number {
  return weapon.projectileSpeed * Math.exp(-BALLISTICS.dragPerUnitDistance * distanceTraveled);
}
