import { RESPAWN } from "../config/combat.ts";
import { DEATH_OVERLAY } from "../config/ui.ts";
import { localPlayer } from "../state/world.ts";

export interface DeathOverlay {
  update(now: number): void;
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
    "gap:0.5rem",
    "font-family:system-ui,sans-serif",
    "color:#f0d8dc",
    "text-shadow:0 1px 6px rgba(0,0,0,0.75)",
  ].join(";");
  document.body.appendChild(element);

  const title = document.createElement("div");
  title.textContent = "You died";
  title.style.cssText = "font-size:1.35rem;font-weight:600;letter-spacing:0.04em;";
  element.appendChild(title);

  const hint = document.createElement("div");
  hint.style.cssText = "font-size:0.95rem;opacity:0.9;";
  element.appendChild(hint);

  let deathTime: number | undefined;

  return {
    update(now: number): void {
      if (localPlayer.alive) {
        deathTime = undefined;
        element.style.background = "transparent";
        title.style.display = "none";
        hint.style.display = "none";
        return;
      }

      if (deathTime === undefined) deathTime = now;

      element.style.background = DEATH_OVERLAY.color;
      title.style.display = "block";
      hint.style.display = "block";

      const elapsed = (now - deathTime) / 1000;
      const untilManual = RESPAWN.minDelay - elapsed;
      const untilForced = RESPAWN.maxDelay - elapsed;

      if (untilManual > 0) {
        hint.textContent = `Respawn in ${Math.ceil(untilManual)}`;
      } else if (untilForced > 0) {
        hint.textContent = `Press SPACE to respawn (${Math.ceil(untilForced)}s)`;
      } else {
        hint.textContent = "Respawning…";
      }
    },
  };
}