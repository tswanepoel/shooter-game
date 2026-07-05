import { deg, loadStreamFrames, withTiming } from "./lib/read-record.mjs";

const rows = withTiming(loadStreamFrames(), (f, _i, _arr, { dtMs }) => ({
  sessionId: f.session.id,
  dtMs,
  target: deg(f.targetYawDeg),
  offset: deg(f.offsetYawDeg),
  yawSpeed: f.yawSpeedRadPerSec,
  torso: deg(f.torsoYawDeg),
  head: deg(f.headYawDeg),
}));

const dts = rows.slice(1).map((r) => r.dtMs);
const avgDt = dts.reduce((a, b) => a + b, 0) / dts.length;

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

console.log(
  JSON.stringify(
    {
      sessionId: rows[0]?.sessionId,
      streamFrames: rows.length,
      timing: {
        avgDtMs: Number(avgDt.toFixed(2)),
        impliedFps: Number((1000 / avgDt).toFixed(1)),
      },
      perFrameInput: {
        framesTargetUnchanged: flatTarget,
        pctTargetUnchanged: Number(((flatTarget / (rows.length - 1)) * 100).toFixed(1)),
        unchangedTarget_offsetDropped: flatTargetOffsetDrop,
        unchangedTarget_offsetRose: flatTargetOffsetRise,
        unchangedTarget_torsoMoved: flatTargetTorsoMoved,
      },
      ceilingTest: {
        targetMovedOffsetFellCount: targetMovedOffsetFell,
        interpretation:
          flatTargetOffsetDrop > 0 && flatTargetTorsoMoved / flatTarget > 0.9
            ? "drops align with no-input frames + torso chase"
            : "needs review",
      },
    },
    null,
    2,
  ),
);