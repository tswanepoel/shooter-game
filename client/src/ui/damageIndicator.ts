import { DAMAGE_INDICATOR } from "../config/feedback.ts";
import { localPlayer, remotePlayers } from "../state/world.ts";

export interface DamageIndicator {
  showFromAttacker(attackerId: string): void;
  tick(dt: number): void;
  reset(): void;
}

function bearingToAttacker(attackerId: string): number | undefined {
  const attacker = remotePlayers.get(attackerId);
  if (!attacker) return undefined;

  const dx = attacker.position.x - localPlayer.position.x;
  const dz = attacker.position.z - localPlayer.position.z;
  if (dx * dx + dz * dz < 1e-6) return undefined;

  const worldBearing = Math.atan2(-dx, -dz);
  return worldBearing - localPlayer.targetYaw;
}

export function createDamageIndicator(): DamageIndicator {
  const root = document.createElement("div");
  root.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:50%",
    "width:0",
    "height:0",
    "pointer-events:none",
    "z-index:19",
  ].join(";");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const size = DAMAGE_INDICATOR.radius * 2 + 8;
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.style.cssText = [
    "position:absolute",
    `left:${-size / 2}px`,
    `top:${-size / 2}px`,
    "overflow:visible",
    "opacity:0",
  ].join(";");

  const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arc.setAttribute("fill", "none");
  arc.setAttribute("stroke", "#ff4444");
  arc.setAttribute("stroke-width", String(DAMAGE_INDICATOR.strokeWidth));
  arc.setAttribute("stroke-linecap", "round");
  svg.appendChild(arc);
  root.appendChild(svg);
  document.body.appendChild(root);

  const center = size / 2;
  const radius = DAMAGE_INDICATOR.radius;
  let remaining = 0;
  let angle = 0;

  function updateArcPath(): void {
    const halfArc = (DAMAGE_INDICATOR.arcDegrees * Math.PI) / 360;
    const start = angle - halfArc;
    const end = angle + halfArc;
    const x1 = center + Math.sin(start) * radius;
    const y1 = center - Math.cos(start) * radius;
    const x2 = center + Math.sin(end) * radius;
    const y2 = center - Math.cos(end) * radius;
    arc.setAttribute(
      "d",
      `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
    );
  }

  function showFromAttacker(attackerId: string): void {
    const bearing = bearingToAttacker(attackerId);
    if (bearing === undefined) return;
    angle = bearing;
    remaining = DAMAGE_INDICATOR.duration;
    updateArcPath();
    svg.style.opacity = "1";
  }

  function tick(dt: number): void {
    if (remaining <= 0) return;
    remaining -= dt;
    svg.style.opacity = String(Math.max(0, remaining / DAMAGE_INDICATOR.duration));
    if (remaining <= 0) svg.style.opacity = "0";
  }

  function reset(): void {
    remaining = 0;
    svg.style.opacity = "0";
  }

  return { showFromAttacker, tick, reset };
}