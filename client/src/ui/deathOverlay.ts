import { bus } from "../bus.ts";
import { RESPAWN } from "../config/combat.ts";
import { DEATH_OVERLAY } from "../config/ui.ts";
import { localPlayer, localPlayerId } from "../state/world.ts";

const SPACE_ICON_OUTLINE = "/ui/input-prompts/keyboard_space_icon_outline.png";

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

  const hint = document.createElement("div");
  hint.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:0.85rem",
    "font-size:1.2rem",
    "font-weight:500",
    "letter-spacing:0.02em",
    "opacity:0",
    "transition:opacity 0.35s ease",
  ].join(";");
  element.appendChild(hint);

  const pressLabel = document.createElement("span");
  pressLabel.textContent = "Press";
  hint.appendChild(pressLabel);

  const key = document.createElement("div");
  key.style.cssText = [
    "position:relative",
    "width:52px",
    "height:52px",
    "flex-shrink:0",
    "border-radius:10px",
    "background:linear-gradient(180deg,#4a3539 0%,#2a1c20 100%)",
    "box-shadow:0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
    "filter:drop-shadow(0 2px 8px rgba(0,0,0,0.55))",
  ].join(";");
  hint.appendChild(key);

  const outline = document.createElement("img");
  outline.src = SPACE_ICON_OUTLINE;
  outline.alt = "Space";
  outline.draggable = false;
  outline.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  key.appendChild(outline);

  const actionLabel = document.createElement("span");
  actionLabel.textContent = "to respawn";
  hint.appendChild(actionLabel);

  let deathAtMs: number | undefined;

  bus.on("deathReceived", ({ victimId, deathAt }) => {
    if (victimId === localPlayerId) deathAtMs = deathAt ?? Date.now();
  });

  bus.on("respawnReceived", ({ id }) => {
    if (id === localPlayerId) deathAtMs = undefined;
  });

  return {
    update(): void {
      if (localPlayer.alive) {
        element.style.transition = "none";
        element.style.background = "transparent";
        hint.style.transition = "none";
        hint.style.opacity = "0";
        return;
      }

      element.style.transition = "background 0.25s ease";
      element.style.background = DEATH_OVERLAY.color;

      const now = Date.now();
      const anchor = deathAtMs ?? now;
      const elapsed = (now - anchor) / 1000;
      const canRespawn = elapsed >= RESPAWN.minDelay;

      if (canRespawn) {
        hint.style.transition = "opacity 0.35s ease";
        hint.style.opacity = "0.95";
      } else {
        hint.style.transition = "none";
        hint.style.opacity = "0";
      }
    },
  };
}