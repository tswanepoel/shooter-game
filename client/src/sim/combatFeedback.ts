import * as THREE from "three";
import { bus } from "../bus.ts";
import { resetCameraEffects, triggerFlinch } from "./cameraEffects.ts";
import type { DamageOverlay } from "../ui/damageOverlay.ts";
import type { HitMarker } from "../ui/hitMarker.ts";
import { bearingToAttacker } from "./damageDirection.ts";

export function initCombatFeedback(
  hitMarker: HitMarker,
  damageOverlay: DamageOverlay,
): void {
  bus.on("hitConfirmed", () => {
    hitMarker.flash();
  });

  bus.on("damageTaken", ({ attackerId }) => {
    const bearing = bearingToAttacker(attackerId);
    triggerFlinch(bearing);
    damageOverlay.showFromAttacker(attackerId);
  });

  bus.on("feedbackReset", () => {
    resetCameraEffects();
    damageOverlay.reset();
  });
}

export function tickCombatFeedback(
  dt: number,
  camera: THREE.Camera,
  hitMarker: HitMarker,
  damageOverlay: DamageOverlay,
  occlusionRoots: readonly THREE.Object3D[],
): void {
  hitMarker.tick(dt, camera, occlusionRoots);
  damageOverlay.tick(dt);
}