import type * as THREE from "three";
import { CROSSHAIR } from "../config/feedback.ts";
import { localPlayer } from "../state/world.ts";
import { computeAimDirection } from "../sim/aimDirection.ts";
import { applyAimScreenPosition, projectWeaponLineToScreen } from "../ui/aimScreen.ts";

export interface Crosshair {
  update(camera: THREE.Camera): void;
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
    "box-shadow:0 0 0 1px rgba(0,0,0,1)",
    "pointer-events:none",
    "will-change:transform",
  ].join(";");
  document.body.appendChild(element);

  function update(camera: THREE.Camera): void {
    if (!localPlayer.alive) {
      element.style.display = "none";
      return;
    }

    const projected = projectWeaponLineToScreen(
      camera,
      camera.position,
      computeAimDirection(camera),
    );

    element.style.display = "block";
    applyAimScreenPosition(element, projected);
  }

  return { update };
}