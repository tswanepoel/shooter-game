import { bus } from "../bus.ts";
import { CHARACTER_IDS } from "../config/characters.ts";
import { sendClaim, sendLoadout } from "../net/connection.ts";
import { LoadoutModule } from "../modules/loadout/index.ts";
import { LoadoutIntentModule } from "../modules/loadout-intent/index.ts";
import { loadoutIntentState } from "../input/loadoutMenu.ts";
import { localPlayer } from "../state/world.ts";
import { getDisplayName, setSpectatorRole } from "../state/session.ts";
import { getLoadoutOverlay } from "./loadoutOverlay.ts";
import { SECONDARY_BUTTON_STYLE } from "./sharedUi.ts";
import {
  beginLobbyPreviews,
  createLobbyCharacterPreview,
  endLobbyPreviews,
  type LobbyCharacterPreview,
} from "./lobbyCharacterPreview.ts";

const PERSONA_SIZE = 132;
const CELL_GAP = 12;
const CELL_PITCH = PERSONA_SIZE + CELL_GAP;
const COLUMN_STAGGER = CELL_PITCH / 2;
const COLUMN_COUNT = 6;
const CHARACTERS_PER_COLUMN = 3;

const SELECT_MOVE_MS = 500;
const SELECT_HOLD_MS = 1500;
const SELECT_SCALE = 1.42;
const SELECT_HIGHLIGHT = "#6af";
const CELEBRATION_NAME_GAP = 58;
const CELEBRATION_NAME_FONT_SIZE = "1.45rem";

interface LobbyCard {
  readonly id: string;
  readonly cell: HTMLDivElement;
  readonly button: HTMLButtonElement;
  readonly preview: LobbyCharacterPreview;
  readonly homeLeft: number;
  readonly homeTop: number;
}

export interface LobbyHandlers {
  onSpawn(): void;
  onSpectate(): void;
}

