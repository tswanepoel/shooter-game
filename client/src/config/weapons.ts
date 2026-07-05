export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WeaponRecipe {
  id: string;
  modelUrl: string;
  size: number;
  forwardAxis: Vec3;
  gripOffset: Vec3;
  viewModelOffset: Vec3;
  viewModelSwingScale: number;
  torsoChaseRate: number;
  gunChaseRateFast: number;
  gunChaseRateSlow: number;
  gunLagThresholdLow: number;
  gunLagThresholdHigh: number;
  gunPitchUpRateScale: number;
  gunPitchDownRateScale: number;
  fireRate: number;
  projectileSpeed: number;
  projectileMaxRange: number;
  bulletModelUrl: string;
  bulletLength: number;
  bulletForwardAxis: Vec3;
  recoilKickDistance: number;
  recoilKickPitch: number;
  recoilDecayRate: number;
  muzzleFlashOffset: Vec3;
  muzzleFlashDuration: number;
  damage: number;
}

// Shared Kenney blaster-kit rig tuning; per-weapon overrides capture feel differences.
const BLASTER_FORWARD_AXIS: Vec3 = { x: 0, y: 0, z: 1 };
const BLASTER_GRIP_OFFSET: Vec3 = { x: 0, y: -1.2, z: 0.2 };
const BLASTER_VIEW_OFFSET: Vec3 = { x: 0.25, y: -0.2, z: -0.5 };
const FOAM_BULLET: Pick<WeaponRecipe, "bulletModelUrl" | "bulletLength" | "bulletForwardAxis"> = {
  bulletModelUrl: "/models/bullet-foam-tip.glb",
  bulletLength: 0.12,
  bulletForwardAxis: { x: 0, y: 1, z: 0 },
};
const THICK_BULLET: Pick<WeaponRecipe, "bulletModelUrl" | "bulletLength" | "bulletForwardAxis"> = {
  bulletModelUrl: "/models/bullet-foam-thick.glb",
  bulletLength: 0.14,
  bulletForwardAxis: { x: 0, y: 1, z: 0 },
};

function muzzleFlashOffset(grip: Vec3): Vec3 {
  return { x: grip.x, y: grip.y - 0.3, z: grip.z };
}

function weapon(
  id: string,
  overrides: Partial<Omit<WeaponRecipe, "id" | "modelUrl">> = {},
): WeaponRecipe {
  const gripOffset = overrides.gripOffset ?? BLASTER_GRIP_OFFSET;
  return {
    id,
    modelUrl: `/models/${id}.glb`,
    size: 0.6,
    forwardAxis: BLASTER_FORWARD_AXIS,
    gripOffset,
    viewModelOffset: BLASTER_VIEW_OFFSET,
    viewModelSwingScale: 0.4,
    torsoChaseRate: 18,
    gunChaseRateFast: 55,
    gunChaseRateSlow: 45,
    gunLagThresholdLow: 0.03,
    gunLagThresholdHigh: 0.2,
    gunPitchUpRateScale: 0.6,
    gunPitchDownRateScale: 1.3,
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    ...FOAM_BULLET,
    recoilKickDistance: 0.015,
    recoilKickPitch: 0.005,
    recoilDecayRate: 8,
    muzzleFlashOffset: muzzleFlashOffset(gripOffset),
    muzzleFlashDuration: 0.06,
    damage: 16,
    ...overrides,
  };
}

export const WEAPON_RECIPES: Record<string, WeaponRecipe> = {
  "blaster-a": weapon("blaster-a", {
    size: 0.55,
    fireRate: 14,
    projectileSpeed: 700,
    projectileMaxRange: 80,
    gunChaseRateFast: 45,
    gunChaseRateSlow: 22,
    recoilKickDistance: 0.01,
    recoilKickPitch: 0.003,
  }),
  "blaster-b": weapon("blaster-b", {
    size: 0.45,
    viewModelOffset: { x: 0.22, y: -0.18, z: -0.42 },
    fireRate: 6,
    projectileSpeed: 600,
    projectileMaxRange: 60,
    torsoChaseRate: 21,
    gunChaseRateFast: 35,
    gunChaseRateSlow: 16,
    recoilKickDistance: 0.02,
    recoilKickPitch: 0.008,
  }),
  "blaster-c": weapon("blaster-c", {
    size: 0.65,
    fireRate: 7,
    projectileSpeed: 900,
    projectileMaxRange: 120,
    torsoChaseRate: 15,
    gunChaseRateFast: 32,
    gunChaseRateSlow: 14,
    gunPitchUpRateScale: 0.5,
    recoilKickDistance: 0.02,
    recoilKickPitch: 0.009,
    recoilDecayRate: 6,
  }),
  "blaster-d": weapon("blaster-d", {
    size: 0.62,
    fireRate: 2.5,
    projectileSpeed: 500,
    projectileMaxRange: 45,
    ...THICK_BULLET,
    torsoChaseRate: 14,
    gunChaseRateFast: 28,
    gunChaseRateSlow: 12,
    recoilKickDistance: 0.03,
    recoilKickPitch: 0.012,
    recoilDecayRate: 5,
  }),
  "blaster-e": weapon("blaster-e", {
    size: 0.7,
    viewModelOffset: { x: 0.2, y: -0.22, z: -0.55 },
    fireRate: 1.5,
    projectileSpeed: 1200,
    projectileMaxRange: 150,
    torsoChaseRate: 12,
    gunChaseRateFast: 25,
    gunChaseRateSlow: 10,
    gunPitchUpRateScale: 0.45,
    recoilKickDistance: 0.035,
    recoilKickPitch: 0.015,
    recoilDecayRate: 5,
    muzzleFlashDuration: 0.08,
    damage: 24,
  }),
  "blaster-g": weapon("blaster-g"),
  "blaster-h": weapon("blaster-h", {
    size: 0.5,
    fireRate: 11,
    projectileSpeed: 750,
    projectileMaxRange: 85,
    gunChaseRateFast: 42,
    gunChaseRateSlow: 20,
    recoilKickDistance: 0.012,
    recoilKickPitch: 0.004,
  }),
};

export const WEAPON_IDS = Object.keys(WEAPON_RECIPES);

export const DEFAULT_WEAPON_ID = "blaster-g";

let currentWeaponId = DEFAULT_WEAPON_ID;

export function getCurrentWeaponId(): string {
  return currentWeaponId;
}

export function getWeaponRecipe(id: string): WeaponRecipe {
  const recipe = WEAPON_RECIPES[id];
  if (!recipe) throw new Error(`unknown weapon recipe: ${id}`);
  return recipe;
}

export function getCurrentWeapon(): WeaponRecipe {
  return getWeaponRecipe(currentWeaponId);
}

export function resolveWeaponId(id: string | undefined): string {
  if (id && id in WEAPON_RECIPES) return id;
  return DEFAULT_WEAPON_ID;
}

export function setCurrentWeaponId(id: string): void {
  currentWeaponId = resolveWeaponId(id);
}

export function cycleWeaponId(): string {
  const index = WEAPON_IDS.indexOf(currentWeaponId);
  const next = WEAPON_IDS[(index + 1) % WEAPON_IDS.length];
  setCurrentWeaponId(next);
  return next;
}