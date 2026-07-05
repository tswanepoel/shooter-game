import { deg, loadStreamFrames, withTiming } from "./lib/read-record.mjs";

const rows = withTiming(loadStreamFrames(), (f, i, arr, { t }) => ({
  t,
  target: deg(f.targetYawDeg),
  yawSpeed: f.yawSpeedRadPerSec,
  prevTarget: i > 0 ? deg(arr[i - 1].targetYawDeg) : deg(f.targetYawDeg),
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
const medianInputInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)] ?? 0;

console.log(
  JSON.stringify(
    {
      recordingDurationMs: durationMs,
      renderFrames: rows.length,
      renderHz: Number(renderHz.toFixed(1)),
      framesWithMouseInput: inputFrames,
      framesWithNoInput: gapFrames,
      effectiveInputApplicationHz: Number(((inputFrames / durationMs) * 1000).toFixed(1)),
      gapLengthFrames: {
        avg: gapLengths.length
          ? Number((gapLengths.reduce((a, b) => a + b, 0) / gapLengths.length).toFixed(2))
          : 0,
        count: gapLengths.length,
      },
      msBetweenInputFrames: {
        median: medianInputInterval,
        impliedHz: medianInputInterval > 0 ? Number((1000 / medianInputInterval).toFixed(1)) : 0,
      },
    },
    null,
    2,
  ),
);