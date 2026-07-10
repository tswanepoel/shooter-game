import { bus } from "../bus.ts";
import { RESPAWN } from "../config/combat.ts";
import { LoadoutIntentModule, createInitialState as createLoadoutIntentState, type LoadoutIntentState } from "../modules/loadout-intent/index.ts";
import { getLocalPlayerId, localPlayer } from "../state/world.ts";
import { getLoadoutOverlay } from "../ui/loadoutOverlay.ts";
import { releasePointerLockForUi } from "./pointerLock.ts";

const LOADOUT_MENU_KEY = "KeyO";

export const loadoutIntentState: LoadoutIntentState = createLoadoutIntentState();

let deathAtMs: number | undefined;

function isLoadoutMenuKey(code: string): boolean {
  return code === LOADOUT_MENU_KEY;
}

function canRespawnNow(): boolean {
  if (deathAtMs === undefined) return false;
  return Date.now() - deathAtMs >= RESPAWN.minDelay * 1000;
}

export function initLoadoutMenu(): void {
  const overlay = getLoadoutOverlay();

  function openLoadoutOverlay(): void {
    releasePointerLockForUi();

    if (localPlayer.alive) {
      overlay.open({
        footerMode: "alive",
        releaseCapture: false,
        loadout: localPlayer.loadout,
        onClose: () => {
          overlay.close();
        },
        onApply: (loadout) => {
          LoadoutIntentModule.setPending(loadoutIntentState, loadout);
          overlay.close();
          bus.emit("forfeitRequested", undefined);
        },
      });
      return;
    }

    overlay.open({
      footerMode: "spawn",
      releaseCapture: false,
      loadout: loadoutIntentState.pending,
      spawnEnabled: canRespawnNow(),
      onSpawn: (loadout) => {
        LoadoutIntentModule.setPending(loadoutIntentState, loadout);
        overlay.close();
        bus.emit("respawnRequested", undefined);
      },
    });
  }

  function handleLoadoutKey(event: KeyboardEvent): void {
    if (!getLocalPlayerId()) return;
    if (!isLoadoutMenuKey(event.code)) return;
    event.preventDefault();

    if (overlay.isOpen()) {
      overlay.close();
      return;
    }

    openLoadoutOverlay();
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat) return;
      handleLoadoutKey(event);
    },
    { capture: true },
  );

  bus.on("respawnReceived", ({ id }) => {
    if (id !== getLocalPlayerId()) return;
    deathAtMs = undefined;
    overlay.close();
  });

  bus.on("deathReceived", ({ victimId, deathAt }) => {
    if (victimId !== getLocalPlayerId()) return;
    deathAtMs = deathAt ?? Date.now();
    overlay.close();
  });
}
