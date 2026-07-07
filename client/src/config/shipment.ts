/** Shipment-style yard with open lanes and mid-height decks. */
export const YARD_HALF_X = 22;
export const YARD_HALF_Z = 16;
export const WALL_HEIGHT = 4;
export const WALL_THICKNESS = 0.4;

/** Feet-level collision radius for the blocky character. */
export const PLAYER_RADIUS = 0.4;

// Must match server/GameConfig.cs world/spawn bounds exactly.
export const WORLD_BOUNDARY_X = YARD_HALF_X - WALL_THICKNESS - PLAYER_RADIUS;
export const WORLD_BOUNDARY_Z = YARD_HALF_Z - WALL_THICKNESS - PLAYER_RADIUS;
export const SPAWN_HALF_X = 16;
export const SPAWN_HALF_Z = 12;

export type BoxSurface = "wall" | "container" | "crate" | "platform";

export interface BoxSpec {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: number;
  surface: BoxSurface;
  walkable?: boolean;
  /** Quarter-turns clockwise from above. */
  yaw?: 0 | 1 | 2 | 3;
}

const CONTAINER = 0x748898;
const CONTAINER_RUST = 0x967055;
const CRATE = 0x857660;
const PLATFORM = 0x626a74;
const PLATFORM_LIGHT = 0x727a86;
const WALL = 0x525860;

function elevated(
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  baseY: number,
  color: number,
  surface: BoxSurface,
  yaw?: 0 | 1 | 2 | 3,
): BoxSpec {
  return {
    x,
    y: baseY + height / 2,
    z,
    width,
    height,
    depth,
    color,
    surface,
    walkable: surface !== "wall",
    yaw,
  };
}

function groundBox(
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: number,
  surface: BoxSurface,
  yaw?: 0 | 1 | 2 | 3,
): BoxSpec {
  return elevated(x, z, width, height, depth, 0, color, surface, yaw);
}

function platform(
  x: number,
  z: number,
  width: number,
  depth: number,
  elevation: number,
  color = PLATFORM,
): BoxSpec {
  return elevated(x, z, width, 0.34, depth, elevation, color, "platform");
}

type StairDirection = "north" | "south" | "east" | "west";

function stairs(
  anchorX: number,
  anchorZ: number,
  width: number,
  count: number,
  rise: number,
  depth: number,
  direction: StairDirection,
): BoxSpec[] {
  const steps: BoxSpec[] = [];
  for (let i = 0; i < count; i++) {
    const elevation = (i + 1) * rise;
    let x = anchorX;
    let z = anchorZ;
    let stepWidth = width;
    let stepDepth = depth;
    switch (direction) {
      case "north":
        z = anchorZ - i * depth;
        break;
      case "south":
        z = anchorZ + i * depth;
        break;
      case "east":
        x = anchorX + i * depth;
        stepWidth = depth;
        stepDepth = width;
        break;
      case "west":
        x = anchorX - i * depth;
        stepWidth = depth;
        stepDepth = width;
        break;
    }
    steps.push(elevated(x, z, stepWidth, rise, stepDepth, elevation - rise, PLATFORM_LIGHT, "platform"));
  }
  return steps;
}

export function buildShipmentBoxes(): BoxSpec[] {
  const hx = YARD_HALF_X;
  const hz = YARD_HALF_Z;
  const t = WALL_THICKNESS;
  const h = WALL_HEIGHT;

  const walls: BoxSpec[] = [
    { x: 0, y: h / 2, z: -hz, width: hx * 2 + t * 2, height: h, depth: t, color: WALL, surface: "wall", walkable: false },
    { x: 0, y: h / 2, z: hz, width: hx * 2 + t * 2, height: h, depth: t, color: WALL, surface: "wall", walkable: false },
    { x: -hx, y: h / 2, z: 0, width: t, height: h, depth: hz * 2, color: WALL, surface: "wall", walkable: false },
    { x: hx, y: h / 2, z: 0, width: t, height: h, depth: hz * 2, color: WALL, surface: "wall", walkable: false },
  ];

  const northDeckElev = 1.2;
  const eastWalkElev = 1.55;
  const westPadElev = 0.85;

  const verticals: BoxSpec[] = [
    platform(0, -11, 12, 5, northDeckElev),
    ...stairs(0, -8.2, 3.2, 4, 0.3, 0.75, "south"),

    platform(17.2, -1, 2.4, 13, eastWalkElev),
    ...stairs(13.8, -7.5, 2.4, 5, 0.31, 0.7, "east"),

    platform(-15, 5.5, 5.5, 4, westPadElev),
    ...stairs(-15, 2.8, 3, 3, 0.28, 0.7, "south"),

    platform(8, 9, 6, 3.5, 1.0),
    ...stairs(5.2, 6.8, 2.5, 4, 0.25, 0.65, "west"),
  ];

  const cover: BoxSpec[] = [
    groundBox(-17, -12, 2.2, 2.4, 5, CONTAINER_RUST, "container", 1),
    groundBox(17, -12, 2.2, 2.4, 5, CONTAINER, "container", 1),
    groundBox(-17, 12, 2.2, 2.4, 4.5, CONTAINER, "container", 1),
    groundBox(17, 12, 6, 2.4, 2.2, CONTAINER_RUST, "container"),

    groundBox(-10, -5, 6, 2.4, 2.2, CONTAINER, "container"),
    groundBox(11, 4, 2.2, 2.4, 6, CONTAINER_RUST, "container", 1),

    groundBox(-7, 8, 2, 1.6, 2, CRATE, "crate"),
    groundBox(4, -6, 2, 1.6, 2, CRATE, "crate"),
    groundBox(-3, -10, 2, 1.6, 1.6, CRATE, "crate"),
    groundBox(10, -3, 2, 1.6, 2, CRATE, "crate"),

    elevated(-12, 0, 2.2, 2.4, 4, 1.6, CONTAINER, "container", 1),
    elevated(12, -1, 2.2, 2.4, 4, 1.6, CONTAINER_RUST, "container", 1),
    elevated(-5, -2, 2, 1.6, 2, 1.6, CRATE, "crate"),
    elevated(6, 2, 2, 1.6, 2, 1.6, CRATE, "crate"),

    groundBox(0, 13, 8, 2.4, 2.2, CONTAINER, "container"),
    groundBox(-14, -3, 4, 2.4, 2.2, CONTAINER_RUST, "container"),
  ];

  return [...walls, ...verticals, ...cover];
}