import { type HealthState, maxHealth } from "./state.ts";

export function projectWelcome(state: HealthState): void {
  state.health = maxHealth;
  state.alive = true;
}

export function projectHealth(state: HealthState, health: number): void {
  state.health = health;
}

export function projectDeath(state: HealthState): void {
  state.alive = false;
}

export function projectRespawn(state: HealthState): void {
  state.health = maxHealth;
  state.alive = true;
}
