import { STAMINA } from "../config/physics.ts";
import { STATUS_BARS } from "../config/ui.ts";
import { localPlayer } from "../state/world.ts";

export interface StatusBars {
  update(): void;
}

function createBar(label: string, color: string): {
  root: HTMLDivElement;
  fill: HTMLDivElement;
} {
  const root = document.createElement("div");
  root.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:8px",
    "pointer-events:none",
  ].join(";");

  const name = document.createElement("span");
  name.textContent = label;
  name.style.cssText = [
    "width:52px",
    "text-align:right",
    "font:600 0.7rem system-ui,sans-serif",
    "color:#ddd",
    "letter-spacing:0.04em",
  ].join(";");

  const track = document.createElement("div");
  track.style.cssText = [
    `width:${STATUS_BARS.width}px`,
    `height:${STATUS_BARS.height}px`,
    "border-radius:2px",
    "background:rgba(0,0,0,0.5)",
    "overflow:hidden",
  ].join(";");

  const fill = document.createElement("div");
  fill.style.height = "100%";
  fill.style.width = "100%";
  fill.style.background = color;
  fill.style.transformOrigin = "left center";
  fill.style.transition = "transform 0.08s linear";
  track.appendChild(fill);

  root.appendChild(name);
  root.appendChild(track);
  return { root, fill };
}

export function createStatusBars(): StatusBars {
  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "left:50%",
    `bottom:${STATUS_BARS.bottom}px`,
    "transform:translateX(-50%)",
    "display:flex",
    "flex-direction:column",
    `gap:${STATUS_BARS.gap}px`,
    "pointer-events:none",
    "z-index:16",
  ].join(";");

  const stamina = createBar("STAMINA", "#3498db");
  container.appendChild(stamina.root);
  document.body.appendChild(container);

  function setFill(fill: HTMLDivElement, current: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, current / max));
    fill.style.transform = `scaleX(${ratio})`;
  }

  return {
    update(): void {
      setFill(stamina.fill, localPlayer.stamina, STAMINA.max);
    },
  };
}