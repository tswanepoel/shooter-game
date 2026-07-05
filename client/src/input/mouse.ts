import { bus } from "../bus.ts";

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

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== target) return;
    bus.emit("turned", { dx: event.movementX, dy: event.movementY });
  });

  document.addEventListener("mousedown", (event) => {
    if (event.button === 0) bus.emit("fireStarted", undefined);
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) bus.emit("fireStopped", undefined);
  });
}
