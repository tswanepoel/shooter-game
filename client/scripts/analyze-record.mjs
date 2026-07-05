import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = path.join(root, "debug/record.jsonl");
const lines = fs.readFileSync(file, "utf8").trim().split("\n");
const frames = lines.map((l) => JSON.parse(l)).filter((f) => f.session?.phase === "stream");

const yaw = frames.map((f) => ({
  seq: f.session.seq,
  target: f.aim.mouseTarget.yawRad,
  head: f.aim.head.yawRad,
  torso: f.aim.torso.yawRad,
  offset: f.aim.crosshairOffset.yawRad,
  offsetDeg: f.aim.crosshairOffset.yawDeg,
  yawSpeed: f.aim.yawSpeedRadPerSec,
  inputSpeed: f.aim.inputSpeedRadPerSec,
}));

let minTarget = Infinity;
let maxTarget = -Infinity;
for (const f of yaw) {
  minTarget = Math.min(minTarget, f.target);
  maxTarget = Math.max(maxTarget, f.target);
}

const dOffset = [];
for (let i = 1; i < yaw.length; i++) dOffset.push(yaw[i].offset - yaw[i - 1].offset);

let signReversals = 0;
for (let i = 1; i < dOffset.length; i++) {
  if (dOffset[i] * dOffset[i - 1] < 0 && Math.abs(dOffset[i]) > 1e-4 && Math.abs(dOffset[i - 1]) > 1e-4) {
    signReversals++;
  }
}

let mismatches = 0;
for (let i = 1; i < yaw.length; i++) {
  const dT = yaw[i].target - yaw[i - 1].target;
  const dO = yaw[i].offset - yaw[i - 1].offset;
  if (Math.abs(dT) > 0.001 && dT * dO < -1e-5) mismatches++;
}

const peak = yaw.toSorted((a, b) => Math.abs(b.offset) - Math.abs(a.offset)).slice(0, 8);
const start = yaw.findIndex((f) => Math.abs(f.target - yaw[0].target) > 0.01);

console.log(JSON.stringify({
  streamFrames: yaw.length,
  targetYawDeg: { min: (minTarget * 180) / Math.PI, max: (maxTarget * 180) / Math.PI },
  offsetSignReversals: signReversals,
  targetOffsetOppositeSteps: mismatches,
  peakFrames: peak.map((p) => ({
    seq: p.seq,
    targetDeg: (p.target * 180) / Math.PI,
    offsetDeg: p.offsetDeg,
    headDeg: (p.head * 180) / Math.PI,
    torsoDeg: (p.torso * 180) / Math.PI,
    yawSpeed: p.yawSpeed,
  })),
  turnWindow: start >= 0
    ? yaw.slice(start, start + 20).map((f, i, arr) => ({
        seq: f.seq,
        targetDeg: Number(((f.target * 180) / Math.PI).toFixed(1)),
        offsetDeg: Number(f.offsetDeg.toFixed(2)),
        dOffsetDeg: i > 0 ? Number((((f.offset - arr[i - 1].offset) * 180) / Math.PI).toFixed(3)) : 0,
        torsoDeg: Number(((f.torso * 180) / Math.PI).toFixed(1)),
        yawSpeed: Number(f.yawSpeed.toFixed(0)),
      }))
    : null,
}, null, 2));

const slice = yaw.filter((f) => f.seq >= 150 && f.seq <= 210);
let badWhileTargetMoves = 0;
let largeSteps = [];
for (let i = 1; i < slice.length; i++) {
  const dT = slice[i].target - slice[i - 1].target;
  const dO = slice[i].offset - slice[i - 1].offset;
  if (Math.abs(dT) > 1e-4) {
    if (dT < 0 && dO < -0.002) badWhileTargetMoves++;
    if (dT > 0 && dO > 0.002) badWhileTargetMoves++;
  }
  const dODeg = (dO * 180) / Math.PI;
  if (Math.abs(dODeg) > 1.5) {
    largeSteps.push({
      seq: slice[i].seq,
      dOffsetDeg: Number(dODeg.toFixed(2)),
      dTargetDeg: Number(((dT * 180) / Math.PI).toFixed(2)),
    });
  }
}

let zeroSpeedTargetChange = 0;
for (let i = 1; i < yaw.length; i++) {
  if (yaw[i].yawSpeed < 0.5 && Math.abs(yaw[i].target - yaw[i - 1].target) > 1e-4) {
    zeroSpeedTargetChange++;
  }
}

console.error("extra:", JSON.stringify({
  fastTurnBadSteps: badWhileTargetMoves,
  largeOffsetSteps: largeSteps.slice(0, 12),
  targetChangedYawSpeedZero: zeroSpeedTargetChange,
}, null, 2));