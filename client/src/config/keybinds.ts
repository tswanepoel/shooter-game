import type { BusEvents } from "../bus.ts";

type MomentaryEvent = {
  [K in keyof BusEvents]: BusEvents[K] extends undefined ? K : never;
}[keyof BusEvents];

interface Binding {
  start: MomentaryEvent;
  stop?: MomentaryEvent;
}

export const KEYBINDS: Record<string, Binding> = {
  KeyW: { start: "moveForwardStarted", stop: "moveForwardStopped" },
  KeyS: { start: "moveBackwardStarted", stop: "moveBackwardStopped" },
  KeyA: { start: "moveLeftStarted", stop: "moveLeftStopped" },
  KeyD: { start: "moveRightStarted", stop: "moveRightStopped" },
  ShiftLeft: { start: "sprintStarted", stop: "sprintStopped" },
  Space: { start: "jumped" },
  KeyQ: { start: "weaponCycleRequested" },
};
