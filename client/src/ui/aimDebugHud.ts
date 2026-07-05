import { gunAimDelta, shoulderPitch, splitTargetPitch, viewPitch } from "../sim/aimCascade.ts";
import type { AimCascadeState } from "../sim/aimCascade.ts";

export interface AimDebugHud {
  update(state: AimCascadeState): void;
  setVisible(visible: boolean): void;
}

const RAD_TO_DEG = 180 / Math.PI;

function deg(radians: number): string {
  return `${(radians * RAD_TO_DEG).toFixed(1)}°`;
}

export function createAimDebugHud(): AimDebugHud {
  const element = document.createElement("div");
  element.style.cssText = [
    "position:fixed",
    "top:12px",
    "left:12px",
    "padding:8px 10px",
    "border-radius:4px",
    "background:rgba(0,0,0,0.55)",
    "color:#cfe8ff",
    "font:12px/1.45 ui-monospace,Consolas,monospace",
    "white-space:pre",
    "pointer-events:none",
    "z-index:50",
  ].join(";");
  element.style.display = "none";
  document.body.appendChild(element);

  return {
    update(state: AimCascadeState): void {
      const setpoints = splitTargetPitch(state.targetPitch);
      const view = viewPitch(state);
      const shoulder = shoulderPitch(state);
      const gunDelta = gunAimDelta(state);

      element.textContent = [
        "aim (pitch / yaw)",
        `target   ${deg(state.targetPitch).padStart(7)}  ${deg(state.targetYaw)}`,
        `view     ${deg(view).padStart(7)}  ${deg(state.targetYaw)}`,
        `torso    ${deg(state.torsoPitch).padStart(7)}  ${deg(state.torsoYaw)}`,
        `neck     ${deg(state.neckPitch).padStart(7)}`,
        `eye      ${deg(state.eyePitch).padStart(7)}`,
        `shoulder ${deg(shoulder).padStart(7)}`,
        `gun      ${deg(state.gunPitch).padStart(7)}  ${deg(state.gunYaw)}`,
        `gunΔ     ${deg(gunDelta.pitch).padStart(7)}  ${deg(gunDelta.yaw)}`,
        "setpoints (pitch)",
        `gun→     ${deg(setpoints.gun).padStart(7)}`,
        `eye→     ${deg(setpoints.eye).padStart(7)}`,
      ].join("\n");
    },
    setVisible(visible: boolean): void {
      element.style.display = visible ? "block" : "none";
    },
  };
}