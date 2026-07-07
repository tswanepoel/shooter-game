import {
  buildShipmentBoxes,
  PLAYER_RADIUS,
  WORLD_BOUNDARY_X,
  WORLD_BOUNDARY_Z,
  type BoxSpec,
} from "../config/shipment.ts";

const STEP_HEIGHT = 0.45;
const STAND_EPS = 0.08;
const LAND_EPS = 0.12;

interface VolumeCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  walkable: boolean;
}

const volumes = buildShipmentBoxes().map(specToVolume);

function specToVolume(spec: BoxSpec): VolumeCollider {
  const quarter = spec.yaw ?? 0;
  const halfX = (quarter % 2 === 0 ? spec.width : spec.depth) / 2;
  const halfZ = (quarter % 2 === 0 ? spec.depth : spec.width) / 2;
  const halfY = spec.height / 2;
  return {
    minX: spec.x - halfX,
    maxX: spec.x + halfX,
    minZ: spec.z - halfZ,
    maxZ: spec.z + halfZ,
    minY: spec.y - halfY,
    maxY: spec.y + halfY,
    walkable: spec.walkable ?? spec.surface !== "wall",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function circleIntersectsVolume(px: number, pz: number, radius: number, box: VolumeCollider): boolean {
  const closestX = clamp(px, box.minX, box.maxX);
  const closestZ = clamp(pz, box.minZ, box.maxZ);
  const dx = px - closestX;
  const dz = pz - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

function resolveCircleAgainstAabb(
  px: number,
  pz: number,
  radius: number,
  box: Pick<VolumeCollider, "minX" | "maxX" | "minZ" | "maxZ">,
): { x: number; z: number } {
  const closestX = clamp(px, box.minX, box.maxX);
  const closestZ = clamp(pz, box.minZ, box.maxZ);
  const dx = px - closestX;
  const dz = pz - closestZ;
  const distSq = dx * dx + dz * dz;
  const rSq = radius * radius;
  if (distSq >= rSq) return { x: px, z: pz };

  if (distSq === 0) {
    const penLeft = px - box.minX;
    const penRight = box.maxX - px;
    const penNear = pz - box.minZ;
    const penFar = box.maxZ - pz;
    const minPen = Math.min(penLeft, penRight, penNear, penFar);
    if (minPen === penLeft) return { x: box.minX - radius, z: pz };
    if (minPen === penRight) return { x: box.maxX + radius, z: pz };
    if (minPen === penNear) return { x: px, z: box.minZ - radius };
    return { x: px, z: box.maxZ + radius };
  }

  const dist = Math.sqrt(distSq);
  const overlap = radius - dist;
  return {
    x: px + (dx / dist) * overlap,
    z: pz + (dz / dist) * overlap,
  };
}

function shouldBlockHorizontal(px: number, pz: number, py: number, box: VolumeCollider): boolean {
  if (!circleIntersectsVolume(px, pz, PLAYER_RADIUS, box)) return false;
  if (py >= box.maxY - STAND_EPS) return false;
  if (py + STEP_HEIGHT >= box.maxY && py < box.maxY - STAND_EPS) return false;
  return true;
}

function tryStepUp(px: number, pz: number, py: number): number {
  let nextY = py;
  for (const box of volumes) {
    if (!box.walkable) continue;
    if (!circleIntersectsVolume(px, pz, PLAYER_RADIUS, box)) continue;
    const rise = box.maxY - py;
    if (rise > 0 && rise <= STEP_HEIGHT) {
      nextY = Math.max(nextY, box.maxY);
    }
  }
  return nextY;
}

export function getShipmentGroundHeight(x: number, z: number, probeY = Infinity): number {
  let height = 0;
  for (const box of volumes) {
    if (!box.walkable) continue;
    if (!circleIntersectsVolume(x, z, PLAYER_RADIUS, box)) continue;
    if (box.maxY > probeY + LAND_EPS) continue;
    height = Math.max(height, box.maxY);
  }
  return height;
}

export function resolveShipmentMovement(
  x: number,
  z: number,
  y: number,
): { x: number; z: number; y: number } {
  const r = PLAYER_RADIUS;
  let nextX = clamp(x, -WORLD_BOUNDARY_X + r, WORLD_BOUNDARY_X - r);
  let nextZ = clamp(z, -WORLD_BOUNDARY_Z + r, WORLD_BOUNDARY_Z - r);
  let nextY = y;

  for (let pass = 0; pass < 4; pass++) {
    for (const box of volumes) {
      if (!shouldBlockHorizontal(nextX, nextZ, nextY, box)) continue;
      const resolved = resolveCircleAgainstAabb(nextX, nextZ, r, box);
      nextX = resolved.x;
      nextZ = resolved.z;
    }
  }

  nextY = tryStepUp(nextX, nextZ, nextY);

  for (let pass = 0; pass < 2; pass++) {
    for (const box of volumes) {
      if (!shouldBlockHorizontal(nextX, nextZ, nextY, box)) continue;
      const resolved = resolveCircleAgainstAabb(nextX, nextZ, r, box);
      nextX = resolved.x;
      nextZ = resolved.z;
    }
  }

  nextX = clamp(nextX, -WORLD_BOUNDARY_X + r, WORLD_BOUNDARY_X - r);
  nextZ = clamp(nextZ, -WORLD_BOUNDARY_Z + r, WORLD_BOUNDARY_Z - r);
  return { x: nextX, z: nextZ, y: nextY };
}

/** @deprecated Use resolveShipmentMovement — kept for any external callers. */
export function resolveShipmentPosition(x: number, z: number): { x: number; z: number } {
  const resolved = resolveShipmentMovement(x, z, 0);
  return { x: resolved.x, z: resolved.z };
}