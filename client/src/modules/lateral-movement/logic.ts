import { type LateralMovementState, config } from "./state.ts";

export function tick(
  state: LateralMovementState,
  forwardAxis: number,
  strafeAxis: number,
  sprinting: boolean,
  yaw: number,
): void {
  if (forwardAxis === 0 && strafeAxis === 0) {
    state.velocityX = 0;
    state.velocityZ = 0;
    return;
  }

  const forwardCap = sprinting ? config.sprint : config.forward;
  const forwardSpeed = forwardAxis > 0 ? forwardCap : config.backward;
  let localForward = forwardAxis * forwardSpeed;
  let localRight = strafeAxis * config.lateral;

  const rawSpeed = Math.hypot(localForward, localRight);
  if (rawSpeed > forwardCap) {
    const scale = forwardCap / rawSpeed;
    localForward *= scale;
    localRight *= scale;
  }

  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  state.velocityX = forwardX * localForward + rightX * localRight;
  state.velocityZ = forwardZ * localForward + rightZ * localRight;
}
