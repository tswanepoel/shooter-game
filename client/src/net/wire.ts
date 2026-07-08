import type { ActiveSlot } from "../state/loadout.ts";
import type { Vec3 } from "../types/vec3.ts";

export type Vector3 = Vec3;

export interface PlayerSnapshot {
  id: string;
  displayName: string;
  position: Vector3;
  yaw: number;
  pitch: number;
  alive: boolean;
  characterId: string;
  weaponId: string;
}

export interface RoomJoinedMessage {
  type: "roomJoined";
  sessionId: string;
  roomCode: string;
  displayName: string;
  takenCharacterIds: string[];
  players: PlayerSnapshot[];
}

export interface RoomJoinRejectedMessage {
  type: "roomJoinRejected";
  reason: "nameTaken" | "invalid";
}

export interface TakenMessage {
  type: "taken";
  characterIds: string[];
}

export interface ClaimRejectedMessage {
  type: "claimRejected";
  reason: "characterTaken" | "invalidCharacter";
}

export interface WelcomeMessage {
  type: "welcome";
  id: string;
  displayName: string;
  position: Vector3;
  characterId: string;
  roster: PlayerSnapshot[];
}

export interface JoinMessage {
  type: "join";
  id: string;
  displayName: string;
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
  weaponId?: string;
  activeSlot?: ActiveSlot;
}

export interface HitMessage {
  type: "hit";
  id: string;
  targetId: string;
  bodyPart: string;
  speedAtImpact: number;
}

export interface RespawnRequestMessage {
  type: "respawn";
  id: string;
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  activeSlot: ActiveSlot;
}

export interface SuicideRequestMessage {
  type: "suicide";
  id: string;
}

export interface LoadoutRequestMessage {
  type: "loadout";
  id: string;
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  activeSlot: ActiveSlot;
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

export interface ClaimMessage {
  type: "claim";
  characterId: string;
}

export type ServerMessage =
  | RoomJoinedMessage
  | RoomJoinRejectedMessage
  | TakenMessage
  | ClaimRejectedMessage
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

export interface JoinRoomMessage {
  type: "joinRoom";
  code: string;
  displayName: string;
}

export type ClientMessage =
  | JoinRoomMessage
  | ClaimMessage
  | PosMessage
  | JumpMessage
  | FireMessage
  | WeaponMessage
  | HitMessage
  | RespawnRequestMessage
  | SuicideRequestMessage
  | LoadoutRequestMessage;

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
  const displayName = readString(record, "displayName", "DisplayName") ?? id ?? "Player";
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
  if (!characterId || weaponId === undefined) return undefined;

  return { id, displayName, position: { x, y, z }, yaw, pitch, alive, characterId, weaponId };
}

export function decodeServerMessage(raw: string): ServerMessage | undefined {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) return undefined;

  const record = parsed as Record<string, unknown>;
  const type = record.type;

  if (type === "taken" || type === "roomJoined") {
    const takenRaw = record.takenCharacterIds ?? record.TakenCharacterIds ?? record.characterIds ?? record.CharacterIds;
    if (Array.isArray(takenRaw)) {
      record.takenCharacterIds = takenRaw.filter((id): id is string => typeof id === "string");
      record.characterIds = record.takenCharacterIds;
    }
  }

  if (type === "roomJoined") {
    const playersRaw = record.players ?? record.Players;
    if (Array.isArray(playersRaw)) {
      record.players = playersRaw
        .map((entry) => normalizeSnapshot(entry))
        .filter((entry): entry is PlayerSnapshot => entry !== undefined);
    } else {
      record.players = [];
    }
  }

  if (type === "welcome" || type === "join") {
    const id = readString(record, "id", "Id");
    const displayName = readString(record, "displayName", "DisplayName") ?? id ?? "Player";
    record.displayName = displayName;
    const characterId = readString(record, "characterId", "CharacterId");
    if (characterId) record.characterId = characterId;
    const weaponId = readString(record, "weaponId", "WeaponId");
    if (weaponId !== undefined) record.weaponId = weaponId;
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