import { bus } from "../bus.ts";
import {
  captureAimDebugSnapshot,
  formatAimDebugHud,
  type DebugSessionPhase,
} from "../debug/aimSnapshot.ts";
import { resetInputRateProbe } from "../debug/inputRates.ts";
import { debugStreamStatus, publishAimDebugSnapshot } from "../debug/publish.ts";
import { localPlayer } from "../state/world.ts";

export interface AimDebugHud {
  update(): void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    const ok = document.execCommand("copy");
    helper.remove();
    return ok;
  }
}

function syncHudSize(element: HTMLTextAreaElement, text: string): void {
  const lines = text.split("\n");
  element.rows = lines.length;
  element.cols = Math.max(...lines.map((line) => line.length), 1);
}

export function createAimDebugHud(): AimDebugHud {
  const element = document.createElement("textarea");
  element.readOnly = true;
  element.spellcheck = false;
  element.wrap = "off";
  element.style.cssText = [
    "position:fixed",
    "top:12px",
    "left:12px",
    "margin:0",
    "padding:10px 12px",
    "border-radius:6px",
    "border:none",
    "background:rgba(0,0,0,0.72)",
    "color:#e8e0e4",
    "font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    "white-space:pre",
    "overflow:auto",
    "resize:none",
    "outline:none",
    "user-select:all",
    "box-sizing:content-box",
    "width:auto",
    "height:auto",
    "z-index:12",
    "display:none",
  ].join(";");
  document.body.appendChild(element);

  let visible = false;
  let recording = false;
  let copiedUntil = 0;
  let sessionSeq = 0;
  let sessionId = "";

  function streamLine(): string {
    if (!recording) {
      return "Record             hold . while open → debug/latest.json + record.jsonl";
    }
    const status = debugStreamStatus();
    if (status.ok) {
      return `Record             ON · ${sessionId.slice(0, 8)} · frame ${sessionSeq}`;
    }
    return `Record             ON · OFFLINE (${status.error})`;
  }

  function hudText(phase: DebugSessionPhase = "stream"): string {
    const text = formatAimDebugHud(localPlayer, streamLine());
    if (performance.now() < copiedUntil) {
      return `${text}\n\nCopied to clipboard.`;
    }
    if (phase === "end") {
      return `${text}\n\nRecording ended.`;
    }
    return text;
  }

  function selectAll(): void {
    element.focus();
    element.select();
  }

  function setHudText(text: string): void {
    element.value = text;
    syncHudSize(element, text);
  }

  function publishSnapshot(phase: DebugSessionPhase): void {
    publishAimDebugSnapshot(
      captureAimDebugSnapshot(
        localPlayer,
        { id: sessionId, seq: sessionSeq, phase },
        phase === "start" ? streamLine() : undefined,
      ),
    );
    if (phase !== "end") sessionSeq += 1;
  }

  function stopRecording(): void {
    if (!recording) return;
    recording = false;
    publishSnapshot("end");
    if (visible) setHudText(hudText("end"));
  }

  function startRecording(): void {
    if (!visible || recording) return;
    recording = true;
    resetInputRateProbe();
    sessionId = crypto.randomUUID();
    sessionSeq = 0;
    setHudText(hudText("start"));
    publishSnapshot("start");
  }

  async function copyHud(): Promise<void> {
    const text = formatAimDebugHud(localPlayer, streamLine());
    if (await copyText(text)) {
      copiedUntil = performance.now() + 1200;
      setHudText(hudText());
      selectAll();
    }
  }

  element.addEventListener("click", () => {
    selectAll();
  });

  element.addEventListener("focus", () => {
    selectAll();
  });

  window.addEventListener("keydown", (event) => {
    if (!visible || event.code !== "KeyC" || event.repeat) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    void copyHud();
  });

  bus.on("aimDebugToggled", () => {
    if (visible) {
      stopRecording();
      visible = false;
      element.style.display = "none";
      element.style.pointerEvents = "none";
      return;
    }

    visible = true;
    element.style.display = "block";
    element.style.pointerEvents = "auto";
    setHudText(hudText());
    selectAll();
  });

  bus.on("aimDebugRecordStarted", () => {
    startRecording();
  });

  bus.on("aimDebugRecordStopped", () => {
    stopRecording();
  });

  return {
    update(): void {
      if (!visible) return;
      setHudText(hudText());
      if (recording) publishSnapshot("stream");
    },
  };
}