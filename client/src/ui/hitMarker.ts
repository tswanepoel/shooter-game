import { HIT_MARKER } from "../config/feedback.ts";

export interface HitMarker {
  flash(): void;
  tick(dt: number): void;
}

export function createHitMarker(): HitMarker {
  const root = document.createElement("div");
  root.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:50%",
    "width:0",
    "height:0",
    "pointer-events:none",
    "z-index:20",
  ].join(";");

  const lineA = document.createElement("div");
  const lineB = document.createElement("div");
  for (const line of [lineA, lineB]) {
    line.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "background:#fff",
      "transform-origin:center",
      "opacity:0",
    ].join(";");
    root.appendChild(line);
  }

  lineA.style.width = `${HIT_MARKER.size}px`;
  lineA.style.height = "2px";
  lineA.style.marginLeft = `${-HIT_MARKER.size / 2}px`;
  lineA.style.marginTop = "-1px";
  lineA.style.transform = "rotate(45deg)";

  lineB.style.width = `${HIT_MARKER.size}px`;
  lineB.style.height = "2px";
  lineB.style.marginLeft = `${-HIT_MARKER.size / 2}px`;
  lineB.style.marginTop = "-1px";
  lineB.style.transform = "rotate(-45deg)";

  document.body.appendChild(root);

  let remaining = 0;

  function flash(): void {
    remaining = HIT_MARKER.duration;
    lineA.style.opacity = "1";
    lineB.style.opacity = "1";
  }

  function tick(dt: number): void {
    if (remaining <= 0) return;
    remaining -= dt;
    const t = Math.max(0, remaining / HIT_MARKER.duration);
    const opacity = t.toFixed(3);
    lineA.style.opacity = opacity;
    lineB.style.opacity = opacity;
    const scale = 0.85 + 0.15 * t;
    lineA.style.transform = `rotate(45deg) scale(${scale})`;
    lineB.style.transform = `rotate(-45deg) scale(${scale})`;
  }

  return { flash, tick };
}