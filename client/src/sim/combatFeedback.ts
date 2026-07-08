import * as THREE from "three";
import { bus } from "../bus.ts";
import { localPlayer } from "../state/world.ts";
import { resetRecoil } from "./recoilCascade.ts";
import type { DamageOverlay } from "../ui/damageOverlay.ts";
import type { HitMarker } from "../ui/hitMarker.ts";

export function initCombatFeedback(
  hitMarker: HitMarker,
  damageOverlay: DamageOverlay,
): void {
  bus.on("hitConfirmed", () => {
    hitMarker.flash();
  });

  bus.on("damageTaken", ({ attackerId }) => {
    damageOverlay.showFromAttacker(attackerId);
  });

  bus.on("feedbackReset", () => {
    damageOverlay.reset();
    resetRecoil(localPlayer.recoil);
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