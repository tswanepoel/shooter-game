export interface WeaponHud {
  update(weaponId: string): void;
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
    update(weaponId: string): void {
      element.textContent = weaponId.replace("blaster-", "Weapon ");
    },
  };
}