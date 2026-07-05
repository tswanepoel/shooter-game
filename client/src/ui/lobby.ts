import { CHARACTER_IDS, getCharacterRecipe } from "../config/characters.ts";

export function showLobby(onJoin: (characterId: string) => void): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:24px",
    "background:rgba(0,0,0,0.85)",
    "color:#fff",
    "font-family:system-ui,sans-serif",
    "z-index:100",
  ].join(";");

  const title = document.createElement("h1");
  title.textContent = "Choose your character";
  title.style.cssText = "margin:0;font-size:1.5rem;font-weight:600;";

  const grid = document.createElement("div");
  grid.style.cssText = "display:flex;flex-wrap:wrap;gap:12px;justify-content:center;max-width:640px;";

  let selectedId = CHARACTER_IDS[0];

  for (const id of CHARACTER_IDS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = id.replace("character-", "").toUpperCase();
    button.title = getCharacterRecipe(id).modelUrl;
    button.style.cssText = [
      "width:72px",
      "height:72px",
      "border:2px solid #444",
      "border-radius:8px",
      "background:#1a1a1a",
      "color:#fff",
      "font-size:1.1rem",
      "font-weight:600",
      "cursor:pointer",
    ].join(";");

    const select = (): void => {
      selectedId = id;
      for (const child of grid.children) {
        (child as HTMLButtonElement).style.borderColor = "#444";
      }
      button.style.borderColor = "#6af";
    };

    button.addEventListener("click", select);
    if (id === selectedId) button.style.borderColor = "#6af";
    grid.appendChild(button);
  }

  const joinButton = document.createElement("button");
  joinButton.type = "button";
  joinButton.textContent = "Join";
  joinButton.style.cssText = [
    "padding:12px 32px",
    "border:none",
    "border-radius:8px",
    "background:#6af",
    "color:#000",
    "font-size:1rem",
    "font-weight:600",
    "cursor:pointer",
  ].join(";");

  const hint = document.createElement("p");
  hint.textContent = "Character choice applies to your model (visible to other players). Press Q in-game to switch weapons.";
  hint.style.cssText = "margin:0;font-size:0.85rem;color:#888;max-width:420px;text-align:center;";

  joinButton.addEventListener("click", () => {
    overlay.remove();
    onJoin(selectedId);
  });

  overlay.append(title, grid, joinButton, hint);
  document.body.appendChild(overlay);
}