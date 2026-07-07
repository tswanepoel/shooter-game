import { bus } from "../bus.ts";
import { DEATH_SCREEN } from "../config/combat.ts";
import { FORFEIT_KEY } from "../config/keybinds.ts";
import { localPlayer } from "../state/world.ts";

let holdStartedAtMs: number | undefined;
let lastSuicideAtMs = 0;
let lastDamageAtMs = 0;

export function initForfeit(): void {
  bus.on("damageTaken", () => {
    lastDamageAtMs = Date.now();
  });

  bus.on("forfeitRequested", () => {
    lastSuicideAtMs = Date.now();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== FORFEIT_KEY || event.repeat) return;
    if (!localPlayer.alive) return;
    holdStartedAtMs = Date.now();
  });

  window.addEventListener("keyup", (event) => {
    if (event.code !== FORFEIT_KEY) return;
    holdStartedAtMs = undefined;
  });

  window.addEventListener("blur", () => {
    holdStartedAtMs = undefined;
  });
}

export function tickForfeit(): void {
  if (holdStartedAtMs === undefined || !localPlayer.alive) return;

  const now = Date.now();
  const holdMs = now - holdStartedAtMs;
  if (holdMs < DEATH_SCREEN.suicideHoldSeconds * 1000) return;

  if (now - lastSuicideAtMs < DEATH_SCREEN.suicideCooldownSeconds * 1000) {
    holdStartedAtMs = undefined;
    return;
  }

  if (now - lastDamageAtMs < DEATH_SCREEN.recentDamageBlockSeconds * 1000) {
    holdStartedAtMs = undefined;
    return;
  }

  holdStartedAtMs = undefined;
  bus.emit("forfeitRequested", undefined);
}