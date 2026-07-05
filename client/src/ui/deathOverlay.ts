import { DEATH_OVERLAY } from "../config/ui.ts";
import { localPlayer } from "../state/world.ts";

export interface DeathOverlay {
  update(): void;
}

export function createDeathOverlay(): DeathOverlay {
  const element = document.createElement("div");
  element.style.cssText = [
    "position:fixed",
    "inset:0",
    "background:transparent",
    "pointer-events:none",
    "z-index:8",
    "transition:background 0.25s ease",
  ].join(";");
  document.body.appendChild(element);

  return {
    update(): void {
      element.style.background = localPlayer.alive ? "transparent" : DEATH_OVERLAY.color;
    },
  };
}