import { loadStreamFrames } from "./lib/read-record.mjs";

const frames = loadStreamFrames();
if (frames.length < 2) {
  console.log(JSON.stringify({ error: "need at least 2 stream frames" }, null, 2));
  process.exit(1);
}

const t0 = new Date(frames[0].capturedAt).getTime();
const t1 = new Date(frames.at(-1).capturedAt).getTime();
const durationSec = (t1 - t0) / 1000;

function sum(key) {
  return frames.reduce((total, frame) => total + (frame[key] ?? 0), 0);
}

function countWhere(pred) {
  return frames.filter(pred).length;
}

const totals = {
  pointerEvents: sum("pointerEvents"),
  coalescedSamples: sum("coalescedSamples"),
  simTicks: sum("simTicks"),
  renderFrames: sum("renderFrames"),
};

const hz = (count) => Number((count / durationSec).toFixed(1));

const hasProbe = frames.some((frame) => "pointerEvents" in frame);
if (!hasProbe) {
  console.log(
    JSON.stringify(
      {
        error: "recording predates input-rate probe — re-record with latest client",
        streamFrames: frames.length,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const avgPerStreamFrame = (key) => Number((totals[key] / frames.length).toFixed(3));

console.log(
  JSON.stringify(
    {
      streamFrames: frames.length,
      durationSec: Number(durationSec.toFixed(3)),
      totals,
      hz: {
        pointerEvents: hz(totals.pointerEvents),
        coalescedSamples: hz(totals.coalescedSamples),
        simTicks: hz(totals.simTicks),
        renderFrames: hz(totals.renderFrames),
      },
      avgPerStreamFrame: {
        pointerEvents: avgPerStreamFrame("pointerEvents"),
        coalescedSamples: avgPerStreamFrame("coalescedSamples"),
        simTicks: avgPerStreamFrame("simTicks"),
        renderFrames: avgPerStreamFrame("renderFrames"),
      },
      coalescedPerPointerAvg: Number(
        (totals.coalescedSamples / Math.max(1, totals.pointerEvents)).toFixed(2),
      ),
      streamFramesWithZeroPointerEvents: countWhere((frame) => frame.pointerEvents === 0),
      streamFramesWithZeroCoalesced: countWhere((frame) => frame.coalescedSamples === 0),
      interpretation: {
        pointerEventsHz: "pointermove handler invocations per second",
        coalescedSamplesHz:
          "hardware movement samples per second (sum of getCoalescedEvents lengths)",
        simTicksHz: "tick() calls per second",
        renderFramesHz: "game-loop rAF iterations per second while in match",
      },
    },
    null,
    2,
  ),
);