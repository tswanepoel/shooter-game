import { maxHealth } from "../modules/health/index.ts";
import { bearingToAttacker } from "../sim/damageDirection.ts";
import { localPlayer } from "../state/world.ts";

export interface DamageOverlay {
  showFromAttacker(attackerId: string): void;
  tick(dt: number): void;
  reset(): void;
}

const DAMAGE_OVERLAY = {
  maxConcurrentSplats: 4,
  splatSizePx: 200,
  edgeInsetPercent: 38,
  rotationJitterDegrees: 32,
  animDuration: 0.1,
  holdDuration: 0.18,
  fadeDuration: 0.65,
  vignetteMaxOpacity: 0.85,
  vignetteStackPerHit: 0.55,
  vignettePulseDecayRate: 7,
  vignetteRestMax: 0.72,
  vignetteRestCurve: 1.2,
  vignetteRestSmoothing: 5,
} as const;

interface SplatSequence {
  prefix: string;
  start: number;
  count: number;
}

interface SplatSlot {
  root: HTMLDivElement;
  img: HTMLImageElement;
  active: boolean;
  elapsed: number;
  frame: number;
  sequence: SplatSequence;
  rotationRad: number;
}

const SPLAT_SEQUENCES: readonly SplatSequence[] = [
  { prefix: "/ui/bloodsplats/splat1/bloodsplats_", start: 1, count: 16 },
  { prefix: "/ui/bloodsplats/splat2/bloodsplats_", start: 18, count: 13 },
  { prefix: "/ui/bloodsplats/splat3/bloodsplats_", start: 32, count: 15 },
] as const;

function splatFrameUrl(sequence: SplatSequence, frame: number): string {
  const index = sequence.start + frame - 1;
  return `${sequence.prefix}${String(index).padStart(4, "0")}.png`;
}

function pickSequence(): SplatSequence {
  return SPLAT_SEQUENCES[Math.floor(Math.random() * SPLAT_SEQUENCES.length)];
}

function rotationAroundBearing(bearing: number): number {
  const jitter =
    (Math.random() * 2 - 1) * ((DAMAGE_OVERLAY.rotationJitterDegrees * Math.PI) / 180);
  return bearing + jitter;
}

function placeOnEdge(bearing: number): { x: string; y: string } {
  const { edgeInsetPercent } = DAMAGE_OVERLAY;
  const dx = Math.sin(bearing);
  const dy = -Math.cos(bearing);
  const x = 50 + dx * edgeInsetPercent;
  const y = 50 + dy * edgeInsetPercent;
  return { x: `${x}%`, y: `${y}%` };
}

