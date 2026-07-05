// Must match server/GameConfig.cs combat constants exactly.
export const HEALTH = {
  max: 100,
  regenTickInterval: 0.1,
  regenQuietPeriod: 6,
  regenPerTick: 4,
  respawnDelay: 3,
} as const;