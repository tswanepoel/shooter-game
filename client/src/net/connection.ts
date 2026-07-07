import { bus } from "../bus.ts";
import { RESPAWN } from "../config/combat.ts";
import { WS_PATH, WS_PORT } from "../config/network.ts";
import { decodeServerMessage, type ClientMessage, type Vector3 } from "./wire.ts";

let socket: WebSocket | undefined;
let localId: string | undefined;
let pendingCharacterId: string | undefined;
let deathAtMs: number | undefined;

export function connect(characterId: string): void {
  pendingCharacterId = characterId;
  const params = new URLSearchParams({ characterId });
  socket = new WebSocket(
    `ws://${window.location.hostname}:${WS_PORT}${WS_PATH}?${params}`,
  );

  const sendSelect = (): void => {
    if (!pendingCharacterId) return;
    send({ type: "select", characterId: pendingCharacterId });
    pendingCharacterId = undefined;
  };

  socket.addEventListener("open", sendSelect);
  if (socket.readyState === WebSocket.OPEN) sendSelect();

  socket.addEventListener("error", () => {
    console.error("websocket connection failed — is the server running?");
  });

  socket.addEventListener("message", (event) => {
    const message = decodeServerMessage(event.data);
    if (!message) return;

    switch (message.type) {
      case "welcome":
        localId = message.id;
        console.log("welcome", message);
        if (!("characterId" in message) || !("weaponId" in message)) {
          console.warn(
            "welcome is missing characterId/weaponId — restart the server (dotnet run in server/)",
          );
        }
        bus.emit("welcomed", message);
        break;
      case "join":
        console.log("join", message);
        if (!("characterId" in message) || !("weaponId" in message)) {
          console.warn(
            "join is missing characterId/weaponId — restart the server (dotnet run in server/)",
          );
        }
        bus.emit("playerJoined", message);
        break;
      case "leave":
        console.log("leave", message);
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
        console.log("health", message);
        bus.emit("healthReceived", message);
        break;
      case "death":
        console.log("death", message);
        if (message.victimId === localId) deathAtMs = message.deathAt ?? Date.now();
        bus.emit("deathReceived", message);
        break;
      case "respawn":
        console.log("respawn", message);
        if (message.id === localId) deathAtMs = undefined;
        bus.emit("respawnReceived", message);
        break;
    }
  });

  bus.on("jumpLaunched", () => sendIdOnly("jump"));
  bus.on("fired", () => sendIdOnly("fire"));
  bus.on("respawnRequested", () => {
    if (!localId || deathAtMs === undefined) return;
    const elapsed = Date.now() - deathAtMs;
    if (elapsed < RESPAWN.minDelay * 1000) return;
    send({ type: "respawn", id: localId });
  });
  bus.on("weaponSwitched", ({ weaponId }) => {
    if (!localId) return;
    send({ type: "weapon", id: localId, weaponId });
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

export function sendHit(targetId: string): void {
  if (!localId) return;
  send({ type: "hit", id: localId, targetId });
}

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}