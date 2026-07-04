export const WEAPON_MODEL_URL = "/models/blaster-g.glb";
export const WEAPON_SIZE = 0.6;

// Authored nose/barrel axis in the model's own local space; tuned by visual inspection.
export const WEAPON_FORWARD_AXIS = { x: 0, y: 0, z: 1 } as const;

// Grip offset relative to the character's arm-right node; tuned by visual inspection.
export const WEAPON_GRIP_OFFSET = { x: 0, y: -1.2, z: 0.2 } as const;
