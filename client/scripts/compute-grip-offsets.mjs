import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(root, "../public/models");

const WEAPON_IDS = [
  "blaster-a", "blaster-b", "blaster-c", "blaster-d", "blaster-e", "blaster-f", "blaster-g", "blaster-h",
  "blaster-i", "blaster-j", "blaster-k", "blaster-l", "blaster-m", "blaster-n", "blaster-o", "blaster-p",
  "blaster-q", "blaster-r",
];

const REFERENCE_GRIP = { x: 0, y: -1.2, z: 0.2 };

function readGlb(filePath) {
  const buffer = fs.readFileSync(filePath);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  const binOffset = 20 + jsonLength + 8;
  return { buffer, json, binOffset };
}

function readAccessor(json, buffer, binOffset, accessor) {
  const view = json.bufferViews[accessor.bufferView];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const data = buffer.subarray(binOffset + start);
  const count = accessor.count;
  const comps = { SCALAR: 1, VEC3: 3, VEC4: 4 }[accessor.type];
  const out = [];
  for (let i = 0; i < count * comps; i++) out.push(data.readFloatLE(i * 4));
  return out;
}

function collectNodeVertices(json, buffer, binOffset, nodeIndex, parentMatrix = identity()) {
  const node = json.nodes[nodeIndex];
  const local = nodeMatrix(node);
  const world = multiply(parentMatrix, local);
  const verts = [];
  if (node.mesh !== undefined) {
    const mesh = json.meshes[node.mesh];
    for (const primitive of mesh.primitives) {
      const values = readAccessor(json, buffer, binOffset, json.accessors[primitive.attributes.POSITION]);
      for (let i = 0; i < values.length; i += 3) {
        verts.push(transformPoint(world, [values[i], values[i + 1], values[i + 2]]));
      }
    }
  }
  return verts;
}

function collectSceneVertices(json, buffer, binOffset, nodeIndex, parentMatrix = identity()) {
  const node = json.nodes[nodeIndex];
  const local = nodeMatrix(node);
  const world = multiply(parentMatrix, local);
  const verts = [...collectNodeVertices(json, buffer, binOffset, nodeIndex, parentMatrix)];
  for (const child of node.children ?? []) {
    verts.push(...collectSceneVertices(json, buffer, binOffset, child, world));
  }
  return verts;
}

function findNodeIndex(json, name, nodeIndex = 0) {
  const node = json.nodes[nodeIndex];
  if (node.name === name) return nodeIndex;
  for (const child of node.children ?? []) {
    const found = findNodeIndex(json, name, child);
    if (found !== -1) return found;
  }
  return -1;
}

function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function nodeMatrix(node) {
  const m = identity();
  if (node.translation) {
    m[12] = node.translation[0];
    m[13] = node.translation[1];
    m[14] = node.translation[2];
  }
  if (node.rotation) {
    return multiply(identity(), fromQuat(node.rotation));
  }
  return m;
}

function fromQuat([x, y, z, w]) {
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;
  return [
    1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy), 0,
    2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 0,
    2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy), 0,
    0, 0, 0, 1,
  ];
}

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let k = 0; k < 4; k++) out[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
    }
  }
  return out;
}

function transformPoint(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function quatFromUnitVectors(from, to) {
  const f = normalize(from);
  const t = normalize(to);
  const c = dot(f, t);
  if (c >= 1 - 1e-8) return [0, 0, 0, 1];
  if (c <= -1 + 1e-8) {
    const axis = Math.abs(f[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const orth = normalize(cross(f, axis));
    return [orth[0], orth[1], orth[2], 0];
  }
  const axis = normalize(cross(f, t));
  const s = Math.sqrt((1 + c) * 2);
  return [axis[0] * s * 0.5, axis[1] * s * 0.5, axis[2] * s * 0.5, 0.5 / (1 / s)];
}

function quatFromAxisAngle(axis, angle) {
  const half = angle * 0.5;
  const s = Math.sin(half);
  const n = normalize(axis);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(half)];
}

function quatMultiply(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

function quatRotate(q, v) {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
}

function heldOrientationQuat() {
  const authored = [0, 0, 1];
  const align = quatFromUnitVectors(authored, [0, 1, 0]);
  const roll = quatFromAxisAngle(authored, Math.PI);
  return quatMultiply(align, roll);
}

/** Handle cluster in authored space (+Z forward). Short guns: rear grip. Long guns: lower mid-body. */
function gripFromAuthoredVerts(verts) {
  const zs = verts.map((v) => v[2]);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const depth = maxZ - minZ;
  const rear = depth > 0.75
    ? verts.filter((v) => v[2] <= minZ + depth * 0.32)
    : verts.filter((v) => v[2] <= minZ + depth * 0.38);
  const pool = rear.length > 8 ? rear : verts;
  const minY = Math.min(...pool.map((v) => v[1]));
  const band = pool.filter((v) => v[1] <= minY + (depth > 0.75 ? 0.08 : 0.04));
  const gripVerts = band.length > 0 ? band : pool;
  const xs = gripVerts.map((v) => v[0]);
  const zs2 = gripVerts.map((v) => v[2]);
  return [
    (Math.min(...xs) + Math.max(...xs)) * 0.5,
    Math.min(...gripVerts.map((v) => v[1])),
    (Math.min(...zs2) + Math.max(...zs2)) * 0.5,
  ];
}

const holdQuat = heldOrientationQuat();
const computed = {};

for (const id of WEAPON_IDS) {
  const { buffer, json, binOffset } = readGlb(path.join(modelsDir, `${id}.glb`));
  const raw = collectNodeVertices(json, buffer, binOffset, 0);

  const authoredGrip = gripFromAuthoredVerts(raw);
  const orientedGrip = quatRotate(holdQuat, authoredGrip);
  computed[id] = { authoredGrip, orientedGrip, offset: orientedGrip.map((v) => -v) };
}

const refComputed = computed["blaster-g"].orientedGrip;
const tuned = {};

for (const id of WEAPON_IDS) {
  const oriented = computed[id].orientedGrip;
  tuned[id] = {
    x: REFERENCE_GRIP.x + (refComputed[0] - oriented[0]),
    y: REFERENCE_GRIP.y + (refComputed[1] - oriented[1]),
    z: REFERENCE_GRIP.z + (refComputed[2] - oriented[2]),
  };
}

console.log("reference blaster-g oriented grip", refComputed.map((v) => v.toFixed(3)).join(", "));
console.log("");
for (const id of WEAPON_IDS) {
  const c = computed[id];
  const t = tuned[id];
  console.log(
    `${id}: grip=${c.orientedGrip.map((v) => v.toFixed(3)).join(",")} -> { x: ${t.x.toFixed(3)}, y: ${t.y.toFixed(3)}, z: ${t.z.toFixed(3)} }`,
  );
}