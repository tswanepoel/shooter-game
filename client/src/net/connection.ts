import { bus } from "../bus.ts";
import { RESPAWN } from "../config/combat.ts";
import { LoadoutModule, type LoadoutState as Loadout } from "../modules/loadout/index.ts";
import { loadoutIntentState } from "../input/loadoutMenu.ts";
import { WeaponSwapModule } from "../modules/weapon-swap/index.ts";
import { getActiveSlot, localPlayer } from "../state/world.ts";
import { setRoomJoined } from "../state/session.ts";
import { getLoadoutOverlay } from "../ui/loadoutOverlay.ts";
import { decodeServerMessage, type ClientMessage, type Vector3 } from "./wire.ts";

const WS_PORT = 5179;
const WS_PATH = "/ws";

let socket: WebSocket | undefined;
let localId: string | undefined;
let deathAtMs: number | undefined;
let handlersBound = false;
let joinRoomPromise: Promise<void> | undefined;
let joinRoomResolve: (() => void) | undefined;
let joinRoomReject: ((error: Error) => void) | undefined;

export type RoomJoinFailureReason = "nameTaken" | "invalid" | "connection";

export class RoomJoinError extends Error {
  readonly reason: RoomJoinFailureReason;

  constructor(reason: RoomJoinFailureReason, message?: string) {
    super(message ?? reason);
    this.name = "RoomJoinError";
    this.reason = reason;
  }
}

function bindGameHandlers(): void {
  if (handlersBound) return;
  handlersBound = true;

  bus.on("jumpLaunched", () => sendIdOnly("jump"));
  bus.on("fired", () => sendIdOnly("fire"));

  bus.on("deathReceived", ({ victimId, deathAt }) => {
    if (victimId !== localId) return;
    deathAtMs = deathAt ?? Date.now();
  });

  bus.on("respawnRequested", () => {
    if (!localId || deathAtMs === undefined) return;
    if (getLoadoutOverlay().isOpen()) return;
    const elapsed = Date.now() - deathAtMs;
    if (elapsed < RESPAWN.minDelay * 1000) return;

    const pending = loadoutIntentState.pending;
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
    case "roomJoined":
      setRoomJoined({
        sessionId: message.sessionId,
        roomCode: message.roomCode,
        displayName: message.displayName,
      });
      bus.emit("roomJoined", message);
      joinRoomResolve?.();
      joinRoomResolve = undefined;
      joinRoomReject = undefined;
      joinRoomPromise = undefined;
      bus.emit("takenUpdated", {
        type: "taken",
        characterIds: message.takenCharacterIds,
      });
      break;
    case "taken":
      bus.emit("takenUpdated", message);
      break;
    case "roomJoinRejected":
      rejectJoinRoom(new RoomJoinError(message.reason));
      break;
    case "claimRejected":
      bus.emit("claimRejected", message);
      break;
    case "welcome":
      localId = message.id;
      bus.emit("welcomed", message);
      break;
    case "join":
      bus.emit("playerJoined", message);
      break;
    case "leave":
      bus.emit("playerLeft", message);
      break;
    case "pos":
      bus.emit("positionReceived", message);
      break;
    case "jump":
      bus.emit("jumpReceived", message);
      break;
    case "fire":
      bus.emit("fireReceived", message);
      break;
    case "weapon":
      bus.emit("weaponReceived", message);
      break;
    case "health":
      bus.emit("healthReceived", message);
      break;
    case "death":
      if (message.victimId === localId) deathAtMs = message.deathAt ?? Date.now();
      bus.emit("deathReceived", message);
      break;
    case "respawn":
      if (localId && message.id === localId) {
        deathAtMs = undefined;
        const loadout = LoadoutModule.set(localPlayer.loadout, loadoutIntentState.pending);
        WeaponSwapModule.setActiveSlot(localPlayer.weaponSwap, WeaponSwapModule.resolveDefaultSlot(loadout));
        bus.emit("loadoutCommitted", loadout);
      }
      bus.emit("respawnReceived", message);
      break;
  }
}

function rejectJoinRoom(error: Error): void {
  joinRoomReject?.(error);
  joinRoomResolve = undefined;
  joinRoomReject = undefined;
  joinRoomPromise = undefined;
}

export function connectAndJoinRoom(code: string, displayName: string): Promise<void> {
  if (joinRoomPromise) return joinRoomPromise;

  bindGameHandlers();

  joinRoomPromise = new Promise<void>((resolve, reject) => {
    joinRoomResolve = resolve;
    joinRoomReject = reject;
  });

  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
    socket = undefined;
  }

  socket = new WebSocket(`ws://${window.location.hostname}:${WS_PORT}${WS_PATH}`);

  socket.addEventListener("open", () => {
    send({ type: "joinRoom", code, displayName });
  });

  socket.addEventListener("error", () => {
    rejectJoinRoom(new RoomJoinError("connection", "websocket connection failed"));
  });

  socket.addEventListener("close", () => {
    if (joinRoomPromise) {
      rejectJoinRoom(new RoomJoinError("connection", "websocket closed before room join"));
    }
  });

  socket.addEventListener("message", (event) => {
    handleMessage(String(event.data));
  });

  return joinRoomPromise;
}

export function sendClaim(characterId: string): void {
  send({ type: "claim", characterId });
}

export function sendLoadout(loadout: Loadout): void {
  if (!localId) return;
  send({
    type: "loadout",
    id: localId,
    primaryWeaponId: loadout.primary,
    secondaryWeaponId: loadout.secondary,
    activeSlot: getActiveSlot(),
  });
}

export function sendPosition(position: Vector3, yaw: number, pitch: number): void {
  if (!localId) return;
  send({ type: "pos", id: localId, position, yaw, pitch });
}

function sendIdOnly(type: "jump" | "fire"): void {
  if (!localId) return;
  send({ type, id: localId });
}

export function sendHit(targetId: string, bodyPart: string, speedAtImpact: number): void {
  if (!localId) return;
  send({ type: "hit", id: localId, targetId, bodyPart, speedAtImpact });
}

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}