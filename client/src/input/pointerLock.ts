import { clearPointerDelta } from "./pointerInput.ts";

let gameCaptureTarget: HTMLElement | undefined;

/** Canvas (or other element) that should reclaim pointer lock after respawn. */
export function bindPointerLockTarget(target: HTMLElement): void {
  gameCaptureTarget = target;
}

/** True when the game canvas (or any element) owns pointer lock. */
export function isPointerLockActive(): boolean {
  return document.pointerLockElement !== null;
}

/**
 * Release pointer lock so overlays and other UI can receive mouse input.
 * Clears any queued look delta so the camera does not jump when lock returns.
 */
export function releasePointerLockForUi(): void {
  clearPointerDelta();
  if (document.pointerLockElement) {
    void document.exitPointerLock();
  }
}

/** Re-engage pointer lock on the game canvas when already playing. */
export function requestPointerLockForGame(): void {
  if (!gameCaptureTarget || document.pointerLockElement) return;
  void gameCaptureTarget.requestPointerLock();
}