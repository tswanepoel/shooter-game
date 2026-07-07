import { bus } from "../bus.ts";
import { CHARACTER_IDS } from "../config/characters.ts";
import { sendClaim } from "../net/connection.ts";
import { getPendingLoadout, setLobbyLoadout } from "../state/loadout.ts";
import { getLoadoutOverlay } from "./loadoutOverlay.ts";
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

interface LobbyCard {
  readonly id: string;
  readonly cell: HTMLDivElement;
  readonly button: HTMLButtonElement;
  readonly preview: LobbyCharacterPreview;
}

export function showLobby(onWelcomed: () => void): void {
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
  title.style.cssText = "margin:0;font-size:1.5rem;font-weight:600;letter-spacing:0.02em;";

  const status = document.createElement("p");
  status.textContent = "Loading characters…";
  status.style.cssText = "margin:0;font-size:0.9rem;color:#8a96a8;min-height:1.25em;text-align:center;";

  const honeycomb = document.createElement("div");
  honeycomb.style.cssText = [
    "display:none",
    "position:relative",
    "margin:0 auto",
    "padding:8px 0",
  ].join(";");

  const graphBackdrop = document.createElement("div");
  graphBackdrop.style.cssText = [
    "position:absolute",
    "inset:-48px -24px",
    "pointer-events:none",
    "z-index:0",
    "opacity:0.4",
    "background-image:",
    "radial-gradient(circle at 50% 45%,rgba(68,136,255,0.14),transparent 58%),",
    "repeating-linear-gradient(0deg,transparent,transparent 55px,rgba(58,74,96,0.28) 56px),",
    "repeating-linear-gradient(60deg,transparent,transparent 55px,rgba(58,74,96,0.18) 56px),",
    "repeating-linear-gradient(-60deg,transparent,transparent 55px,rgba(58,74,96,0.18) 56px)",
  ].join("");
  honeycomb.appendChild(graphBackdrop);

  const joinButton = document.createElement("button");
  joinButton.type = "button";
  joinButton.textContent = "Join";
  joinButton.disabled = true;
  joinButton.style.cssText = [
    "padding:12px 36px",
    "border:none",
    "border-radius:8px",
    "background:#6af",
    "color:#000",
    "font-size:1rem",
    "font-weight:600",
    "cursor:pointer",
    "opacity:0.45",
  ].join(";");

  const hint = document.createElement("p");
  hint.textContent = "Pick a character, then choose your weapons.";
  hint.style.cssText = "margin:0;font-size:0.85rem;color:#6a7588;max-width:520px;text-align:center;line-height:1.45;";

  const loadoutOverlay = getLoadoutOverlay();

  overlay.append(title, status, honeycomb, joinButton, hint);
  document.body.appendChild(overlay);

  let selectedId: string | undefined;
  let takenIds = new Set<string>();
  let cards: LobbyCard[] = [];
  let sharedRenderer: ReturnType<typeof beginLobbyPreviews> | undefined;
  let frameId = 0;
  let lastTime = performance.now();
  let disposed = false;
  let claiming = false;

  const offLobbyReady = bus.on("lobbyReady", () => {
    if (disposed) return;
    status.textContent = "";
  });

  const offTakenUpdated = bus.on("takenUpdated", ({ characterIds }) => {
    if (disposed) return;
    takenIds = new Set(characterIds);
    applyTaken();
  });

  const offClaimRejected = bus.on("claimRejected", ({ reason }) => {
    if (disposed) return;
    claiming = false;
    joinButton.textContent = "Join";
    status.textContent =
      reason === "characterTaken"
        ? "That character was just taken — pick another."
        : "Invalid character — pick another.";
    status.style.color = "#f88";
    applyTaken();
    updateJoinButton();
  });

  const offWelcomed = bus.on("welcomed", () => {
    if (disposed) return;
    disposeLobby();
    onWelcomed();
  });

  function isTaken(id: string): boolean {
    return takenIds.has(id);
  }

  function clearSelection(): void {
    selectedId = undefined;
    for (const card of cards) {
      card.preview.setIdleActive(false);
      if (!isTaken(card.id)) {
        card.button.style.borderColor = "#2a3344";
        card.cell.style.filter = "none";
        card.button.setAttribute("aria-pressed", "false");
      }
    }
  }

  function updateJoinButton(): void {
    const canJoin = Boolean(selectedId) && !claiming && !isTaken(selectedId!);
    joinButton.disabled = !canJoin;
    joinButton.style.opacity = canJoin ? "1" : "0.45";
    joinButton.style.cursor = canJoin ? "pointer" : "not-allowed";
  }

  function setSelected(id: string): void {
    if (isTaken(id) || claiming) return;
    selectedId = id;
    status.textContent = "";
    status.style.color = "#8a96a8";
    for (const card of cards) {
      const selected = card.id === id;
      card.preview.setIdleActive(selected);
      if (isTaken(card.id)) continue;
      card.button.style.borderColor = selected ? "#6af" : "#2a3344";
      card.cell.style.filter = selected ? "drop-shadow(0 0 10px rgba(68,136,255,0.55))" : "none";
      card.button.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    updateJoinButton();
  }

  function applyTaken(): void {
    if (selectedId && isTaken(selectedId)) clearSelection();

    for (const card of cards) {
      const taken = isTaken(card.id);
      card.button.disabled = taken || claiming;
      card.button.style.opacity = taken ? "0.35" : "1";
      card.button.style.cursor = taken || claiming ? "not-allowed" : "pointer";
      if (taken) {
        card.preview.setIdleActive(false);
        card.button.style.borderColor = "#1e2430";
        card.cell.style.filter = "none";
        card.button.setAttribute("aria-pressed", "false");
      }
    }

    updateJoinButton();
  }

  function createCardButton(id: string): { cell: HTMLDivElement; button: HTMLButtonElement } {
    const cell = document.createElement("div");
    cell.style.cssText = [
      `width:${PERSONA_SIZE}px`,
      `height:${PERSONA_SIZE}px`,
      "flex-shrink:0",
      "z-index:1",
      "transition:filter 0.15s",
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
      "transition:border-color 0.15s,opacity 0.15s",
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

  function disposeLobby(): void {
    if (disposed) return;
    disposed = true;
    offLobbyReady();
    offTakenUpdated();
    offClaimRejected();
    offWelcomed();
    cancelAnimationFrame(frameId);
    for (const card of cards) card.preview.dispose();
    cards = [];
    endLobbyPreviews();
    sharedRenderer = undefined;
    loadoutOverlay.close();
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

      const clusterWidth = COLUMN_COUNT * CELL_PITCH - CELL_GAP;
      const clusterHeight =
        (CHARACTERS_PER_COLUMN - 1) * CELL_PITCH + PERSONA_SIZE + COLUMN_STAGGER;

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

          cell.style.position = "absolute";
          cell.style.left = `${columnLeft}px`;
          cell.style.top = `${columnTopOffset + row * CELL_PITCH}px`;

          button.addEventListener("click", () => setSelected(id));
          honeycomb.appendChild(cell);
          cards.push({ id, cell, button, preview });
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

  joinButton.addEventListener("click", () => {
    if (joinButton.disabled || !selectedId || claiming) return;

    loadoutOverlay.open({
      footerMode: "spawn",
      loadout: getPendingLoadout(),
      allowBackdropCancel: true,
      onCancel: () => {
        claiming = false;
        updateJoinButton();
      },
      onSpectate: () => {
        loadoutOverlay.close();
        claiming = false;
        updateJoinButton();
      },
      onSpawn: (loadout) => {
        loadoutOverlay.close();
        claiming = true;
        joinButton.disabled = true;
        joinButton.style.opacity = "0.45";
        joinButton.style.cursor = "not-allowed";
        joinButton.textContent = "Joining…";
        status.textContent = "";
        status.style.color = "#8a96a8";
        applyTaken();
        setLobbyLoadout(loadout);
        bus.emit("joinSpawnClicked", undefined);
        sendClaim(selectedId!, loadout.primary, loadout.secondary);
      },
    });
  });
}