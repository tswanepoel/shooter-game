import { bus } from "../bus.ts";
import { KILL_FEED } from "../config/ui.ts";
import { labelForPlayer } from "./playerLabel.ts";

interface FeedEntry {
  element: HTMLDivElement;
  remaining: number;
}

export interface KillFeed {
  tick(dt: number): void;
}

export function createKillFeed(): KillFeed {
  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:12px",
    "right:12px",
    "display:flex",
    "flex-direction:column",
    "align-items:flex-end",
    "gap:4px",
    "pointer-events:none",
    "z-index:18",
  ].join(";");
  document.body.appendChild(container);

  const entries: FeedEntry[] = [];

  bus.on("deathReceived", ({ killerId, victimId }) => {
    const line = document.createElement("div");
    line.style.cssText = [
      "padding:5px 10px",
      "border-radius:3px",
      "background:rgba(0,0,0,0.55)",
      "color:#f2f2f2",
      "font:600 0.8rem system-ui,sans-serif",
      "white-space:nowrap",
      "opacity:1",
      "pointer-events:none",
    ].join(";");
    line.textContent =
      killerId === victimId
        ? `${labelForPlayer(victimId)} forfeited`
        : `${labelForPlayer(killerId)} × ${labelForPlayer(victimId)}`;

    container.prepend(line);
    entries.unshift({ element: line, remaining: KILL_FEED.entryLifetime });

    while (entries.length > KILL_FEED.maxEntries) {
      const dropped = entries.pop();
      dropped?.element.remove();
    }
  });

  function tick(dt: number): void {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      entry.remaining -= dt;
      if (entry.remaining <= KILL_FEED.fadeDuration) {
        entry.element.style.opacity = String(
          Math.max(0, entry.remaining / KILL_FEED.fadeDuration),
        );
      }
      if (entry.remaining <= 0) {
        entry.element.remove();
        entries.splice(i, 1);
      }
    }
  }

  return { tick };
}