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
  deathAt?: number;
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

function readString(record: Record<string, unknown>, camel: string, pascal: string): string | undefined {
  const camelValue = record[camel];
  if (typeof camelValue === "string") return camelValue;
  const pascalValue = record[pascal];
  if (typeof pascalValue === "string") return pascalValue;
  return undefined;
}

function normalizeSnapshot(raw: unknown): PlayerSnapshot | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  const id = readString(record, "id", "Id");
  const position = record.position ?? record.Position;
  if (!id || typeof position !== "object" || position === null) return undefined;

  const pos = position as Record<string, unknown>;
  const x = pos.x ?? pos.X;
  const y = pos.y ?? pos.Y;
  const z = pos.z ?? pos.Z;
  if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") return undefined;

  const yaw = record.yaw ?? record.Yaw;
  const pitch = record.pitch ?? record.Pitch;
  const alive = record.alive ?? record.Alive;
  const characterId = readString(record, "characterId", "CharacterId");
  const weaponId = readString(record, "weaponId", "WeaponId");
  if (typeof yaw !== "number" || typeof pitch !== "number" || typeof alive !== "boolean") {
    return undefined;
  }
  if (!characterId || !weaponId) return undefined;

  return { id, position: { x, y, z }, yaw, pitch, alive, characterId, weaponId };
}

export function decodeServerMessage(raw: string): ServerMessage | undefined {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) return undefined;

  const record = parsed as Record<string, unknown>;
  const type = record.type;

  if (type === "welcome" || type === "join") {
    const characterId = readString(record, "characterId", "CharacterId");
    if (characterId) record.characterId = characterId;
    const weaponId = readString(record, "weaponId", "WeaponId");
    if (weaponId) record.weaponId = weaponId;
  }

  if (type === "welcome") {
    const rosterRaw = record.roster ?? record.Roster;
    if (Array.isArray(rosterRaw)) {
      record.roster = rosterRaw
        .map((entry) => normalizeSnapshot(entry))
        .filter((entry): entry is PlayerSnapshot => entry !== undefined);
    }
  }

  return parsed as ServerMessage;
}