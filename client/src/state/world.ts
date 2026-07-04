export interface LocalPlayerState {
  position: { x: number; y: number; z: number };
  headYaw: number;
  headPitch: number;
}

export const localPlayer: LocalPlayerState = {
  position: { x: 0, y: 0, z: 0 },
  headYaw: 0,
  headPitch: 0,
};
