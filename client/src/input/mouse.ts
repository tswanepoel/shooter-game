import { bus } from "../bus.ts";
import { recordPointerDelivery } from "../debug/inputRates.ts";
import { accumulatePointerDelta } from "./pointerInput.ts";

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

  document.addEventListener("pointermove", (event) => {
    if (document.pointerLockElement !== target) return;
    const coalesced = event.getCoalescedEvents?.() ?? [event];
    recordPointerDelivery(coalesced.length);

    const { movementX: dx, movementY: dy } = event;
    if (dx !== 0 || dy !== 0) {
      accumulatePointerDelta(dx, dy);
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (event.button === 0) bus.emit("fireStarted", undefined);
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) bus.emit("fireStopped", undefined);
  });
}