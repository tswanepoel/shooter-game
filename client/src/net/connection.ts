import { bus } from "../bus.ts";
import { WS_PATH, WS_PORT } from "../config/network.ts";
import { decodeServerMessage, type ClientMessage, type Vector3 } from "./wire.ts";

let socket: WebSocket | undefined;
let localId: string | undefined;

export function connect(): void {
  // Derive the host from wherever the page was loaded from — hardcoding
  // "localhost" breaks the moment the client is opened over LAN, since
  // "localhost" then resolves to the browser's own machine, not the server.
  socket = new WebSocket(`ws://${window.location.hostname}:${WS_PORT}${WS_PATH}`);

  socket.addEventListener("message", (event) => {
    const message = decodeServerMessage(event.data);
    if (!message) return;

    switch (message.type) {
      case "welcome":
        localId = message.id;
        console.log("welcome", message);
        bus.emit("welcomed", message);
        break;
      case "join":
        console.log("join", message);
        bus.emit("playerJoined", message);
        break;
      case "leave":
        console.log("leave", message);
        bus.emit("playerLeft", message);
        break;
      case "pos":
        bus.emit("positionReceived", message);
        break;
    }
  });
}

export function sendPosition(position: Vector3, yaw: number, pitch: number): void {
  if (!localId) return;
  send({ type: "pos", id: localId, position, yaw, pitch });
}

function send(message: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}
