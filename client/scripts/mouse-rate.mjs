import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), "debug/record.jsonl");
const rows = fs
  .readFileSync(file, "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l))
  .filter((f) => f.session?.phase === "stream")
  .map((f, i, arr) => ({
    t: new Date(f.capturedAt).getTime(),
    target: f.aim.mouseTarget.yawRad,
    yawSpeed: f.aim.yawSpeedRadPerSec,
    prevTarget: i > 0 ? arr[i - 1].aim.mouseTarget.yawRad : f.aim.mouseTarget.yawRad,
  }));

const durationMs = rows.at(-1).t - rows[0].t;
const renderHz = (rows.length / durationMs) * 1000;

let inputFrames = 0;
let gapFrames = 0;
const gapLengths = [];
let currentGap = 0;
const inputIntervals = [];
let lastInputT = null;

for (let i = 1; i < rows.length; i++) {
  const changed = Math.abs(rows[i].target - rows[i - 1].target) > 1e-6;
  if (changed) {
    inputFrames++;
    if (lastInputT !== null) inputIntervals.push(rows[i].t - lastInputT);
    lastInputT = rows[i].t;
    if (currentGap > 0) {
      gapLengths.push(currentGap);
      currentGap = 0;
    }
  } else {
    gapFrames++;
    currentGap++;
  }
}

const sortedIntervals = inputIntervals.toSorted((a, b) => a - b);
const medianInputInterval =
  sortedIntervals[Math.floor(sortedIntervals.length / 2)] ?? 0;

console.log(
  JSON.stringify(
    {
      recordingDurationMs: durationMs,
      renderFrames: rows.length,
      renderHz: Number(renderHz.toFixed(1)),
      framesWithMouseInput: inputFrames,
      framesWithNoInput: gapFrames,
      effectiveInputApplicationHz: Number(((inputFrames / durationMs) * 1000).toFixed(1)),
      pctRenderFramesWithInput: Number(((inputFrames / (rows.length - 1)) * 100).toFixed(1)),
      gapLengthFrames: {
        min: gapLengths.length ? Math.min(...gapLengths) : 0,
        max: gapLengths.length ? Math.max(...gapLengths) : 0,
        avg: gapLengths.length
          ? Number((gapLengths.reduce((a, b) => a + b, 0) / gapLengths.length).toFixed(2))
          : 0,
        count: gapLengths.length,
      },
      msBetweenInputFrames: {
        median: medianInputInterval,
        min: sortedIntervals[0] ?? 0,
        p90: sortedIntervals[Math.floor(sortedIntervals.length * 0.9)] ?? 0,
        impliedHz: medianInputInterval > 0 ? Number((1000 / medianInputInterval).toFixed(1)) : 0,
      },
      note: "Post-fix: at most one targetYaw step per render frame. Raw mousemove Hz is not logged; this is effective sim input rate.",
    },
    null,
    2,
  ),
);