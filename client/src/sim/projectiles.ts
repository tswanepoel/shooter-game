import { bus } from "../bus.ts";
import { EYE_HEIGHT } from "../config/characters.ts";
import { FIRE_RATE, PROJECTILE_MAX_RANGE, PROJECTILE_SPEED } from "../config/weapons.ts";
import { localPlayer, projectiles, remotePlayers } from "../state/world.ts";

const FIRE_INTERVAL = 1 / FIRE_RATE;

let fireHeld = false;
let controlEngaged = false;
let cooldown = 0;
let nextId = 1;

bus.on("fireStarted", () => {
  fireHeld = true;
});
bus.on("fireStopped", () => {
  fireHeld = false;
});
bus.on("controlEngaged", () => {
  controlEngaged = true;
});
bus.on("controlReleased", () => {
  controlEngaged = false;
  fireHeld = false;
});

bus.on("fireReceived", ({ id }) => {
  // Cosmetic only: the remote's own client owns hit authority for its shots.
  const remote = remotePlayers.get(id);
  if (!remote) return;
  spawnProjectile(
    { x: remote.position.x, y: remote.position.y + EYE_HEIGHT, z: remote.position.z },
    remote.gunYaw,
    remote.gunPitch,
  );
});

export function tickProjectiles(dt: number): void {
  cooldown = Math.max(0, cooldown - dt);

  if (fireHeld && controlEngaged && cooldown <= 0) {
    spawnProjectile(
      {
        x: localPlayer.position.x,
        y: localPlayer.position.y + EYE_HEIGHT,
        z: localPlayer.position.z,
      },
      localPlayer.gunYaw,
      localPlayer.gunPitch,
    );
    cooldown += FIRE_INTERVAL;
    bus.emit("fired", undefined);
  }

  advanceProjectiles(dt);
}

function spawnProjectile(origin: { x: number; y: number; z: number }, yaw: number, pitch: number): void {
  projectiles.push({
    id: nextId++,
    position: { ...origin },
    direction: {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    },
    distanceTraveled: 0,
  });
}

function advanceProjectiles(dt: number): void {
  const step = PROJECTILE_SPEED * dt;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.position.x += projectile.direction.x * step;
    projectile.position.y += projectile.direction.y * step;
    projectile.position.z += projectile.direction.z * step;
    projectile.distanceTraveled += step;

    if (projectile.distanceTraveled >= PROJECTILE_MAX_RANGE) {
      projectiles.splice(i, 1);
    }
  }
}
