export const WEAPON_MODEL_URL = "/models/blaster-g.glb";
export const WEAPON_SIZE = 0.6;

// Authored nose/barrel axis in the model's own local space; tuned by visual inspection.
export const WEAPON_FORWARD_AXIS = { x: 0, y: 0, z: 1 } as const;

// Grip offset relative to the character's arm-right node; tuned by visual inspection.
export const WEAPON_GRIP_OFFSET = { x: 0, y: -1.2, z: 0.2 } as const;

// First-person view-model placement, relative to the camera; tuned by visual inspection.
export const VIEW_MODEL_OFFSET = { x: 0.25, y: -0.2, z: -0.5 } as const;

// Meters of shoulder-swing translation per radian of head-torso lag.
export const VIEW_MODEL_SWING_SCALE = 0.4;

// How eagerly the torso chases the head; part of this weapon's handling feel.
export const TORSO_CHASE_RATE = 12;

// Gun-chase rate is gap-dependent, not constant: near zero gap it snaps almost
// instantly (careful slow aim reads as rock-steady), and only eases toward the
// slower rate once the gap opens up past the threshold band (a fast snap).
export const GUN_CHASE_RATE_FAST = 40;
export const GUN_CHASE_RATE_SLOW = 18;
export const GUN_LAG_THRESHOLD_LOW = 0.03;
export const GUN_LAG_THRESHOLD_HIGH = 0.2;

// Raising the gun lags more than lowering it, evoking its weight without
// simulating mass directly — a multiplier on the gap-based pitch rate.
export const GUN_PITCH_UP_RATE_SCALE = 0.6;
export const GUN_PITCH_DOWN_RATE_SCALE = 1.3;

export const FIRE_RATE = 10;
export const PROJECTILE_SPEED = 800;
export const PROJECTILE_MAX_RANGE = 100;

export const BULLET_MODEL_URL = "/models/bullet-foam-tip.glb";
export const BULLET_LENGTH = 0.12;
// Authored nose axis: the model's origin sits at its base, tip at local +Y.
export const BULLET_FORWARD_AXIS = { x: 0, y: 1, z: 0 } as const;

// Weapon-mesh-only recoil; must never feed the camera or the fire direction.
export const RECOIL_KICK_DISTANCE = 0.015;
export const RECOIL_KICK_PITCH = 0.005;
export const RECOIL_DECAY_RATE = 8;

// Muzzle flash placement on an opponent's held weapon, relative to the
// character's arm-right node — a touch further out than the grip itself.
export const MUZZLE_FLASH_OFFSET = { x: WEAPON_GRIP_OFFSET.x, y: WEAPON_GRIP_OFFSET.y - 0.3, z: WEAPON_GRIP_OFFSET.z } as const;
export const MUZZLE_FLASH_DURATION = 0.06;
