export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerSnapshot {
  id: string;
  position: Vector3;
  yaw: number;
  pitch: number;
  alive: boolean;
}

export interface WelcomeMessage {
  type: "welcome";
  id: string;
  position: Vector3;
  roster: PlayerSnapshot[];
}

export interface JoinMessage {
  type: "join";
  id: string;
  position: Vector3;
  yaw: number;
  pitch: number;
  alive: boolean;
}

export interface LeaveMessage {
  type: "leave";
  id: string;
}

export interface PosMessage {
  type: "pos";
  id: string;
  position: Vector3;
  yaw: number;
  pitch: number;
}

export type ServerMessage = WelcomeMessage | JoinMessage | LeaveMessage | PosMessage;
export type ClientMessage = PosMessage;

export function decodeServerMessage(raw: string): ServerMessage | undefined {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) return undefined;
  return parsed as ServerMessage;
}
