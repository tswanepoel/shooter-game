export interface WeaponBallistics {
  readonly speed: number;
  readonly maxRange: number;
}

export interface ModuleConfig {
  readonly dragPerUnitDistance: number;
  readonly weapons: Record<string, WeaponBallistics>;
}