export function showLobby(handlers: LobbyHandlers): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:20px",
    "padding:24px",
    "box-sizing:border-box",
    "background:radial-gradient(ellipse at 50% 20%,#1a2230 0%,#0a0c10 70%)",
    "color:#fff",
    "font-family:system-ui,sans-serif",
    "z-index:100",
    "overflow:auto",
  ].join(";");

  const title = document.createElement("h1");
  title.textContent = "Choose your character";
  title.style.cssText =
    "margin:0;font-size:1.5rem;font-weight:600;letter-spacing:0.02em;transition:opacity 0.4s ease;";

  const status = document.createElement("p");
  status.textContent = "Loading characters…";
  status.style.cssText = "margin:0;font-size:0.9rem;color:#8a96a8;min-height:1.25em;text-align:center;";

  const honeycomb = document.createElement("div");
  honeycomb.style.cssText = [
    "display:none",
    "position:relative",
    "margin:0 auto",
    "padding:8px 0",
    "overflow:visible",
  ].join(";");

  const graphBackdrop = document.createElement("div");
  graphBackdrop.style.cssText = [
    "position:absolute",
    "inset:-48px -24px",
    "pointer-events:none",
    "z-index:0",
    "opacity:0.4",
    "transition:opacity 0.45s ease",
    "background-image:",
    "radial-gradient(circle at 50% 45%,rgba(68,136,255,0.14),transparent 58%),",
    "repeating-linear-gradient(0deg,transparent,transparent 55px,rgba(58,74,96,0.28) 56px),",
    "repeating-linear-gradient(60deg,transparent,transparent 55px,rgba(58,74,96,0.18) 56px),",
    "repeating-linear-gradient(-60deg,transparent,transparent 55px,rgba(58,74,96,0.18) 56px)",
  ].join("");
  honeycomb.appendChild(graphBackdrop);

  const celebrationName = document.createElement("p");
  celebrationName.style.cssText = [
    "position:absolute",
    "margin:0",
    "padding:0",
    "transform:translate(-50%,-100%)",
    `font-size:${CELEBRATION_NAME_FONT_SIZE}`,
    "font-weight:600",
    "letter-spacing:0.04em",
    `color:${SELECT_HIGHLIGHT}`,
    "text-shadow:0 0 14px rgba(68,136,255,0.55)",
    "white-space:nowrap",
    "pointer-events:none",
    "z-index:25",
    "opacity:0",
  ].join(";");
  honeycomb.appendChild(celebrationName);

  const spectateButton = document.createElement("button");
  spectateButton.type = "button";
  spectateButton.textContent = "Spectate";
  spectateButton.style.cssText =
    SECONDARY_BUTTON_STYLE + ";min-width:160px;margin-top:36px;transition:opacity 0.4s ease;";

  const hint = document.createElement("p");
  hint.textContent = "Tap a character to play. Spectate watches without joining.";
  hint.style.cssText =
    "margin:0;font-size:0.85rem;color:#6a7588;max-width:520px;text-align:center;line-height:1.45;transition:opacity 0.4s ease;";

  const loadoutOverlay = getLoadoutOverlay();

  overlay.append(title, status, honeycomb, spectateButton, hint);
  document.body.appendChild(overlay);

  let clusterWidth = 0;
  let clusterHeight = 0;
  let selectedId: string | undefined;
  let takenIds = new Set<string>();
  let cards: LobbyCard[] = [];
  let sharedRenderer: ReturnType<typeof beginLobbyPreviews> | undefined;
  let frameId = 0;
  let lastTime = performance.now();
  let disposed = false;
  let claiming = false;
  let claimTimer: number | undefined;
  let celebrationNameTimer: number | undefined;

  const cellTransition = [
    `opacity ${SELECT_MOVE_MS}ms ease`,
    `transform ${SELECT_MOVE_MS}ms ease`,
    `left ${SELECT_MOVE_MS}ms ease`,
    `top ${SELECT_MOVE_MS}ms ease`,
    `filter ${SELECT_MOVE_MS}ms ease`,
  ].join(", ");

  const offTakenUpdated = bus.on("takenUpdated", ({ characterIds }) => {
    if (disposed || claiming) return;
    takenIds = new Set(characterIds);
    applyTaken();
  });

  const offClaimRejected = bus.on("claimRejected", ({ reason }) => {
    if (disposed) return;
    clearClaimTimer();
    resetSelectionVisuals();
    status.textContent =
      reason === "characterTaken"
        ? "That character was just taken — pick another."
        : "Invalid character — pick another.";
    status.style.color = "#f88";
  });

  const offWelcomed = bus.on("welcomed", () => {
    if (disposed || !selectedId) return;
    const id = selectedId;
    void loadoutOverlay.prepare();
    playClaimCelebration(id);
    claimTimer = window.setTimeout(() => {
      claimTimer = undefined;
      if (disposed || selectedId !== id) return;
      loadoutOverlay.open({
        footerMode: "spawn",
        loadout: loadoutIntentState.pending,
        onSpawn: (loadout) => {
          loadoutOverlay.close();
          LoadoutModule.set(localPlayer.loadout, loadout);
          LoadoutIntentModule.setPending(loadoutIntentState, loadout);
          sendLoadout(loadout);
          bus.emit("joinSpawnClicked", undefined);
          handlers.onSpawn();
        },
      });
      disposeLobby({ closeLoadout: false });
    }, SELECT_MOVE_MS + SELECT_HOLD_MS);
  });

  function clearClaimTimer(): void {
    if (claimTimer === undefined) return;
    window.clearTimeout(claimTimer);
    claimTimer = undefined;
  }

  function isTaken(id: string): boolean {
    return takenIds.has(id);
  }

  function setChromeVisible(visible: boolean): void {
    const opacity = visible ? "1" : "0";
    title.style.opacity = opacity;
    hint.style.opacity = opacity;
    graphBackdrop.style.opacity = visible ? "0.4" : "0";
    spectateButton.disabled = !visible;
    spectateButton.style.opacity = visible ? "1" : "0";
    spectateButton.style.pointerEvents = visible ? "auto" : "none";
  }

  function clearCelebrationNameTimer(): void {
    if (celebrationNameTimer === undefined) return;
    window.clearTimeout(celebrationNameTimer);
    celebrationNameTimer = undefined;
  }

  function hideCelebrationName(): void {
    clearCelebrationNameTimer();
    celebrationName.style.transition = `opacity ${SELECT_MOVE_MS}ms ease`;
    celebrationName.style.opacity = "0";
  }

  function positionCelebrationName(centerLeft: number, centerTop: number): void {
    const scaledRise = (PERSONA_SIZE * SELECT_SCALE - PERSONA_SIZE) / 2;
    celebrationName.textContent = getDisplayName() || "You";
    celebrationName.style.transition = cellTransition;
    celebrationName.style.left = `${centerLeft + PERSONA_SIZE / 2}px`;
    celebrationName.style.top = `${centerTop - scaledRise - CELEBRATION_NAME_GAP}px`;
    celebrationName.style.opacity = "0";
  }

  function revealCelebrationName(): void {
    celebrationName.style.transition = "opacity 0.35s ease";
    celebrationName.style.opacity = "1";
  }

  function resetSelectionVisuals(): void {
    claiming = false;
    selectedId = undefined;
    hideCelebrationName();
    setChromeVisible(true);

    for (const card of cards) {
      card.cell.style.transition = cellTransition;
      card.cell.style.left = `${card.homeLeft}px`;
      card.cell.style.top = `${card.homeTop}px`;
      card.cell.style.transform = "";
      card.cell.style.opacity = isTaken(card.id) ? "0.35" : "1";
      card.cell.style.zIndex = "1";
      card.cell.style.pointerEvents = isTaken(card.id) ? "none" : "";
      card.cell.style.filter = "none";
      card.preview.setIdleActive(false);
      card.button.disabled = isTaken(card.id);
      card.button.style.borderColor = isTaken(card.id) ? "#1e2430" : "#2a3344";
      card.button.style.cursor = isTaken(card.id) ? "not-allowed" : "pointer";
      card.button.setAttribute("aria-pressed", "false");
    }
  }

  function attemptCharacterSelect(id: string): void {
    if (isTaken(id) || claiming) return;

    claiming = true;
    selectedId = id;
    setChromeVisible(false);
    status.textContent = "";
    status.style.color = "#8a96a8";

    for (const card of cards) {
      const selected = card.id === id;
      card.cell.style.transition = "opacity 0.2s ease, border-color 0.2s ease";
      card.button.disabled = true;
      card.button.style.cursor = "default";
      card.preview.setIdleActive(false);

      if (selected) {
        card.cell.style.opacity = "1";
        card.cell.style.filter = "none";
        card.button.style.borderColor = "#6af";
        card.button.setAttribute("aria-pressed", "true");
        continue;
      }

      card.cell.style.opacity = "0.4";
      card.cell.style.pointerEvents = "none";
      card.button.setAttribute("aria-pressed", "false");
    }

    sendClaim(id);
  }

  function playClaimCelebration(id: string): void {
    status.textContent = "";
    status.style.color = "#8a96a8";

    const centerLeft = (clusterWidth - PERSONA_SIZE) / 2;
    const centerTop = (clusterHeight - PERSONA_SIZE) / 2;

    for (const card of cards) {
      const selected = card.id === id;
      card.cell.style.transition = cellTransition;
      card.button.disabled = true;
      card.button.style.cursor = "default";

      if (selected) {
        card.preview.setIdleActive(true);
        card.cell.style.zIndex = "20";
        card.cell.style.left = `${centerLeft}px`;
        card.cell.style.top = `${centerTop}px`;
        card.cell.style.transform = `scale(${SELECT_SCALE})`;
        card.cell.style.opacity = "1";
        card.cell.style.filter = "drop-shadow(0 0 22px rgba(68,136,255,0.7))";
        card.button.style.borderColor = SELECT_HIGHLIGHT;
        card.button.setAttribute("aria-pressed", "true");
        continue;
      }

      card.preview.setIdleActive(false);
      card.cell.style.opacity = "0";
      card.cell.style.pointerEvents = "none";
      card.cell.style.filter = "none";
      card.button.setAttribute("aria-pressed", "false");
    }

    positionCelebrationName(centerLeft, centerTop);
    clearCelebrationNameTimer();
    celebrationNameTimer = window.setTimeout(() => {
      celebrationNameTimer = undefined;
      if (disposed) return;
      revealCelebrationName();
    }, SELECT_MOVE_MS);
  }

  function applyTaken(): void {
    if (claiming) return;

    for (const card of cards) {
      const taken = isTaken(card.id);
      card.button.disabled = taken;
      card.button.style.opacity = taken ? "0.35" : "1";
      card.button.style.cursor = taken ? "not-allowed" : "pointer";
      card.cell.style.opacity = taken ? "0.35" : "1";
      card.cell.style.pointerEvents = taken ? "none" : "";
      if (taken) {
        card.preview.setIdleActive(false);
        card.button.style.borderColor = "#1e2430";
        card.cell.style.filter = "none";
        card.button.setAttribute("aria-pressed", "false");
      }
    }
  }

  function createCardButton(id: string): { cell: HTMLDivElement; button: HTMLButtonElement } {
    const cell = document.createElement("div");
    cell.style.cssText = [
      `width:${PERSONA_SIZE}px`,
      `height:${PERSONA_SIZE}px`,
      "flex-shrink:0",
      "z-index:1",
      "transform-origin:center center",
    ].join(";");

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.characterId = id;
    button.setAttribute("aria-label", `Select ${id}`);
    button.setAttribute("aria-pressed", "false");
    button.style.cssText = [
      "display:block",
      "width:100%",
      "aspect-ratio:1",
      "box-sizing:border-box",
      "padding:0",
      "border:2px solid #2a3344",
      "border-radius:50%",
      "background:#10141c",
      "overflow:hidden",
      "cursor:pointer",
      "transition:border-color 0.15s",
    ].join(";");

    const viewport = document.createElement("div");
    viewport.style.cssText = [
      "width:100%",
      "height:100%",
      "position:relative",
      "display:block",
      "overflow:hidden",
      "border-radius:50%",
    ].join(";");

    button.append(viewport);
    cell.appendChild(button);
    return { cell, button };
  }

  function disposeLobby(options?: { closeLoadout?: boolean }): void {
    if (disposed) return;
    disposed = true;
    clearClaimTimer();
    clearCelebrationNameTimer();
    offTakenUpdated();
    offClaimRejected();
    offWelcomed();
    cancelAnimationFrame(frameId);
    for (const card of cards) card.preview.dispose();
    cards = [];
    endLobbyPreviews();
    sharedRenderer = undefined;
    if (options?.closeLoadout !== false) {
      loadoutOverlay.close();
    }
    overlay.remove();
  }

  function tick(now: number): void {
    if (disposed || !sharedRenderer) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    for (const card of cards) card.preview.update(dt, sharedRenderer);
    frameId = requestAnimationFrame(tick);
  }

  void (async () => {
    try {
      const previews = await Promise.all(
        CHARACTER_IDS.map((id) => createLobbyCharacterPreview(id, PERSONA_SIZE, PERSONA_SIZE)),
      );

      if (disposed) {
        for (const preview of previews) preview.dispose();
        return;
      }

      sharedRenderer = beginLobbyPreviews(PERSONA_SIZE, PERSONA_SIZE);

      if (CHARACTER_IDS.length !== COLUMN_COUNT * CHARACTERS_PER_COLUMN) {
        throw new Error(
          `expected ${COLUMN_COUNT * CHARACTERS_PER_COLUMN} characters for honeycomb layout`,
        );
      }

      clusterWidth = COLUMN_COUNT * CELL_PITCH - CELL_GAP;
      clusterHeight = (CHARACTERS_PER_COLUMN - 1) * CELL_PITCH + PERSONA_SIZE + COLUMN_STAGGER;

      honeycomb.style.width = `${Math.ceil(clusterWidth)}px`;
      honeycomb.style.height = `${Math.ceil(clusterHeight)}px`;

      cards = [];

      for (let column = 0; column < COLUMN_COUNT; column++) {
        const columnLeft = column * CELL_PITCH;
        const columnTopOffset = column % 2 === 1 ? COLUMN_STAGGER : 0;

        for (let row = 0; row < CHARACTERS_PER_COLUMN; row++) {
          const cardIndex = column * CHARACTERS_PER_COLUMN + row;
          const id = CHARACTER_IDS[cardIndex]!;
          const preview = previews[cardIndex]!;
          const { cell, button } = createCardButton(id);
          const viewport = button.firstElementChild as HTMLDivElement;
          viewport.appendChild(preview.canvas);

          const homeTop = columnTopOffset + row * CELL_PITCH;
          cell.style.position = "absolute";
          cell.style.left = `${columnLeft}px`;
          cell.style.top = `${homeTop}px`;

          button.addEventListener("click", () => attemptCharacterSelect(id));
          honeycomb.appendChild(cell);
          cards.push({ id, cell, button, preview, homeLeft: columnLeft, homeTop });
        }
      }

      status.textContent = "";
      honeycomb.style.display = "block";
      applyTaken();
      frameId = requestAnimationFrame(tick);
    } catch (error) {
      console.error("lobby character previews failed", error);
      status.textContent = "Failed to load characters. Refresh to try again.";
      status.style.color = "#f88";
    }
  })();

  spectateButton.addEventListener("click", () => {
    if (claiming) return;
    setSpectatorRole();
    disposeLobby();
    handlers.onSpectate();
  });
}