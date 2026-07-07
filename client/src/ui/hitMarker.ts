import * as THREE from "three";
import { HIT_MARKER } from "../config/feedback.ts";
import { computeAimRay } from "../sim/aimDirection.ts";
import { applyAimScreenPosition, projectWeaponLineToScreen } from "./aimScreen.ts";

export interface HitMarker {
  flash(): void;
  tick(dt: number, camera: THREE.Camera, occlusionRoots: readonly THREE.Object3D[]): void;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function createTick(angleDeg: number): HTMLDivElement {
  const { tickLength, centerGap, strokePx, outlinePx, cornerRadius, scale } = HIT_MARKER;

  const tick = document.createElement("div");
  tick.style.cssText = [
    "position:absolute",
    "left:0",
    "top:0",
    `width:${tickLength}px`,
    `height:${strokePx}px`,
    `margin-top:${-strokePx / 2}px`,
    "background:#fff",
    `border-radius:${cornerRadius}px`,
    `box-shadow:0 0 0 ${outlinePx}px #111`,
    "transform-origin:left center",
    `transform:rotate(${angleDeg}deg) translateX(${centerGap}px) scale(${scale})`,
  ].join(";");

  return tick;
}

export function createHitMarker(): HitMarker {
  const root = document.createElement("div");
  root.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:0",
    "height:0",
    "pointer-events:none",
    "z-index:20",
    "display:none",
  ].join(";");

  const ticks = HIT_MARKER.tickAngles.map((angle) => createTick(angle));
  for (const tick of ticks) {
    tick.style.opacity = "0";
    root.appendChild(tick);
  }

  document.body.appendChild(root);

  let elapsed = Number.POSITIVE_INFINITY;
  const totalDuration = HIT_MARKER.holdDuration + HIT_MARKER.fadeDuration;

  function applyOpacity(opacity: number): void {
    const opacityText = opacity.toFixed(3);
    for (const tick of ticks) {
      tick.style.opacity = opacityText;
    }
  }

  function flash(): void {
    elapsed = 0;
    applyOpacity(1);
  }

  const muzzleOrigin = new THREE.Vector3();
  const weaponDirection = new THREE.Vector3();

  function tick(dt: number, camera: THREE.Camera, occlusionRoots: readonly THREE.Object3D[]): void {
    if (elapsed >= totalDuration) {
      root.style.display = "none";
      return;
    }

    computeAimRay(muzzleOrigin, weaponDirection, camera);
    applyAimScreenPosition(
      root,
      projectWeaponLineToScreen(camera, muzzleOrigin, weaponDirection, occlusionRoots),
    );
    root.style.display = "block";

    if (elapsed < HIT_MARKER.holdDuration) {
      applyOpacity(1);
    } else {
      const fadeT = (elapsed - HIT_MARKER.holdDuration) / HIT_MARKER.fadeDuration;
      applyOpacity(1 - easeOut(Math.min(1, fadeT)));
    }

    elapsed += dt;
  }

  return { flash, tick };
}