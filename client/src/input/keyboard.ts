import { bus } from "../bus.ts";
import { KEYBINDS } from "../config/keybinds.ts";

const pressedCodes = new Set<string>();

function clearAll(): void {
  for (const code of [...pressedCodes]) {
    pressedCodes.delete(code);
    const binding = KEYBINDS[code];
    if (binding?.stop) bus.emit(binding.stop, undefined);
  }
}

export function initKeyboard(): void {
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    const binding = KEYBINDS[event.code];
    if (!binding || pressedCodes.has(event.code)) return;
    pressedCodes.add(event.code);
    bus.emit(binding.start, undefined);
  });

  window.addEventListener("keyup", (event) => {
    if (!pressedCodes.delete(event.code)) return;
    const binding = KEYBINDS[event.code];
    if (binding?.stop) bus.emit(binding.stop, undefined);
  });

  window.addEventListener("blur", clearAll);
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === null) clearAll();
  });
}
