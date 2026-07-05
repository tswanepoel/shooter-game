import type { JoinMessage, LeaveMessage, PosMessage, WelcomeMessage } from "./net/wire.ts";

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
    this.listeners[event]?.forEach((listener) => listener(payload));
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
  fireStarted: undefined;
  fireStopped: undefined;
  fired: undefined;
  turned: { dx: number; dy: number };
  controlEngaged: undefined;
  controlReleased: undefined;
  welcomed: WelcomeMessage;
  playerJoined: JoinMessage;
  playerLeft: LeaveMessage;
  positionReceived: PosMessage;
}

export const bus = new EventBus<BusEvents>();