export function createDamageOverlay(): DamageOverlay {
  const root = document.createElement("div");
  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "pointer-events:none",
    "overflow:hidden",
    "z-index:18",
  ].join(";");

  const vignette = document.createElement("div");
  vignette.style.cssText = [
    "position:absolute",
    "inset:0",
    "opacity:0",
    "background:radial-gradient(ellipse at center, transparent 42%, rgba(120,0,0,0.55) 78%, rgba(80,0,0,0.85) 100%)",
    "transition:none",
  ].join(";");
  root.appendChild(vignette);

  const splatLayer = document.createElement("div");
  splatLayer.style.cssText = "position:absolute;inset:0;";
  root.appendChild(splatLayer);

  document.body.appendChild(root);

  let vignettePulse = 0;
  let vignetteRest = 0;
  const slots: SplatSlot[] = [];

  function healthRestTarget(health: number): number {
    const missing = 1 - health / maxHealth;
    if (missing <= 0) return 0;
    return missing ** DAMAGE_OVERLAY.vignetteRestCurve * DAMAGE_OVERLAY.vignetteRestMax;
  }

  function applyVignetteOpacity(): void {
    const strength = Math.min(1, vignetteRest + vignettePulse);
    vignette.style.opacity = String(strength * DAMAGE_OVERLAY.vignetteMaxOpacity);
  }

  for (let i = 0; i < DAMAGE_OVERLAY.maxConcurrentSplats; i++) {
    const slotRoot = document.createElement("div");
    slotRoot.style.cssText = [
      "position:absolute",
      "width:0",
      "height:0",
      "display:none",
      "transform:translate(-50%,-50%)",
      "will-change:transform,opacity",
    ].join(";");

    const img = document.createElement("img");
    img.draggable = false;
    img.style.cssText = [
      `width:${DAMAGE_OVERLAY.splatSizePx}px`,
      `height:${DAMAGE_OVERLAY.splatSizePx}px`,
      "object-fit:contain",
      "pointer-events:none",
      "opacity:0.92",
      "filter:drop-shadow(0 0 6px rgba(0,0,0,0.45))",
    ].join(";");
    slotRoot.appendChild(img);
    splatLayer.appendChild(slotRoot);

    slots.push({
      root: slotRoot,
      img,
      active: false,
      elapsed: 0,
      frame: 1,
      sequence: SPLAT_SEQUENCES[0],
      rotationRad: 0,
    });
  }

  function acquireSlot(): SplatSlot {
    const free = slots.find((slot) => !slot.active);
    if (free) return free;
    return slots.reduce((oldest, slot) => (slot.elapsed > oldest.elapsed ? slot : oldest));
  }

  function spawnSplat(bearing: number): void {
    const slot = acquireSlot();
    const sequence = pickSequence();
    const pos = placeOnEdge(bearing);
    const rotationRad = rotationAroundBearing(bearing);

    slot.active = true;
    slot.elapsed = 0;
    slot.frame = 1;
    slot.sequence = sequence;
    slot.rotationRad = rotationRad;
    slot.root.style.display = "block";
    slot.root.style.left = pos.x;
    slot.root.style.top = pos.y;
    slot.img.src = splatFrameUrl(sequence, 1);
    slot.root.style.transform = `translate(-50%,-50%) rotate(${rotationRad}rad) scale(0.85)`;
    slot.root.style.opacity = "1";
  }

  function showFromAttacker(attackerId: string): void {
    const bearing = bearingToAttacker(attackerId);
    if (bearing === undefined) return;

    vignettePulse = Math.min(
      1,
      vignettePulse + DAMAGE_OVERLAY.vignetteStackPerHit,
    );
    spawnSplat(-bearing);
    applyVignetteOpacity();
  }

  function updateSplat(slot: SplatSlot, dt: number): void {
    if (!slot.active) return;

    slot.elapsed += dt;
    const { animDuration, holdDuration, fadeDuration } = DAMAGE_OVERLAY;
    const total = animDuration + holdDuration + fadeDuration;

    if (slot.elapsed >= total) {
      slot.active = false;
      slot.root.style.display = "none";
      return;
    }

    if (slot.elapsed < animDuration) {
      const frameDuration = animDuration / slot.sequence.count;
      const frameIndex = Math.min(
        slot.sequence.count,
        Math.floor(slot.elapsed / frameDuration) + 1,
      );
      if (frameIndex !== slot.frame) {
        slot.frame = frameIndex;
        slot.img.src = splatFrameUrl(slot.sequence, frameIndex);
      }
      const popT = Math.min(1, slot.elapsed / Math.min(animDuration, 0.08));
      const scale = 0.85 + popT * 0.2;
      slot.root.style.transform = `translate(-50%,-50%) rotate(${slot.rotationRad}rad) scale(${scale})`;
      slot.root.style.opacity = "1";
      return;
    }

    if (slot.elapsed < animDuration + holdDuration) {
      slot.frame = slot.sequence.count;
      slot.img.src = splatFrameUrl(slot.sequence, slot.frame);
      slot.root.style.transform = `translate(-50%,-50%) rotate(${slot.rotationRad}rad) scale(1.05)`;
      slot.root.style.opacity = "1";
      return;
    }

    const fadeT = (slot.elapsed - animDuration - holdDuration) / fadeDuration;
    slot.root.style.opacity = String(Math.max(0, 1 - fadeT));
  }

  function tick(dt: number): void {
    const restTarget = localPlayer.alive ? healthRestTarget(localPlayer.health) : 0;
    vignetteRest += (restTarget - vignetteRest) * (1 - Math.exp(-DAMAGE_OVERLAY.vignetteRestSmoothing * dt));
    vignettePulse *= Math.exp(-DAMAGE_OVERLAY.vignettePulseDecayRate * dt);

    applyVignetteOpacity();

    for (const slot of slots) {
      updateSplat(slot, dt);
    }
  }

  function reset(): void {
    vignettePulse = 0;
    vignetteRest = 0;
    vignette.style.opacity = "0";
    for (const slot of slots) {
      slot.active = false;
      slot.root.style.display = "none";
    }
  }

  return { showFromAttacker, tick, reset };
}