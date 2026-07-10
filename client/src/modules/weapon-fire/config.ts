export interface ModuleConfig {
  // TEMPORARY duplication of config/weapons.ts's per-weapon fireRate, owned
  // here so weapon-fire can resolve a weapon id without reaching into the
  // weapon catalog. Reconcile into a shared source once more modules
  // (projectile-ballistics, recoil, remoteSync) show the real access pattern.
  readonly fireRateByWeaponId: Record<string, number>;
}
