export type Action = "moveForward" | "moveBackward" | "moveLeft" | "moveRight";

export const KEYBINDS: Record<string, Action> = {
  KeyW: "moveForward",
  KeyS: "moveBackward",
  KeyA: "moveLeft",
  KeyD: "moveRight",
};
