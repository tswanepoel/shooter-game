import type {
  FireMessage,
  JoinMessage,
  JumpMessage,
  LeaveMessage,
  PosMessage,
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

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners[event]?.delete(listener);
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
  jumpLaunched: undefined;
  fireStarted: undefined;
  fireStopped: undefined;
  fired: undefined;
  weaponCycleRequested: undefined;
  weaponSwitched: { weaponId: string };
  turned: { dx: number; dy: number };
  controlEngaged: undefined;
  controlReleased: undefined;
  welcomed: WelcomeMessage;
  playerJoined: JoinMessage;
  playerLeft: LeaveMessage;
  positionReceived: PosMessage;
  jumpReceived: JumpMessage;
  fireReceived: FireMessage;
  weaponReceived: WeaponMessage;
}

export const bus = new EventBus<BusEvents>();