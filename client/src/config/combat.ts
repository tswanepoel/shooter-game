// Must match server/GameConfig.cs combat constants exactly.
export const HEALTH = {
  max: 100,
  regenTickInterval: 0.1,
  regenQuietPeriod: 6,
  regenPerTick: 4,
} as const;

export const RESPAWN = {
  minDelay: 1.5,
} as const;

/** Death / forfeit pacing — respawn min must match server/GameConfig.cs. */
export const DEATH_SCREEN = {
  suicideHoldSeconds: 0.5,
  suicideCooldownSeconds: 4,
  recentDamageBlockSeconds: 2,
} as const;