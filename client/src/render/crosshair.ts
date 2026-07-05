import * as THREE from "three";
import { CROSSHAIR_DISTANCE } from "../config/physics.ts";
import { gunAimDelta } from "../sim/aimCascade.ts";
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
  const aimQuat = new THREE.Quaternion();
  const deltaEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const deltaQuat = new THREE.Quaternion();

  function update(camera: THREE.Camera): void {
    const { pitch, yaw } = gunAimDelta(localPlayer);

    deltaEuler.set(pitch, yaw, 0);
    deltaQuat.setFromEuler(deltaEuler);
    // Gun offset is in camera-local space (same as the view-model child transform).
    aimQuat.copy(camera.quaternion).multiply(deltaQuat);
    direction.set(0, 0, -1).applyQuaternion(aimQuat);

    point.copy(camera.position).addScaledVector(direction, CROSSHAIR_DISTANCE);
    point.project(camera);

    element.style.left = `${(point.x * 0.5 + 0.5) * window.innerWidth}px`;
    element.style.top = `${(-point.y * 0.5 + 0.5) * window.innerHeight}px`;
    element.style.display = point.z < 1 ? "block" : "none";
  }

  return { update };
}
