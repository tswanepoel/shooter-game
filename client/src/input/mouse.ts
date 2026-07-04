import { bus } from "../bus.ts";

export function initMouse(target: HTMLElement): void {
  target.addEventListener("click", () => {
    target.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    bus.emit("controlChanged", { engaged: document.pointerLockElement === target });
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== target) return;
    bus.emit("turned", { dx: event.movementX, dy: event.movementY });
  });
}
