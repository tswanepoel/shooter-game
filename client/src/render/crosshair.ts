import * as THREE from "three";
import { CROSSHAIR_DISTANCE } from "../config/physics.ts";
import { localPlayer } from "../state/world.ts";

export interface Crosshair {
  update(camera: THREE.Camera): void;
}

export function createCrosshair(): Crosshair {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.left = "0";
  element.style.top = "0";
  element.style.width = "6px";
  element.style.height = "6px";
  element.style.marginLeft = "-3px";
  element.style.marginTop = "-3px";
  element.style.borderRadius = "50%";
  element.style.background = "white";
  element.style.mixBlendMode = "difference";
  element.style.pointerEvents = "none";
  document.body.appendChild(element);

  const direction = new THREE.Vector3();
  const point = new THREE.Vector3();

  function update(camera: THREE.Camera): void {
    const yaw = localPlayer.gunYaw;
    const pitch = localPlayer.gunPitch;

    direction.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    point.copy(camera.position).addScaledVector(direction, CROSSHAIR_DISTANCE);
    point.project(camera);

    element.style.left = `${(point.x * 0.5 + 0.5) * window.innerWidth}px`;
    element.style.top = `${(-point.y * 0.5 + 0.5) * window.innerHeight}px`;
    element.style.display = point.z < 1 ? "block" : "none";
  }

  return { update };
}
