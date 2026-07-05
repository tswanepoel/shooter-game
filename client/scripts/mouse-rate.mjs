import { deg, loadStreamFrames, withTiming } from "./lib/read-record.mjs";

const rows = withTiming(loadStreamFrames(), (f, _i, _arr, { dtMs }) => ({
  dt: dtMs / 1000,
  target: deg(f.targetYawDeg),
  offset: deg(f.offsetYawDeg),
  inputSpeed: f.inputSpeedRadPerSec,
  torsoRate: f.chaseTorso,
}));

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

console.log(
  JSON.stringify(
    {
      flatGapFrames: flat.length,
      avgGapDropDeg: Number(avg(flat, "dOffsetDeg").toFixed(3)),
      avgGapTorsoChaseRate: Number(avg(flat, "torsoRate").toFixed(1)),
      avgInputTorsoChaseRate: Number(avg(input, "torsoRate").toFixed(1)),
      avgDtMs: Number((dt * 1000).toFixed(2)),
      theoreticalOneFrameCatchFraction: {
        atLaggy18: Number(chaseStep(18, dt).toFixed(4)),
        atLaggy12: Number(chaseStep(12, dt).toFixed(4)),
      },
    },
    null,
    2,
  ),
);