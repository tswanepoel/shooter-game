export interface RecoilProfile {
  readonly fireRate: number;
  readonly kickPitch: number;
  readonly fatigueScale: number;
  /** Steady-state brace ceiling (radians) at zero fatigue. */
  readonly maxDriftPitch: number;
}

export interface ModuleConfig {
  /** Tuning knobs for reverse cascade: weapon -> arms -> torso -> head (eyes observe head). */
  readonly global: {
    readonly propagation: {
      readonly shoulderToTorso: number;
      readonly torsoToHead: number;
      /** Extra head impulse fraction (formerly a separate camera-only layer). */
      readonly headToCamera: number;
    };
    readonly propagateChase: { readonly torso: number; readonly head: number };
    readonly decayRate: { readonly shoulder: number; readonly torso: number; readonly head: number };
    readonly baseRecovery: { readonly shoulder: number; readonly torso: number; readonly head: number };
    readonly fatigueGainPerShot: number;
    readonly fatigueRecoverPerSecond: number;
    /** Secondary: tired brace recenters slightly less per kick decay. */
    readonly fatigueRecoveryPenalty: number;
    /** Primary: tired brace settles higher before equilibrium. */
    readonly fatiguePlateauLift: number;
    readonly maxFatigue: number;
    readonly yawJitter: number;
    readonly residualBleedDelay: number;
    readonly residualBleedRate: number;
    /** Slow residual bleed while trigger is held - balances in-fire accumulation. */
    readonly firingResidualBleedRate: number;
    /** Fatigue lowers in-fire bleed so the plateau sits higher when tired. */
    readonly fatigueFiringBleedReduction: number;
    readonly impulseSaturationPower: number;
    readonly minImpulseScale: number;
    readonly steadyStateJitterThreshold: number;
    readonly steadyStateJitter: number;
  };
  // TEMPORARY duplication of per-weapon fireRate/mass/projectileSpeed (baked into
  // these profiles ahead of time), owned here so recoil can resolve a weapon id
  // without reaching into the weapon catalog. Same tradeoff as weapon-fire and
  // ballistics; reconcile into a shared source once the real access pattern
  // across modules is visible.
  readonly profiles: Record<string, RecoilProfile>;
}
