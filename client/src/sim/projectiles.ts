import { bus } from "../bus.ts";
import { getCurrentCharacter } from "../config/characters.ts";
import { getCurrentWeapon } from "../config/weapons.ts";
import { localPlayer, projectiles, remotePlayers } from "../state/world.ts";

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
  const { eyeHeight } = getCurrentCharacter();
  spawnProjectile(
    { x: remote.position.x, y: remote.position.y + eyeHeight, z: remote.position.z },
    remote.gunYaw,
    remote.gunPitch,
  );
});

export function tickProjectiles(dt: number): void {
  const weapon = getCurrentWeapon();
  const fireInterval = 1 / weapon.fireRate;

  cooldown = Math.max(0, cooldown - dt);

  if (fireHeld && controlEngaged && cooldown <= 0) {
    const { eyeHeight } = getCurrentCharacter();
    spawnProjectile(
      {
        x: localPlayer.position.x,
        y: localPlayer.position.y + eyeHeight,
        z: localPlayer.position.z,
      },
      localPlayer.gunYaw,
      localPlayer.gunPitch,
    );
    cooldown += fireInterval;
    bus.emit("fired", undefined);
  }

  advanceProjectiles(dt, weapon);
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

function advanceProjectiles(dt: number, weapon: ReturnType<typeof getCurrentWeapon>): void {
  const step = weapon.projectileSpeed * dt;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.position.x += projectile.direction.x * step;
    projectile.position.y += projectile.direction.y * step;
    projectile.position.z += projectile.direction.z * step;
    projectile.distanceTraveled += step;

    if (projectile.distanceTraveled >= weapon.projectileMaxRange) {
      projectiles.splice(i, 1);
    }
  }
}