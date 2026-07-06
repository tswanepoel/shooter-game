export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WeaponRecipe {
  id: string;
  modelUrl: string;
  forwardAxis: Vec3;
  gripOffset: Vec3;
  fireRate: number;
  projectileSpeed: number;
  projectileMaxRange: number;
  bulletModelUrl: string;
  bulletLength: number;
  bulletForwardAxis: Vec3;
  muzzleFlashOffset: Vec3;
  muzzleFlashDuration: number;
}

export const WEAPON_RECIPES: Record<string, WeaponRecipe> = {
  "blaster-a": {
    id: "blaster-a",
    modelUrl: "/models/blaster-a.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.14, z: 0.34 },
    fireRate: 14,
    projectileSpeed: 700,
    projectileMaxRange: 80,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.41, z: 0.29 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-b": {
    id: "blaster-b",
    modelUrl: "/models/blaster-b.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1, z: 0.3 },
    fireRate: 6,
    projectileSpeed: 600,
    projectileMaxRange: 60,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.41, z: 0.29 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-c": {
    id: "blaster-c",
    modelUrl: "/models/blaster-c.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.11, z: 0.2 },
    fireRate: 7,
    projectileSpeed: 900,
    projectileMaxRange: 120,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.77, z: -0.04 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-d": {
    id: "blaster-d",
    modelUrl: "/models/blaster-d.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.11, z: 0.18 },
    fireRate: 2.5,
    projectileSpeed: 500,
    projectileMaxRange: 45,
    bulletModelUrl: "/models/bullet-foam-thick.glb",
    bulletLength: 0.14,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.399, z: 0.16 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-e": {
    id: "blaster-e",
    modelUrl: "/models/blaster-e.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -2.34, z: 0.22 },
    fireRate: 1.5,
    projectileSpeed: 1200,
    projectileMaxRange: 150,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: -0.02, y: -1.78, z: 0.56 },
    muzzleFlashDuration: 0.08,
  },
  "blaster-f": {
    id: "blaster-f",
    modelUrl: "/models/blaster-f.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.39, z: 0.19 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-g": {
    id: "blaster-g",
    modelUrl: "/models/blaster-g.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.27, z: 0.22 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-h": {
    id: "blaster-h",
    modelUrl: "/models/blaster-h.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.25, z: 0.24 },
    fireRate: 11,
    projectileSpeed: 750,
    projectileMaxRange: 85,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.73, z: 0.05 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-i": {
    id: "blaster-i",
    modelUrl: "/models/blaster-i.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -0.93, z: 0.22 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-j": {
    id: "blaster-j",
    modelUrl: "/models/blaster-j.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.2, z: 0.15 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-k": {
    id: "blaster-k",
    modelUrl: "/models/blaster-k.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.09, z: 0.2 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-l": {
    id: "blaster-l",
    modelUrl: "/models/blaster-l.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.16, z: 0.2 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-m": {
    id: "blaster-m",
    modelUrl: "/models/blaster-m.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.18, z: 0.26 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-n": {
    id: "blaster-n",
    modelUrl: "/models/blaster-n.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -0.99, z: 0.22 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-o": {
    id: "blaster-o",
    modelUrl: "/models/blaster-o.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.06, z: 0.19 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-p": {
    id: "blaster-p",
    modelUrl: "/models/blaster-p.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.21, z: 0.14 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-q": {
    id: "blaster-q",
    modelUrl: "/models/blaster-q.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.28, z: 0.19 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
  "blaster-r": {
    id: "blaster-r",
    modelUrl: "/models/blaster-r.glb",
    forwardAxis: { x: 0, y: 0, z: 1 },
    gripOffset: { x: 0, y: -1.18, z: 0.1 },
    fireRate: 10,
    projectileSpeed: 800,
    projectileMaxRange: 100,
    bulletModelUrl: "/models/bullet-foam-tip.glb",
    bulletLength: 0.12,
    bulletForwardAxis: { x: 0, y: 1, z: 0 },
    muzzleFlashOffset: { x: 0, y: -1.5, z: 0.2 },
    muzzleFlashDuration: 0.06,
  },
};

export const WEAPON_IDS = [
  "blaster-a",
  "blaster-b",
  "blaster-c",
  "blaster-d",
  "blaster-e",
  "blaster-f",
  "blaster-g",
  "blaster-h",
  "blaster-i",
  "blaster-j",
  "blaster-k",
  "blaster-l",
  "blaster-m",
  "blaster-n",
  "blaster-o",
  "blaster-p",
  "blaster-q",
  "blaster-r",
] as const;

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
  const index = WEAPON_IDS.indexOf(currentWeaponId as (typeof WEAPON_IDS)[number]);
  const next = WEAPON_IDS[(index + 1) % WEAPON_IDS.length];
  setCurrentWeaponId(next);
  return next;
}