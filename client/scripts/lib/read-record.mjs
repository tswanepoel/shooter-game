import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const RECORD_PATH = path.join(repoRoot, "debug/record.jsonl");
export const DEG_TO_RAD = Math.PI / 180;

/** @typedef {"start" | "stream" | "end"} RecordPhase */

/**
 * Lean stream line (phase stream/end) — grep/jq friendly:
 *   offsetYawDeg, targetYawDeg, yawSpeedRadPerSec, chaseYawTorso, session.seq
 * Full context once per hold (phase start): formatted, config, aim.*
 */
export function readRecordLines(file = RECORD_PATH) {
  const text = fs.readFileSync(file, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => JSON.parse(line));
}

/** @param {RecordPhase} phase */
export function filterPhase(lines, phase) {
  return lines.filter((frame) => frame.session?.phase === phase);
}

export function loadStreamFrames(file = RECORD_PATH) {
  return filterPhase(readRecordLines(file), "stream");
}

export function loadSessionStart(file = RECORD_PATH) {
  return filterPhase(readRecordLines(file), "start").at(-1);
}

export function deg(degrees) {
  return degrees * DEG_TO_RAD;
}

/**
 * Map stream frames with inter-frame timing from capturedAt.
 * @template T
 * @param {object[]} frames
 * @param {(frame: object, index: number, frames: object[], timing: { t: number, dtMs: number }) => T} mapFn
 */
export function withTiming(frames, mapFn) {
  return frames.map((frame, index, arr) => {
    const t = new Date(frame.capturedAt).getTime();
    const prev = index > 0 ? new Date(arr[index - 1].capturedAt).getTime() : t;
    return mapFn(frame, index, arr, { t, dtMs: index > 0 ? t - prev : 0 });
  });
}