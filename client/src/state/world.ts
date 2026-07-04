import { STAMINA } from "../config/physics.ts";

export interface LocalPlayerState {
  position: { x: number; y: number; z: number };
  headYaw: number;
  headPitch: number;
  stamina: number;
  sprinting: boolean;
  velocityY: number;
  grounded: boolean;
  airHorizontal: { x: number; z: number };
}

export const localPlayer: LocalPlayerState = {
  position: { x: 0, y: 0, z: 0 },
  headYaw: 0,
  headPitch: 0,
  stamina: STAMINA.max,
  sprinting: false,
  velocityY: 0,
  grounded: true,
  airHorizontal: { x: 0, z: 0 },
};
