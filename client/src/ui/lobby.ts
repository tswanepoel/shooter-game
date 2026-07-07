import { CHARACTER_IDS } from "../config/characters.ts";
import {
  beginLobbyPreviews,
  createLobbyCharacterPreview,
  endLobbyPreviews,
  type LobbyCharacterPreview,
} from "./lobbyCharacterPreview.ts";

const PREVIEW_WIDTH = 132;
const PREVIEW_HEIGHT = 200;

interface LobbyCard {
  readonly id: string;
  readonly button: HTMLButtonElement;
  readonly preview: LobbyCharacterPreview;
}

export function showLobby(onJoin: (characterId: string) => void): void {
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
  status.style.cssText = "margin:0;font-size:0.9rem;color:#8a96a8;";

  const grid = document.createElement("div");
  grid.style.cssText = [
    "display:none",
    "grid-template-columns:repeat(auto-fill,minmax(132px,1fr))",
    "gap:14px",
    "justify-content:center",
    "width:min(960px,100%)",
  ].join(";");

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
  hint.textContent = "Pick a character to join. Selected plays idle. Press Q in-game to switch weapons.";
  hint.style.cssText = "margin:0;font-size:0.85rem;color:#6a7588;max-width:520px;text-align:center;line-height:1.45;";

  overlay.append(title, status, grid, joinButton, hint);
  document.body.appendChild(overlay);

  let selectedId: string | undefined;
  let cards: LobbyCard[] = [];
  let sharedRenderer: ReturnType<typeof beginLobbyPreviews> | undefined;
  let frameId = 0;
  let lastTime = performance.now();
  let disposed = false;

  function setSelected(id: string): void {
    selectedId = id;
    for (const card of cards) {
      const selected = card.id === id;
      card.preview.setIdleActive(selected);
      card.button.style.borderColor = selected ? "#6af" : "#2a3344";
      card.button.style.boxShadow = selected ? "0 0 0 1px #6af,0 8px 24px rgba(68,136,255,0.2)" : "none";
      card.button.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    joinButton.disabled = false;
    joinButton.style.opacity = "1";
    joinButton.style.cursor = "pointer";
  }

  function createCardButton(id: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.characterId = id;
    button.setAttribute("aria-label", `Select ${id}`);
    button.setAttribute("aria-pressed", "false");
    button.style.cssText = [
      "display:block",
      "padding:0",
      "border:2px solid #2a3344",
      "border-radius:10px",
      "background:#10141c",
      "overflow:hidden",
      "cursor:pointer",
      "transition:border-color 0.15s,box-shadow 0.15s",
    ].join(";");

    const viewport = document.createElement("div");
    viewport.style.cssText = `width:${PREVIEW_WIDTH}px;height:${PREVIEW_HEIGHT}px;max-width:100%;`;

    button.append(viewport);
    return button;
  }

  function disposeLobby(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    for (const card of cards) card.preview.dispose();
    cards = [];
    endLobbyPreviews();
    sharedRenderer = undefined;
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
        CHARACTER_IDS.map((id) => createLobbyCharacterPreview(id, PREVIEW_WIDTH, PREVIEW_HEIGHT)),
      );

      if (disposed) {
        for (const preview of previews) preview.dispose();
        return;
      }

      sharedRenderer = beginLobbyPreviews(PREVIEW_WIDTH, PREVIEW_HEIGHT);

      cards = CHARACTER_IDS.map((id, index) => {
        const preview = previews[index]!;
        const button = createCardButton(id);
        const viewport = button.firstElementChild as HTMLDivElement;
        viewport.appendChild(preview.canvas);

        button.addEventListener("click", () => setSelected(id));

        grid.appendChild(button);
        return { id, button, preview };
      });

      status.remove();
      grid.style.display = "grid";
      frameId = requestAnimationFrame(tick);
    } catch (error) {
      console.error("lobby character previews failed", error);
      status.textContent = "Failed to load characters. Refresh to try again.";
      status.style.color = "#f88";
    }
  })();

  joinButton.addEventListener("click", () => {
    if (joinButton.disabled || !selectedId) return;
    disposeLobby();
    onJoin(selectedId);
  });
}