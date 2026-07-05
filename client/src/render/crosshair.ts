import type * as THREE from "three";
import { localPlayer } from "../state/world.ts";
import { applyAimScreenPosition, projectGunAimToScreen } from "../ui/aimScreen.ts";

export interface Crosshair {
  update(camera: THREE.Camera): void;
}

export function createCrosshair(): Crosshair {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.width = "4px";
  element.style.height = "4px";
  element.style.marginLeft = "-2px";
  element.style.marginTop = "-2px";
  element.style.borderRadius = "50%";
  element.style.background = "white";
  element.style.mixBlendMode = "difference";
  element.style.pointerEvents = "none";
  document.body.appendChild(element);

  function update(camera: THREE.Camera): void {
    if (!localPlayer.alive) {
      element.style.display = "none";
      return;
    }
    element.style.display = "block";
    applyAimScreenPosition(element, projectGunAimToScreen(camera));
  }

  return { update };
}