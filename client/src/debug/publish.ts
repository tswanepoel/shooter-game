import type { AimDebugSnapshot } from "./aimSnapshot.ts";

const DEBUG_ENDPOINT = "http://127.0.0.1:17373/__debug/snapshot";

let inFlight = false;
let pending: AimDebugSnapshot | undefined;
let lastOk = false;
let lastError = "not connected";

async function flush(): Promise<void> {
  if (inFlight || !pending) return;

  const snapshot = pending;
  pending = undefined;
  inFlight = true;

  try {
    if (!import.meta.env.DEV) {
      lastOk = false;
      lastError = "production build";
      return;
    }
    const response = await fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      keepalive: true,
    });
    lastOk = response.ok;
    lastError = response.ok ? "" : `HTTP ${response.status}`;
  } catch {
    lastOk = false;
    lastError = "debug relay offline (npm run dev)";
  } finally {
    inFlight = false;
    if (pending) void flush();
  }
}

export function publishAimDebugSnapshot(snapshot: AimDebugSnapshot): void {
  if (!import.meta.env.DEV) return;
  pending = snapshot;
  void flush();
}

export function debugStreamStatus(): { ok: boolean; error: string } {
  return { ok: lastOk, error: lastError };
}