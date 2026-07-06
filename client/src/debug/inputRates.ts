/** Per-render-window counters; consumed when a debug stream frame is captured. */

export interface InputRateWindow {
  pointerEvents: number;
  coalescedSamples: number;
  simTicks: number;
  renderFrames: number;
}

let pointerEvents = 0;
let coalescedSamples = 0;
let simTicks = 0;
let renderFrames = 0;

export function resetInputRateProbe(): void {
  pointerEvents = 0;
  coalescedSamples = 0;
  simTicks = 0;
  renderFrames = 0;
}

/** One pointermove delivery (handler invocation). sampleCount = getCoalescedEvents().length. */
export function recordPointerDelivery(sampleCount: number): void {
  pointerEvents += 1;
  coalescedSamples += sampleCount;
}

export function recordSimTick(): void {
  simTicks += 1;
}

export function recordRenderFrame(): void {
  renderFrames += 1;
}

export function consumeInputRateWindow(): InputRateWindow {
  const window: InputRateWindow = {
    pointerEvents,
    coalescedSamples,
    simTicks,
    renderFrames,
  };
  pointerEvents = 0;
  coalescedSamples = 0;
  simTicks = 0;
  renderFrames = 0;
  return window;
}