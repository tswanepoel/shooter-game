export type WeaponSlotId = string | null;

export interface LoadoutState {
  primary: WeaponSlotId;
  secondary: WeaponSlotId;
}

export function createInitialState(): LoadoutState {
  return { primary: null, secondary: null };
}
