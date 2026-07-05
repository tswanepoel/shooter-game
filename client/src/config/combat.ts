// Must match server/GameConfig.cs combat constants exactly.
export const HEALTH = {
  max: 100,
  regenTickInterval: 1,
  regenQuietPeriod: 3,
  regenPerTick: 5,
  respawnDelay: 3,
} as const;