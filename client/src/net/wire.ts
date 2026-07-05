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
  characterId: string;
  weaponId: string;
}

export interface WelcomeMessage {
  type: "welcome";
  id: string;
  position: Vector3;
  characterId: string;
  weaponId: string;
  roster: PlayerSnapshot[];
}

export interface JoinMessage {
  type: "join";
  id: string;
  position: Vector3;
  yaw: number;
  pitch: number;
  alive: boolean;
  characterId: string;
  weaponId: string;
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

export interface JumpMessage {
  type: "jump";
  id: string;
}

export interface FireMessage {
  type: "fire";
  id: string;
}

export interface WeaponMessage {
  type: "weapon";
  id: string;
  weaponId: string;
}

export interface HitMessage {
  type: "hit";
  id: string;
  targetId: string;
}

export interface RespawnRequestMessage {
  type: "respawn";
  id: string;
}

export interface HealthMessage {
  type: "health";
  id: string;
  health: number;
  attackerId?: string;
}

export interface DeathMessage {
  type: "death";
  victimId: string;
  killerId: string;
}

export interface RespawnMessage {
  type: "respawn";
  id: string;
  position: Vector3;
}

export interface SelectMessage {
  type: "select";
  characterId: string;
}

export type ServerMessage =
  | WelcomeMessage
  | JoinMessage
  | LeaveMessage
  | PosMessage
  | JumpMessage
  | FireMessage
  | WeaponMessage
  | HealthMessage
  | DeathMessage
  | RespawnMessage;

export type ClientMessage =
  | SelectMessage
  | PosMessage
  | JumpMessage
  | FireMessage
  | WeaponMessage
  | HitMessage
  | RespawnRequestMessage;

export function decodeServerMessage(raw: string): ServerMessage | undefined {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) return undefined;
  return parsed as ServerMessage;
}