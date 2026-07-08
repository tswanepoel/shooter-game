import type {
  ClaimRejectedMessage,
  DeathMessage,
  FireMessage,
  HealthMessage,
  JoinMessage,
  JumpMessage,
  LeaveMessage,
  PosMessage,
  RespawnMessage,
  RoomJoinedMessage,
  TakenMessage,
  WeaponMessage,
  WelcomeMessage,
} from "./net/wire.ts";

type Listener<T> = (payload: T) => void;

export class EventBus<Events extends object> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = this.listeners[event] ?? new Set();
    set.add(listener);
    this.listeners[event] = set;
    return () => set.delete(listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const listener of this.listeners[event] ?? []) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`bus listener failed for "${String(event)}"`, error);
      }
    }
  }
}

export interface BusEvents {
  moveForwardStarted: undefined;
  moveForwardStopped: undefined;
  moveBackwardStarted: undefined;
  moveBackwardStopped: undefined;
  moveLeftStarted: undefined;
  moveLeftStopped: undefined;
  moveRightStarted: undefined;
  moveRightStopped: undefined;
  sprintStarted: undefined;
  sprintStopped: undefined;
  jumped: undefined;
  respawnRequested: undefined;
  jumpLaunched: undefined;
  fireStarted: undefined;
  fireStopped: undefined;
  fired: undefined;
  weaponSlotToggled: undefined;
  weaponSwitched: { activeSlot: "primary" | "secondary" };
  forfeitRequested: undefined;
  loadoutPendingChanged: undefined;
  joinSpawnClicked: undefined;
  loadoutCommitted: { primary: string | null; secondary: string | null };
  controlEngaged: undefined;
  controlReleased: undefined;
  roomJoined: RoomJoinedMessage;
  takenUpdated: TakenMessage;
  claimRejected: ClaimRejectedMessage;
  welcomed: WelcomeMessage;
  playerJoined: JoinMessage;
  playerLeft: LeaveMessage;
  positionReceived: PosMessage;
  jumpReceived: JumpMessage;
  fireReceived: FireMessage;
  weaponReceived: WeaponMessage;
  healthReceived: HealthMessage;
  deathReceived: DeathMessage;
  respawnReceived: RespawnMessage;
  hitConfirmed: undefined;
  damageTaken: { attackerId: string };
  feedbackReset: undefined;
}

export const bus = new EventBus<BusEvents>();