export interface ModuleConfig {
  readonly max: number;
  readonly drainPerSecond: number;
  readonly recoverPerSecond: number;
  readonly enterFloor: number;
}
