import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), "debug/record.jsonl");
const y = fs
  .readFileSync(file, "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l))
  .filter((f) => f.session?.phase === "stream")
  .map((f) => ({
    seq: f.session.seq,
    target: f.aim.mouseTarget.yawRad,
    offset: f.aim.crosshairOffset.yawRad,
    ys: f.aim.yawSpeedRadPerSec,
  }));

let reversals = 0;
let flatDrops = 0;
let tgtNoYs = 0;
for (let i = 2; i < y.length; i++) {
  const dT = y[i].target - y[i - 1].target;
  const dO = y[i].offset - y[i - 1].offset;
  const pdO = y[i - 1].offset - y[i - 2].offset;
  if (dO * pdO < 0 && Math.abs(dO) > 0.0003) reversals++;
  if (Math.abs(dT) < 1e-6 && dO < -0.01) flatDrops++;
  if (Math.abs(dT) > 1e-4 && y[i].ys < 0.01) tgtNoYs++;
}

const bigDrops = [];
for (let i = 1; i < y.length; i++) {
  const dT = y[i].target - y[i - 1].target;
  const dODeg = ((y[i].offset - y[i - 1].offset) * 180) / Math.PI;
  if (Math.abs(dT) < 1e-6 && dODeg < -1) {
    bigDrops.push({ seq: y[i].seq, dOffsetDeg: Number(dODeg.toFixed(2)) });
  }
}

console.log(
  JSON.stringify(
    {
      frames: y.length,
      signReversals: reversals,
      reversalRate: Number((reversals / Math.max(1, y.length - 2)).toFixed(3)),
      flatTargetDropsOver0_01rad: flatDrops,
      bigFlatTargetDropsOver1deg: bigDrops.length,
      bigFlatDropsSample: bigDrops.slice(0, 8),
      targetChangedButYawSpeedUnder0_01: tgtNoYs,
      syncRate: Number((tgtNoYs / Math.max(1, y.length - 1)).toFixed(4)),
    },
    null,
    2,
  ),
);