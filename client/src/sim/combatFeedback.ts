import * as THREE from "three";
import { bus } from "../bus.ts";
import { resetCameraEffects, triggerFlinch } from "./cameraEffects.ts";
import type { DamageIndicator } from "../ui/damageIndicator.ts";
import type { DamageOverlay } from "../ui/damageOverlay.ts";
import type { HitMarker } from "../ui/hitMarker.ts";
import { bearingToAttacker } from "./damageDirection.ts";

export function initCombatFeedback(
  hitMarker: HitMarker,
  damageIndicator: DamageIndicator,
  damageOverlay: DamageOverlay,
): void {
  bus.on("hitConfirmed", () => {
    hitMarker.flash();
  });

  bus.on("damageTaken", ({ attackerId }) => {
    const bearing = bearingToAttacker(attackerId);
    triggerFlinch(bearing);
    damageIndicator.showFromAttacker(attackerId);
    damageOverlay.showFromAttacker(attackerId);
  });

  bus.on("feedbackReset", () => {
    resetCameraEffects();
    damageIndicator.reset();
    damageOverlay.reset();
  });
}

export function tickCombatFeedback(
  dt: number,
  camera: THREE.Camera,
  hitMarker: HitMarker,
  damageIndicator: DamageIndicator,
  damageOverlay: DamageOverlay,
): void {
  hitMarker.tick(dt, camera);
  damageIndicator.tick(dt);
  damageOverlay.tick(dt);
}