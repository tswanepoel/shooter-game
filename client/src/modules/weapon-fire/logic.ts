import { type WeaponFireState, config } from "./state.ts";

export function tick(
  state: WeaponFireState,
  triggerHeld: boolean,
  alive: boolean,
  controlEngaged: boolean,
  weaponId: string,
  dt: number,
): boolean {
  state.cooldown = Math.max(0, state.cooldown - dt);

  const fireRate = config.fireRateByWeaponId[weaponId];
  if (!triggerHeld || !alive || !controlEngaged || !fireRate || state.cooldown > 0) return false;

  state.cooldown += 1 / fireRate;
  return true;
}
