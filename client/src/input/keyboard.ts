import { bus } from "../bus.ts";
import { KEYBINDS, type Action } from "../config/keybinds.ts";

const pressedCodes = new Set<string>();

function publish(): void {
  const actions = new Set<Action>();
  for (const code of pressedCodes) {
    actions.add(KEYBINDS[code]);
  }
  bus.emit("actionsChanged", [...actions]);
}

function clearAll(): void {
  pressedCodes.clear();
  publish();
}

export function initKeyboard(): void {
  window.addEventListener("keydown", (event) => {
    const action = KEYBINDS[event.code];
    if (!action || pressedCodes.has(event.code)) return;
    pressedCodes.add(event.code);
    publish();
  });

  window.addEventListener("keyup", (event) => {
    if (!pressedCodes.delete(event.code)) return;
    publish();
  });

  window.addEventListener("blur", clearAll);
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === null) clearAll();
  });
}
