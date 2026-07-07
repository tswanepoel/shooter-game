import { bus } from "../bus.ts";
import { RESPAWN } from "../config/combat.ts";
import { DEATH_OVERLAY } from "../config/ui.ts";
import { getLocalPlayerId, localPlayer } from "../state/world.ts";
import { getLoadoutOverlay } from "./loadoutOverlay.ts";
import { createDeathRespawnOptionsHint } from "./pressKeyHint.ts";

const SPACE_ICON_OUTLINE = "/ui/input-prompts/keyboard_space_icon_outline.png";
const OPTIONS_ICON_OUTLINE = "/ui/input-prompts/keyboard_o_icon_outline.png";

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
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "font-family:system-ui,sans-serif",
    "color:#f0d8dc",
    "text-shadow:0 1px 6px rgba(0,0,0,0.75)",
  ].join(";");
  document.body.appendChild(element);

  const hint = createDeathRespawnOptionsHint(SPACE_ICON_OUTLINE, OPTIONS_ICON_OUTLINE);
  element.appendChild(hint.element);

  let deathAtMs: number | undefined;

  bus.on("deathReceived", ({ victimId, deathAt }) => {
    if (victimId !== getLocalPlayerId()) return;
    deathAtMs = deathAt ?? Date.now();
  });

  bus.on("respawnReceived", ({ id }) => {
    if (id === getLocalPlayerId()) deathAtMs = undefined;
  });

  return {
    update(): void {
      if (localPlayer.alive) {
        element.style.transition = "none";
        element.style.background = "transparent";
        hint.setOpacity(0, false);
        return;
      }

      element.style.transition = "background 0.25s ease";
      element.style.background = DEATH_OVERLAY.color;

      const now = Date.now();
      const anchor = deathAtMs ?? now;
      const elapsed = (now - anchor) / 1000;
      const canRespawn = elapsed >= RESPAWN.minDelay;

      const loadoutOverlay = getLoadoutOverlay();
      const loadoutOpen = loadoutOverlay.isOpen();
      loadoutOverlay.setSpawnEnabled(canRespawn);

      if (loadoutOpen) {
        hint.setOpacity(0, false);
      } else if (canRespawn) {
        hint.setOpacity(0.95, true);
      } else {
        hint.setOpacity(0, false);
      }
    },
  };
}