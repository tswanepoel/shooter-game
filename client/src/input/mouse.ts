import { bus } from "../bus.ts";

// Pointer-move -> look-delta, mousedown/up -> weapon-fire-intent, and
// wheel -> weapon-swap-intent capture now live in main.ts. This file still
// owns pointer-lock mode toggling, which belongs to a module not built yet.
export function initMouse(target: HTMLElement): void {
  target.addEventListener("click", () => {
    target.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === target) {
      bus.emit("controlEngaged", undefined);
    } else {
      bus.emit("controlReleased", undefined);
    }
  });
}
