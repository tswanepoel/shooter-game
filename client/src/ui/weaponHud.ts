import { formatWeaponLabel } from "../config/weapons.ts";
import type { ActiveSlot } from "../modules/weapon-swap/index.ts";

export interface WeaponHud {
  update(activeSlot: ActiveSlot, weaponId: string | null): void;
}

export function createWeaponHud(): WeaponHud {
  const element = document.createElement("div");
  element.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "left:16px",
    "padding:6px 10px",
    "border-radius:4px",
    "background:rgba(0,0,0,0.45)",
    "color:#fff",
    "font:600 0.85rem system-ui,sans-serif",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(element);

  return {
    update(activeSlot: ActiveSlot, weaponId: string | null): void {
      const slot = activeSlot === "primary" ? "P" : "S";
      element.textContent = `${slot}: ${formatWeaponLabel(weaponId)}`;
    },
  };
}