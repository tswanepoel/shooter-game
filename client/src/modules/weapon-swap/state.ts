export type ActiveSlot = "primary" | "secondary";

export interface WeaponSwapState {
  activeSlot: ActiveSlot;
}

export function createInitialState(): WeaponSwapState {
  return { activeSlot: "primary" };
}
