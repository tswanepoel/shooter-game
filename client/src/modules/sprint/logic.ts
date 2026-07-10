import { type SprintState, config } from "./state.ts";

export function tick(state: SprintState, forwardAxis: number, sprintRequested: boolean, dt: number): void {
  if (!state.sprinting && sprintRequested && forwardAxis > 0 && state.stamina > config.enterFloor) {
    state.sprinting = true;
  }
  if (state.sprinting && (forwardAxis <= 0 || state.stamina <= 0)) {
    state.sprinting = false;
  }

  state.stamina = state.sprinting
    ? Math.max(0, state.stamina - config.drainPerSecond * dt)
    : Math.min(config.max, state.stamina + config.recoverPerSecond * dt);
}

export function projectRespawn(state: SprintState): void {
  state.stamina = config.max;
  state.sprinting = false;
}
