import { bus } from "../bus.ts";
import { WS_URL } from "../config/network.ts";
import { decodeServerMessage } from "./wire.ts";

export function connect(): void {
  const socket = new WebSocket(WS_URL);

  socket.addEventListener("message", (event) => {
    const message = decodeServerMessage(event.data);
    if (!message) return;

    switch (message.type) {
      case "welcome":
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
    }
  });
}
