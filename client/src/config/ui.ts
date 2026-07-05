export const STATUS_BARS = {
  width: 200,
  height: 10,
  gap: 6,
  bottom: 20,
} as const;

export const KILL_FEED = {
  entryLifetime: 5,
  fadeDuration: 0.8,
  maxEntries: 6,
} as const;

export const DEATH_OVERLAY = {
  color: "rgba(48, 4, 8, 0.42)",
} as const;