import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), "debug/record.jsonl");
const frames = fs
  .readFileSync(file, "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l))
  .filter((f) => f.session?.phase === "stream");

const rows = frames.map((f, i) => {
  const t = new Date(f.capturedAt).getTime();
  const prev = i > 0 ? new Date(frames[i - 1].capturedAt).getTime() : t;
  return {
    seq: f.session.seq,
    dtMs: i > 0 ? t - prev : 0,
    target: f.aim.mouseTarget.yawRad,
    offset: f.aim.crosshairOffset.yawRad,
    yawSpeed: f.aim.yawSpeedRadPerSec,
    torso: f.aim.torso.yawRad,
    head: f.aim.head.yawRad,
  };
});

const dts = rows.slice(1).map((r) => r.dtMs);
const avgDt = dts.reduce((a, b) => a + b, 0) / dts.length;
const medianDt = dts.toSorted((a, b) => a - b)[Math.floor(dts.length / 2)];
const impliedFps = 1000 / avgDt;

let flatTarget = 0;
let flatTargetOffsetDrop = 0;
let flatTargetOffsetRise = 0;
let flatTargetTorsoMoved = 0;

let targetMoved = 0;
let targetMovedOffsetRose = 0;
let targetMovedOffsetFell = 0;

for (let i = 1; i < rows.length; i++) {
  const dT = rows[i].target - rows[i - 1].target;
  const dO = rows[i].offset - rows[i - 1].offset;
  const dTorso = rows[i].torso - rows[i - 1].torso;

  if (Math.abs(dT) < 1e-6) {
    flatTarget++;
    if (dO < -0.0001) flatTargetOffsetDrop++;
    if (dO > 0.0001) flatTargetOffsetRise++;
    if (Math.abs(dTorso) > 1e-6) flatTargetTorsoMoved++;
  } else {
    targetMoved++;
    if (dO > 0.0001) targetMovedOffsetRose++;
    if (dO < -0.0001) targetMovedOffsetFell++;
  }
}

// Active fast turn: high yawSpeed
const fast = rows.filter((r) => r.yawSpeed > 2);
let fastFlat = 0;
let fastFlatDrop = 0;
for (let i = 1; i < fast.length; i++) {
  const dT = fast[i].target - fast[i - 1].target;
  const dO = fast[i].offset - fast[i - 1].offset;
  if (Math.abs(dT) < 1e-6 && dO < -0.01) {
    fastFlat++;
    fastFlatDrop += Math.abs(dO);
  }
}

// Predict one-frame catch-up: if ALL offset drops on flat-target frames are torso catching up
const flatDropOnlyTorsoCatch =
  flatTargetOffsetDrop > 0 &&
  flatTargetOffsetRise === 0
    ? "all flat drops, zero unexplained rises"
    : `drops=${flatTargetOffsetDrop} rises=${flatTargetOffsetRise}`;

console.log(
  JSON.stringify(
    {
      streamFrames: rows.length,
      timing: {
        avgDtMs: Number(avgDt.toFixed(2)),
        medianDtMs: Number(medianDt.toFixed(2)),
        minDtMs: Math.min(...dts),
        maxDtMs: Math.max(...dts),
        impliedFps: Number(impliedFps.toFixed(1)),
      },
      perFrameInput: {
        framesTargetUnchanged: flatTarget,
        pctTargetUnchanged: Number(((flatTarget / (rows.length - 1)) * 100).toFixed(1)),
        unchangedTarget_offsetDropped: flatTargetOffsetDrop,
        unchangedTarget_offsetRose: flatTargetOffsetRise,
        unchangedTarget_torsoMoved: flatTargetTorsoMoved,
        pctFlatWithTorsoMotion: Number(
          ((flatTargetTorsoMoved / Math.max(1, flatTarget)) * 100).toFixed(1),
        ),
      },
      perFrameInputTargetMoved: {
        frames: targetMoved,
        offsetRose: targetMovedOffsetRose,
        offsetFell: targetMovedOffsetFell,
      },
      fastTurnYawSpeedGt2: {
        samples: fast.length,
        flatTargetLargeDrops: fastFlat,
        avgDropRadWhenFlat: fastFlat > 0 ? Number((fastFlatDrop / fastFlat).toFixed(4)) : 0,
      },
      ceilingTest: {
        flatDropPattern: flatDropOnlyTorsoCatch,
        targetMovedOffsetFellCount: targetMovedOffsetFell,
        interpretation:
          flatTargetOffsetDrop > 0 &&
          flatTargetTorsoMoved / flatTarget > 0.9 &&
          targetMovedOffsetFell < targetMoved * 0.05
            ? "drops align with no-input frames + torso chase"
            : "needs review",
      },
    },
    null,
    2,
  ),
);