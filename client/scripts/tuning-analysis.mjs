import { deg, loadStreamFrames } from "./lib/read-record.mjs";

const frames = loadStreamFrames();
const yaw = frames.map((f) => ({
  sessionId: f.session.id,
  seq: f.session.seq,
  target: deg(f.targetYawDeg),
  head: deg(f.headYawDeg),
  torso: deg(f.torsoYawDeg),
  offset: deg(f.offsetYawDeg),
  offsetDeg: f.offsetYawDeg,
  yawSpeed: f.yawSpeedRadPerSec,
  inputSpeed: f.inputSpeedRadPerSec,
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

const peak = yaw.toSorted((a, b) => Math.abs(b.offset) - Math.abs(a.offset)).slice(0, 5);
const start = yaw.findIndex((f) => Math.abs(f.target - yaw[0].target) > 0.01);

console.log(
  JSON.stringify(
    {
      sessionId: frames[0]?.session?.id,
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
      turnWindow:
        start >= 0
          ? yaw.slice(start, start + 15).map((f, i, arr) => ({
              seq: f.seq,
              targetDeg: Number(((f.target * 180) / Math.PI).toFixed(1)),
              offsetDeg: Number(f.offsetDeg.toFixed(2)),
              dOffsetDeg: i > 0 ? Number((((f.offset - arr[i - 1].offset) * 180) / Math.PI).toFixed(3)) : 0,
              torsoDeg: Number(((f.torso * 180) / Math.PI).toFixed(1)),
              yawSpeed: Number(f.yawSpeed.toFixed(0)),
            }))
          : null,
    },
    null,
    2,
  ),
);