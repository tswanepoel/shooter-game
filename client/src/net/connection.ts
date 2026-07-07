import { bus } from "../bus.ts";
import { RESPAWN } from "../config/combat.ts";
import { WS_PATH, WS_PORT } from "../config/network.ts";
import {
  commitPendingToLife,
  getActiveSlot,
  getPendingLoadout,
  stagePendingFromLife,
} from "../state/loadout.ts";
import { getLoadoutOverlay } from "../ui/loadoutOverlay.ts";
import { decodeServerMessage, type ClientMessage, type Vector3 } from "./wire.ts";

let socket: WebSocket | undefined;
let localId: string | undefined;
let deathAtMs: number | undefined;
let handlersBound = false;

function bindGameHandlers(): void {
  if (handlersBound) return;
  handlersBound = true;

  bus.on("jumpLaunched", () => sendIdOnly("jump"));
  bus.on("fired", () => sendIdOnly("fire"));

  bus.on("deathReceived", ({ victimId, deathAt }) => {
    if (victimId !== localId) return;
    deathAtMs = deathAt ?? Date.now();
    stagePendingFromLife();
  });

  bus.on("respawnRequested", () => {
    if (!localId || deathAtMs === undefined) return;
    if (getLoadoutOverlay().isOpen()) return;
    const elapsed = Date.now() - deathAtMs;
    if (elapsed < RESPAWN.minDelay * 1000) return;

    const pending = getPendingLoadout();
    send({
      type: "respawn",
      id: localId,
      primaryWeaponId: pending.primary,
      secondaryWeaponId: pending.secondary,
      activeSlot: getActiveSlot(),
    });
  });

  bus.on("forfeitRequested", () => {
    if (!localId) return;
    send({ type: "suicide", id: localId });
  });

  bus.on("weaponSwitched", ({ activeSlot }) => {
    if (!localId) return;
    send({ type: "weapon", id: localId, activeSlot });
  });
}

function handleMessage(raw: string): void {
  const message = decodeServerMessage(raw);
  if (!message) return;

  switch (message.type) {
    case "lobby":
      bus.emit("lobbyReady", message);
      bus.emit("takenUpdated", {
        type: "taken",
        characterIds: message.takenCharacterIds,
      });
      break;
    case "taken":
      bus.emit("takenUpdated", message);
      break;
    case "claimRejected":
      bus.emit("claimRejected", message);
      break;
    case "welcome":
      localId = message.id;
      bus.emit("welcomed", message);
      break;
    case "join":
      if (!localId) return;
      bus.emit("playerJoined", message);
      break;
    case "leave":
      if (!localId) return;
      bus.emit("playerLeft", message);
      break;
    case "pos":
      if (!localId) return;
      bus.emit("positionReceived", message);
      break;
    case "jump":
      if (!localId) return;
      bus.emit("jumpReceived", message);
      break;
    case "fire":
      if (!localId) return;
      bus.emit("fireReceived", message);
      break;
    case "weapon":
      if (!localId) return;
      bus.emit("weaponReceived", message);
      break;
    case "health":
      if (!localId) return;
      bus.emit("healthReceived", message);
      break;
    case "death":
      if (!localId) return;
      if (message.victimId === localId) deathAtMs = message.deathAt ?? Date.now();
      bus.emit("deathReceived", message);
      break;
    case "respawn":
      if (!localId) return;
      if (message.id === localId) {
        deathAtMs = undefined;
        const loadout = commitPendingToLife();
        bus.emit("loadoutCommitted", loadout);
      }
      bus.emit("respawnReceived", message);
      break;
  }
}

export function connectSpectator(): void {
  if (socket) return;

  bindGameHandlers();
  socket = new WebSocket(`ws://${window.location.hostname}:${WS_PORT}${WS_PATH}`);

  socket.addEventListener("error", () => {
    console.error("websocket connection failed — is the server running?");
  });

  socket.addEventListener("message", (event) => {
    handleMessage(String(event.data));
  });
}

export function sendClaim(
  characterId: string,
  primaryWeaponId: string | null,
  secondaryWeaponId: string | null,
): void {
  send({ type: "claim", characterId, primaryWeaponId, secondaryWeaponId });
}

export function sendPosition(position: Vector3, yaw: number, pitch: number): void {
  if (!localId) return;
  send({ type: "pos", id: localId, position, yaw, pitch });
}

function sendIdOnly(type: "jump" | "fire"): void {
  if (!localId) return;
  send({ type, id: localId });
}

export function sendHit(targetId: string): void {
  if (!localId) return;
  send({ type: "hit", id: localId, targetId });
}

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}