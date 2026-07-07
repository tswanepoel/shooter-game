export interface PressKeyHint {
  readonly element: HTMLDivElement;
  setOpacity(opacity: number, animate: boolean): void;
}

function createKeyBadge(iconSrc: string, iconAlt: string, keyWidth = 52): HTMLDivElement {
  const key = document.createElement("div");
  key.style.cssText = [
    "position:relative",
    `width:${keyWidth}px`,
    `height:${keyWidth}px`,
    "flex-shrink:0",
    "border-radius:10px",
    "background:linear-gradient(180deg,#4a3539 0%,#2a1c20 100%)",
    "box-shadow:0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
    "filter:drop-shadow(0 2px 8px rgba(0,0,0,0.55))",
  ].join(";");

  const outline = document.createElement("img");
  outline.src = iconSrc;
  outline.alt = iconAlt;
  outline.draggable = false;
  outline.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;";
  key.appendChild(outline);
  return key;
}

export function createPressKeyHint(
  iconSrc: string,
  iconAlt: string,
  actionLabel: string,
  options?: { pressLabel?: string; keyWidth?: number },
): PressKeyHint {
  const pressLabel = options?.pressLabel ?? "Press";
  const keyWidth = options?.keyWidth ?? 52;

  const element = document.createElement("div");
  element.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:0.85rem",
    "font-size:1.2rem",
    "font-weight:500",
    "letter-spacing:0.02em",
    "opacity:0",
    "transition:opacity 0.35s ease",
  ].join(";");

  const press = document.createElement("span");
  press.textContent = pressLabel;
  element.appendChild(press);

  element.appendChild(createKeyBadge(iconSrc, iconAlt, keyWidth));

  const action = document.createElement("span");
  action.textContent = actionLabel;
  element.appendChild(action);

  return {
    element,
    setOpacity(opacity: number, animate: boolean): void {
      element.style.transition = animate ? "opacity 0.35s ease" : "none";
      element.style.opacity = String(opacity);
    },
  };
}

export function createDeathRespawnOptionsHint(
  spaceIconSrc: string,
  optionsIconSrc: string,
): PressKeyHint {
  const element = document.createElement("div");
  element.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "flex-wrap:wrap",
    "gap:0.85rem",
    "font-size:1.2rem",
    "font-weight:500",
    "letter-spacing:0.02em",
    "opacity:0",
    "transition:opacity 0.35s ease",
  ].join(";");

  const press = document.createElement("span");
  press.textContent = "Press";
  element.appendChild(press);
  element.appendChild(createKeyBadge(spaceIconSrc, "Space"));
  const respawn = document.createElement("span");
  respawn.textContent = "to respawn or";
  element.appendChild(respawn);
  element.appendChild(createKeyBadge(optionsIconSrc, "O"));
  const options = document.createElement("span");
  options.textContent = "for options";
  element.appendChild(options);

  return {
    element,
    setOpacity(opacity: number, animate: boolean): void {
      element.style.transition = animate ? "opacity 0.35s ease" : "none";
      element.style.opacity = String(opacity);
    },
  };
}