const DISPLAY_NAME_KEY = "shooter-display-name";

export const DEFAULT_ROOM_CODE = "dev";

export type SessionRole = "none" | "roomMember" | "spectator" | "player";

let sessionRole: SessionRole = "none";
let sessionId: string | undefined;
let roomCode: string | undefined;
let displayName = "";

export function loadStoredDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDisplayName(name: string): void {
  displayName = name.trim();
  try {
    if (displayName) {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName);
    } else {
      localStorage.removeItem(DISPLAY_NAME_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function getDisplayName(): string {
  return displayName;
}

export function getSessionId(): string | undefined {
  return sessionId;
}

export function getRoomCode(): string | undefined {
  return roomCode;
}

export function getSessionRole(): SessionRole {
  return sessionRole;
}

export function isSpectatorSession(): boolean {
  return sessionRole === "spectator";
}

export function isPlayerSession(): boolean {
  return sessionRole === "player";
}

export function setRoomJoined(joined: {
  sessionId: string;
  roomCode: string;
  displayName: string;
}): void {
  sessionId = joined.sessionId;
  roomCode = joined.roomCode;
  displayName = joined.displayName;
  sessionRole = "roomMember";
}

export function setSpectatorRole(): void {
  sessionRole = "spectator";
}

export function setPlayerRole(): void {
  sessionRole = "player";
}

export function resetSession(): void {
  sessionRole = "none";
  sessionId = undefined;
  roomCode = undefined;
}