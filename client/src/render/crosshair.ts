import type * as THREE from "three";
import { applyAimScreenPosition, projectGunAimToScreen } from "../ui/aimScreen.ts";

export interface Crosshair {
  update(camera: THREE.Camera): void;
}

export function createCrosshair(): Crosshair {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.width = "6px";
  element.style.height = "6px";
  element.style.marginLeft = "-3px";
  element.style.marginTop = "-3px";
  element.style.borderRadius = "50%";
  element.style.background = "white";
  element.style.mixBlendMode = "difference";
  element.style.pointerEvents = "none";
  document.body.appendChild(element);

  function update(camera: THREE.Camera): void {
    applyAimScreenPosition(element, projectGunAimToScreen(camera));
  }

  return { update };
}