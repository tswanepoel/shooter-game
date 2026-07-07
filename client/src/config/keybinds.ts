import type { BusEvents } from "../bus.ts";

type MomentaryEvent = {
  [K in keyof BusEvents]: BusEvents[K] extends undefined ? K : never;
}[keyof BusEvents];

interface Binding {
  start: MomentaryEvent;
  stop?: MomentaryEvent;
}

/** Options / loadout picker (toggle). */
export const LOADOUT_MENU_KEY = "KeyO";
export const LOADOUT_MENU_KEY_LABEL = "O";

/** Hold to forfeit current life. */
export const FORFEIT_KEY = "KeyK";
export const FORFEIT_KEY_LABEL = "K";

export const KEYBINDS: Record<string, Binding> = {
  KeyW: { start: "moveForwardStarted", stop: "moveForwardStopped" },
  KeyS: { start: "moveBackwardStarted", stop: "moveBackwardStopped" },
  KeyA: { start: "moveLeftStarted", stop: "moveLeftStopped" },
  KeyD: { start: "moveRightStarted", stop: "moveRightStopped" },
  ShiftLeft: { start: "sprintStarted", stop: "sprintStopped" },
  Space: { start: "jumped" },
};

export function isLoadoutMenuKey(code: string): boolean {
  return code === LOADOUT_MENU_KEY;
}