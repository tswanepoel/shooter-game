import { bus } from "../bus.ts";
import { RESPAWN } from "../config/combat.ts";
import { isLoadoutMenuKey } from "../config/keybinds.ts";
import {
  clearPendingPreserve,
  getLifeLoadout,
  getPendingLoadout,
  preservePendingLoadoutForNextDeath,
  setPendingSlot,
  stagePendingFromLife,
} from "../state/loadout.ts";
import { getLocalPlayerId, localPlayer } from "../state/world.ts";
import { getLoadoutOverlay } from "../ui/loadoutOverlay.ts";
import { releasePointerLockForUi } from "./pointerLock.ts";

let deathAtMs: number | undefined;

function canRespawnNow(): boolean {
  if (deathAtMs === undefined) return false;
  return Date.now() - deathAtMs >= RESPAWN.minDelay * 1000;
}

function syncPendingLoadout(loadout: { primary: string | null; secondary: string | null }): void {
  setPendingSlot("primary", loadout.primary);
  setPendingSlot("secondary", loadout.secondary);
  bus.emit("loadoutPendingChanged", undefined);
}

export function initLoadoutMenu(): void {
  const overlay = getLoadoutOverlay();

  function openLoadoutOverlay(): void {
    releasePointerLockForUi();

    if (localPlayer.alive) {
      clearPendingPreserve();
      stagePendingFromLife();
      overlay.open({
        footerMode: "alive",
        releaseCapture: false,
        loadout: getLifeLoadout(),
        onChange: syncPendingLoadout,
        onClose: () => {
          stagePendingFromLife();
          overlay.close();
        },
        onSpectate: () => {
          stagePendingFromLife();
          overlay.close();
        },
        onApply: (loadout) => {
          syncPendingLoadout(loadout);
          preservePendingLoadoutForNextDeath();
          overlay.close();
          bus.emit("forfeitRequested", undefined);
        },
      });
      return;
    }

    overlay.open({
      footerMode: "spawn",
      releaseCapture: false,
      loadout: getPendingLoadout(),
      spawnEnabled: canRespawnNow(),
      onChange: syncPendingLoadout,
      onSpectate: () => {
        overlay.close();
      },
      onSpawn: () => {
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
      if (localPlayer.alive) stagePendingFromLife();
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