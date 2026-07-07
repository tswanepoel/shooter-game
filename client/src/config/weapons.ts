import type { Vec3 } from "../types/vec3.ts";

export type { Vec3 };

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
  muzzlePoints: readonly Vec3[];
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
    muzzlePoints: [{ x: 0, y: -1.7, z: 0.42 }],
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
    muzzlePoints: [{ x: 0, y: -1.39, z: 0.32 }],
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
    muzzlePoints: [{ x: 0, y: -1.47, z: 0.23 }],
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
    muzzlePoints: [{ x: 0, y: -1.795, z: 0.265 }],
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
    muzzlePoints: [{ x: 0.07, y: -2.34, z: 0.26 }],
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
    muzzlePoints: [{ x: 0, y: -2.37, z: 0.26 }],
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
    muzzlePoints: [{ x: 0, y: -1.8, z: 0.34 }],
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
    muzzlePoints: [{ x: 0, y: -1.73, z: 0.28 }],
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
    muzzlePoints: [
      { x: 0, y: -1.32, z: 0.26 },
      { x: 0, y: -1.32, z: 0.15 }
    ],
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
    muzzlePoints: [
      { x: -0.045, y: -1.655, z: 0.29 },
      { x: 0.045, y: -1.655, z: 0.29 }
    ],
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
    muzzlePoints: [{ x: 0, y: -1.44, z: 0.18 }],
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
    muzzlePoints: [
      { x: -0.1, y: -1.58, z: 0.26 },
      { x: 0.1, y: -1.58, z: 0.26 }
    ],
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
    muzzlePoints: [{ x: 0, y: -1.65, z: 0.37 }],
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
    muzzlePoints: [{ x: 0, y: -1.47, z: 0.32 }],
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
    muzzlePoints: [
      { x: -0.05, y: -1.35, z: 0.25 },
      { x: 0.05, y: -1.35, z: 0.25 },
      { x: -0.05, y: -1.35, z: 0.15 },
      { x: 0.05, y: -1.35, z: 0.15 }
    ],
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
    muzzlePoints: [
      { x: 0, y: -1.855, z: 0.235 },
      { x: 0, y: -1.855, z: 0.14 }
    ],
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
    muzzlePoints: [
      { x: 0, y: -1.82, z: 0.28 },
      { x: 0, y: -1.82, z: 0.06 }
    ],
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
    muzzlePoints: [{ x: 0, y: -1.81, z: 0.23 }],
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

export type WeaponClass =
  | "launcher"
  | "pistol"
  | "smg"
  | "assaultRifle"
  | "sniperRifle"
  | "shotgun";

/** Per-letter weapon category used for slot restrictions and picker layout. */
export const WEAPON_CLASS: Record<(typeof WEAPON_IDS)[number], WeaponClass> = {
  "blaster-a": "launcher",
  "blaster-b": "pistol",
  "blaster-c": "smg",
  "blaster-d": "assaultRifle",
  "blaster-e": "sniperRifle",
  "blaster-f": "sniperRifle",
  "blaster-g": "smg",
  "blaster-h": "smg",
  "blaster-i": "pistol",
  "blaster-j": "shotgun",
  "blaster-k": "shotgun",
  "blaster-l": "smg",
  "blaster-m": "smg",
  "blaster-n": "assaultRifle",
  "blaster-o": "shotgun",
  "blaster-p": "smg",
  "blaster-q": "assaultRifle",
  "blaster-r": "assaultRifle",
};

const SECONDARY_WEAPON_CLASSES = new Set<WeaponClass>(["launcher", "pistol", "shotgun"]);

export function getWeaponClass(id: string): WeaponClass | undefined {
  return WEAPON_CLASS[id as (typeof WEAPON_IDS)[number]];
}

export function weaponAllowsSlot(weaponId: string, slot: "primary" | "secondary"): boolean {
  const weaponClass = getWeaponClass(weaponId);
  if (weaponClass === undefined) return false;
  const secondaryOnly = SECONDARY_WEAPON_CLASSES.has(weaponClass);
  return slot === "secondary" ? secondaryOnly : !secondaryOnly;
}

export function weaponsForSlot(slot: "primary" | "secondary"): readonly (typeof WEAPON_IDS)[number][] {
  return WEAPON_IDS.filter((id) => weaponAllowsSlot(id, slot));
}

export function sanitizeLoadout(loadout: { primary: string | null; secondary: string | null }): {
  primary: string | null;
  secondary: string | null;
} {
  let { primary, secondary } = loadout;
  if (primary && !weaponAllowsSlot(primary, "primary")) primary = null;
  if (secondary && !weaponAllowsSlot(secondary, "secondary")) secondary = null;
  if (primary && secondary && primary === secondary) secondary = null;
  return { primary, secondary };
}

export const DEFAULT_WEAPON_ID = "blaster-g";
export const UNARMED_WEAPON_ID = "";

export function getWeaponRecipe(id: string): WeaponRecipe {
  const recipe = WEAPON_RECIPES[id];
  if (!recipe) throw new Error(`unknown weapon recipe: ${id}`);
  return recipe;
}

export function tryGetWeaponRecipe(id: string | null | undefined): WeaponRecipe | undefined {
  if (!id || !(id in WEAPON_RECIPES)) return undefined;
  return WEAPON_RECIPES[id];
}

export function resolveWeaponSlot(id: string | null | undefined): string | null {
  if (!id || id === UNARMED_WEAPON_ID || !(id in WEAPON_RECIPES)) return null;
  return id;
}

/** Active weapon id for snapshots; empty string means unarmed. */
export function toNetworkWeaponId(id: string | null | undefined): string {
  return id ?? UNARMED_WEAPON_ID;
}

export function resolveWeaponId(id: string | undefined): string {
  return resolveWeaponSlot(id) ?? UNARMED_WEAPON_ID;
}

export function formatWeaponLabel(id: string | null | undefined): string {
  if (!id) return "Unarmed";
  return id.replace("blaster-", "Weapon ");
}