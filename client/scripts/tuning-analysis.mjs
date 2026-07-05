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
  .map((f, i, arr) => {
    const t = new Date(f.capturedAt).getTime();
    const prev = i > 0 ? new Date(arr[i - 1].capturedAt).getTime() : t;
    return {
      dt: i > 0 ? (t - prev) / 1000 : 0,
      target: f.aim.mouseTarget.yawRad,
      offset: f.aim.crosshairOffset.yawRad,
      inputSpeed: f.aim.inputSpeedRadPerSec,
      torsoRate: f.aim.chaseRates.torso,
      headRate: f.aim.chaseRates.head,
    };
  });

const flat = [];
for (let i = 1; i < rows.length; i++) {
  if (Math.abs(rows[i].target - rows[i - 1].target) < 1e-6) {
    flat.push({
      dOffsetDeg: ((rows[i].offset - rows[i - 1].offset) * 180) / Math.PI,
      inputSpeed: rows[i].inputSpeed,
      torsoRate: rows[i].torsoRate,
      dtMs: rows[i].dt * 1000,
    });
  }
}

const input = [];
for (let i = 1; i < rows.length; i++) {
  if (Math.abs(rows[i].target - rows[i - 1].target) > 1e-4) {
    input.push({
      dOffsetDeg: ((rows[i].offset - rows[i - 1].offset) * 180) / Math.PI,
      inputSpeed: rows[i].inputSpeed,
      torsoRate: rows[i].torsoRate,
    });
  }
}

function avg(arr, key) {
  return arr.reduce((s, x) => s + x[key], 0) / Math.max(1, arr.length);
}

function chaseStep(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

const dt = avg(flat, "dtMs") / 1000;
const avgTorsoLaggy = avg(flat, "torsoRate");
const avgInputTorsoRate = avg(input, "torsoRate");

console.log(
  JSON.stringify(
    {
      flatGapFrames: flat.length,
      avgGapDropDeg: Number(avg(flat, "dOffsetDeg").toFixed(3)),
      avgGapTorsoChaseRate: Number(avgTorsoLaggy.toFixed(1)),
      avgInputTorsoChaseRate: Number(avgInputTorsoRate.toFixed(1)),
      avgDtMs: Number((dt * 1000).toFixed(2)),
      theoreticalOneFrameCatchFraction: {
        atCurrentLaggy18: Number(chaseStep(18, dt).toFixed(4)),
        atLaggy12: Number(chaseStep(12, dt).toFixed(4)),
        atLaggy24: Number(chaseStep(24, dt).toFixed(4)),
        atSnappy78: Number(chaseStep(78, dt).toFixed(4)),
      },
      inputFramesOffsetRosePct: Number(
        ((input.filter((x) => x.dOffsetDeg > 0).length / input.length) * 100).toFixed(1),
      ),
      flatFramesInputSpeedAvg: Number(avg(flat, "inputSpeed").toFixed(2)),
    },
    null,
    2,
  ),
);