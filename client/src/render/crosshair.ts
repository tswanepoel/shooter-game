import type * as THREE from "three";
import { CROSSHAIR } from "../config/feedback.ts";
import { localPlayer } from "../state/world.ts";
import {
  applyAimScreenPosition,
  projectGunAimToScreen,
  smoothAimScreenPosition,
  type AimScreenPosition,
} from "../ui/aimScreen.ts";

export interface Crosshair {
  update(camera: THREE.Camera, dt: number): void;
}

export function createCrosshair(): Crosshair {
  const element = document.createElement("div");
  element.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${CROSSHAIR.sizePx}px`,
    `height:${CROSSHAIR.sizePx}px`,
    "border-radius:50%",
    "background:#fff",
    "box-shadow:0 0 0 1px rgba(0,0,0,0.9)",
    "pointer-events:none",
    "will-change:transform",
  ].join(";");
  document.body.appendChild(element);

  let smoothed: AimScreenPosition | undefined;

  function update(camera: THREE.Camera, dt: number): void {
    if (!localPlayer.alive) {
      element.style.display = "none";
      smoothed = undefined;
      return;
    }

    const projected = projectGunAimToScreen(camera);
    if (!projected.visible) {
      element.style.display = "none";
      smoothed = undefined;
      return;
    }

    smoothed = smoothAimScreenPosition(
      smoothed,
      projected,
      dt,
      CROSSHAIR.screenSmoothing,
    );
    element.style.display = "block";
    applyAimScreenPosition(element, smoothed);
  }

  return { update };
}