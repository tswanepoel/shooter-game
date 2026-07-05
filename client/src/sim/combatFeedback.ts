import { bus } from "../bus.ts";
import { resetCameraEffects, triggerFlinch } from "./cameraEffects.ts";
import type { DamageIndicator } from "../ui/damageIndicator.ts";
import type { HitMarker } from "../ui/hitMarker.ts";

export function initCombatFeedback(
  hitMarker: HitMarker,
  damageIndicator: DamageIndicator,
): void {
  bus.on("hitConfirmed", () => {
    hitMarker.flash();
  });

  bus.on("damageTaken", ({ attackerId }) => {
    triggerFlinch();
    damageIndicator.showFromAttacker(attackerId);
  });

  bus.on("feedbackReset", () => {
    resetCameraEffects();
    damageIndicator.reset();
  });
}

export function tickCombatFeedback(dt: number, hitMarker: HitMarker, damageIndicator: DamageIndicator): void {
  hitMarker.tick(dt);
  damageIndicator.tick(dt);
}