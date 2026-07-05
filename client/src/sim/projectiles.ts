import { bus } from "../bus.ts";
import { EYE_HEIGHT } from "../config/characters.ts";
import { FIRE_RATE, PROJECTILE_MAX_RANGE, PROJECTILE_SPEED } from "../config/weapons.ts";
import { localPlayer, projectiles } from "../state/world.ts";

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

export function tickProjectiles(dt: number): void {
  cooldown = Math.max(0, cooldown - dt);

  if (fireHeld && controlEngaged && cooldown <= 0) {
    spawnProjectile();
    cooldown += FIRE_INTERVAL;
  }

  advanceProjectiles(dt);
}

function spawnProjectile(): void {
  const yaw = localPlayer.gunYaw;
  const pitch = localPlayer.gunPitch;

  projectiles.push({
    id: nextId++,
    position: {
      x: localPlayer.position.x,
      y: localPlayer.position.y + EYE_HEIGHT,
      z: localPlayer.position.z,
    },
    direction: {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    },
    distanceTraveled: 0,
  });

  bus.emit("fired", undefined);
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
