export interface ChaseConfig {
  readonly snappy: number;
  readonly laggy: number;
  readonly speedScale: number;
}

export interface FlexConfig {
  /** Radians. Bend toward the body center vs. away from it, at max look angle. */
  readonly max: { readonly inward: number; readonly outward: number };
  readonly chase: ChaseConfig;
}

export interface PivotConfig {
  readonly chase: ChaseConfig;
}

export interface ModuleConfig {
  readonly torso: { readonly pivot: PivotConfig; readonly flex: FlexConfig };
  /** No pivot: there's no shoulder-yaw in this rig, only shoulder-pitch (flex). */
  readonly shoulder: { readonly flex: FlexConfig };
  readonly head: { readonly pivot: PivotConfig; readonly flex: FlexConfig };
  readonly smoothing: number;
}
