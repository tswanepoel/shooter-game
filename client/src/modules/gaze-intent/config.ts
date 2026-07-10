export interface ModuleConfig {
  /** Per-pointermove delivery cap; spikes in recordings were ~460px while normal frames are ~15px. */
  readonly maxPointerDeltaPx: number;
  readonly sensitivity: number;
}
