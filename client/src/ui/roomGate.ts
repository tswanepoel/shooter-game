import { connectAndJoinRoom, RoomJoinError } from "../net/connection.ts";
import {
  readRoomCodeFromUrl,
  writeRoomCodeToUrl,
} from "../state/roomRoute.ts";
import {
  DEFAULT_ROOM_CODE,
  getDisplayName,
  getRoomCode,
  loadStoredDisplayName,
  saveDisplayName,
} from "../state/session.ts";
import {
  FIELD_INPUT_STYLE,
  FIELD_LABEL_STYLE,
  OVERLAY_BG,
  PANEL_STYLE,
  PRIMARY_BUTTON_STYLE,
} from "./sharedUi.ts";

export interface RoomGateHandlers {
  onJoined(): void;
}

export function showRoomGate(handlers: RoomGateHandlers): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:24px",
    "box-sizing:border-box",
    `background:${OVERLAY_BG}`,
    "color:#fff",
    "font-family:system-ui,sans-serif",
    "z-index:120",
  ].join(";");

  const panel = document.createElement("div");
  panel.style.cssText = PANEL_STYLE;

  const title = document.createElement("h1");
  title.textContent = "Join a room";
  title.style.cssText = "margin:0 0 8px;font-size:1.5rem;font-weight:600;";

  const subtitle = document.createElement("p");
  subtitle.textContent = "Enter your name and a room code to get started.";
  subtitle.style.cssText = "margin:0 0 20px;font-size:0.92rem;color:#8a96a8;line-height:1.45;";

  const nameLabel = document.createElement("label");
  nameLabel.style.cssText = "display:block;margin-bottom:14px;";
  const nameCaption = document.createElement("span");
  nameCaption.textContent = "Display name";
  nameCaption.style.cssText = FIELD_LABEL_STYLE;
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 24;
  nameInput.autocomplete = "name";
  nameInput.placeholder = "Your name";
  nameInput.value = loadStoredDisplayName();
  nameInput.style.cssText = FIELD_INPUT_STYLE;
  nameLabel.append(nameCaption, nameInput);

  const codeLabel = document.createElement("label");
  codeLabel.style.cssText = "display:block;margin-bottom:18px;";
  const codeCaption = document.createElement("span");
  codeCaption.textContent = "Room code";
  codeCaption.style.cssText = FIELD_LABEL_STYLE;
  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.maxLength = 24;
  codeInput.autocomplete = "off";
  codeInput.placeholder = "Room code";
  codeInput.value = readRoomCodeFromUrl() ?? DEFAULT_ROOM_CODE;
  codeInput.style.cssText = FIELD_INPUT_STYLE;
  writeRoomCodeToUrl(codeInput.value);
  codeLabel.append(codeCaption, codeInput);

  const status = document.createElement("p");
  status.style.cssText = "margin:0 0 14px;min-height:1.25em;font-size:0.88rem;color:#f88;";

  const joinButton = document.createElement("button");
  joinButton.type = "button";
  joinButton.textContent = "Join room";
  joinButton.style.cssText = PRIMARY_BUTTON_STYLE + ";width:100%;";

  panel.append(title, subtitle, nameLabel, codeLabel, status, joinButton);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  let joining = false;

  function canJoin(): boolean {
    return nameInput.value.trim().length > 0 && codeInput.value.trim().length > 0 && !joining;
  }

  function refreshButton(): void {
    joinButton.disabled = !canJoin();
    joinButton.style.opacity = canJoin() ? "1" : "0.45";
    joinButton.style.cursor = canJoin() ? "pointer" : "not-allowed";
  }

  async function tryJoin(): Promise<void> {
    if (!canJoin()) return;
    joining = true;
    status.textContent = "";
    joinButton.textContent = "Joining…";
    refreshButton();

    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    saveDisplayName(name);

    try {
      await connectAndJoinRoom(code, name);
      writeRoomCodeToUrl(getRoomCode() ?? code);
      overlay.remove();
      handlers.onJoined();
    } catch (error) {
      console.error("room join failed", error);
      status.textContent =
        error instanceof RoomJoinError && error.reason === "nameTaken"
          ? "That name is already in this room."
          : error instanceof RoomJoinError && error.reason === "invalid"
            ? "Enter a display name and room code."
            : "Could not join room. Is the server running?";
      joining = false;
      joinButton.textContent = "Join room";
      refreshButton();
    }
  }

  joinButton.addEventListener("click", () => {
    void tryJoin();
  });

  nameInput.addEventListener("input", refreshButton);
  codeInput.addEventListener("input", () => {
    writeRoomCodeToUrl(codeInput.value);
    refreshButton();
  });

  window.addEventListener("popstate", () => {
    codeInput.value = readRoomCodeFromUrl() ?? DEFAULT_ROOM_CODE;
    refreshButton();
  });
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") void tryJoin();
  });
  codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") void tryJoin();
  });

  refreshButton();
  nameInput.focus();
  if (!getDisplayName() && nameInput.value) saveDisplayName(nameInput.value);
}