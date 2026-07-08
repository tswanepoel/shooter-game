const ROOM_ROUTE_PREFIX = "/r/";

/** Match server-side room code normalization. */
export function normalizeRoomCode(code: string): string {
  return code.trim().toLowerCase();
}

export function readRoomCodeFromUrl(): string | undefined {
  const path = window.location.pathname;
  if (!path.startsWith(ROOM_ROUTE_PREFIX)) return undefined;

  const segment = path.slice(ROOM_ROUTE_PREFIX.length).split("/")[0];
  if (!segment) return undefined;

  const normalized = normalizeRoomCode(decodeURIComponent(segment));
  return normalized.length > 0 ? normalized : undefined;
}

export function roomPathForCode(code: string): string {
  const normalized = normalizeRoomCode(code);
  if (!normalized) return "/";
  return `${ROOM_ROUTE_PREFIX}${encodeURIComponent(normalized)}`;
}

/** Keep the address bar shareable without adding history entries. */
export function writeRoomCodeToUrl(code: string): void {
  const nextPath = roomPathForCode(code);
  if (window.location.pathname === nextPath) return;
  window.history.replaceState(null, "", nextPath);
}