import { releasePointerLockForUi, requestPointerLockForGame } from "../input/pointerLock.ts";
import {
  formatWeaponLabel,
  sanitizeLoadout,
  weaponAllowsSlot,
  weaponsForSlot,
} from "../config/weapons.ts";
import type { ActiveSlot, Loadout } from "../state/loadout.ts";
import {
  beginLoadoutPreviews,
  createLoadoutWeaponPreview,
  type LoadoutWeaponPreview,
} from "./loadoutWeaponPreview.ts";

export type LoadoutOverlayFooterMode = "spawn" | "alive";

export interface LoadoutOverlayOpenOptions {
  loadout: Loadout;
  footerMode: LoadoutOverlayFooterMode;
  title?: string;
  subtitle?: string;
  /** When false, Spawn is dimmed and ignored. Default true. */
  spawnEnabled?: boolean;
  /** When false, caller already released pointer lock. Default true. */
  releaseCapture?: boolean;
  /** Backdrop click invokes onCancel. Used when returning to character pick. */
  allowBackdropCancel?: boolean;
  onChange?: (loadout: Loadout) => void;
  onSpawn?: (loadout: Loadout) => void;
  onSpectate?: () => void;
  onClose?: () => void;
  onApply?: (loadout: Loadout) => void;
  onCancel?: () => void;
}

export interface LoadoutOverlay {
  open(options: LoadoutOverlayOpenOptions): void;
  close(): void;
  setLoadout(loadout: Loadout): void;
  setSpawnEnabled(enabled: boolean): void;
  isOpen(): boolean;
}

const GRID_COLUMNS = 6;
const GRID_GAP = 10;
const PANEL_PADDING_X = 48;
const TILE_HEIGHT = 100;
const PANEL_MAX_WIDTH = 1180;

const FOOTER_BUTTON_WIDTH = "148px";

const SPAWN_BUTTON_STYLE = [
  "box-sizing:border-box",
  `width:${FOOTER_BUTTON_WIDTH}`,
  "padding:12px 20px",
  "border:2px solid transparent",
  "border-radius:8px",
  "background:#6af",
  "color:#000",
  "font:600 1rem system-ui,sans-serif",
  "text-align:center",
  "cursor:pointer",
].join(";");

const CLOSE_BUTTON_STYLE = [
  "box-sizing:border-box",
  `width:${FOOTER_BUTTON_WIDTH}`,
  "padding:12px 20px",
  "border:2px solid transparent",
  "border-radius:8px",
  "background:#6af",
  "color:#000",
  "font:600 1rem system-ui,sans-serif",
  "text-align:center",
  "cursor:pointer",
].join(";");

const APPLY_BUTTON_STYLE = [
  "box-sizing:border-box",
  `width:${FOOTER_BUTTON_WIDTH}`,
  "padding:12px 20px",
  "border:2px solid transparent",
  "border-radius:8px",
  "background:#c44",
  "color:#fff",
  "font:600 1rem system-ui,sans-serif",
  "text-align:center",
  "cursor:pointer",
].join(";");

const SPECTATE_BUTTON_STYLE = [
  "box-sizing:border-box",
  `width:${FOOTER_BUTTON_WIDTH}`,
  "padding:10px 20px",
  "border:2px solid #6af",
  "border-radius:8px",
  "background:#10141c",
  "color:#8ab4ff",
  "font:600 1rem system-ui,sans-serif",
  "text-align:center",
  "cursor:pointer",
].join(";");

const TILE_BUTTON_BASE = [
  "display:block",
  "width:100%",
  "box-sizing:border-box",
  "padding:0",
  "border:2px solid #2a3344",
  "border-radius:10px",
  "background:#10141c",
  "overflow:hidden",
  "cursor:pointer",
  "transition:border-color 0.15s,box-shadow 0.15s,opacity 0.15s",
].join(";");

function otherSlot(slot: ActiveSlot): ActiveSlot {
  return slot === "primary" ? "secondary" : "primary";
}

function loadoutsEqual(a: Loadout, b: Loadout): boolean {
  return a.primary === b.primary && a.secondary === b.secondary;
}

function initialSlotChosen(
  footerMode: LoadoutOverlayFooterMode,
  current: Loadout,
): Record<ActiveSlot, boolean> {
  if (footerMode === "alive") return { primary: true, secondary: true };
  return {
    primary: current.primary !== null,
    secondary: current.secondary !== null,
  };
}

function weaponTileCode(id: string): string {
  const suffix = id.replace("blaster-", "");
  return suffix.length === 1 ? suffix.toUpperCase() : suffix.toUpperCase().slice(0, 2);
}

interface SlotWeaponTile {
  slot: ActiveSlot;
  weaponId: string | null;
  button: HTMLButtonElement;
  preview?: LoadoutWeaponPreview;
}

let sharedOverlay: LoadoutOverlay | undefined;

export function getLoadoutOverlay(): LoadoutOverlay {
  sharedOverlay ??= createLoadoutOverlay();
  return sharedOverlay;
}

export function createLoadoutOverlay(): LoadoutOverlay {
  const backdrop = document.createElement("div");
  backdrop.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:none",
    "align-items:center",
    "justify-content:center",
    "padding:24px",
    "box-sizing:border-box",
    "background:rgba(4,6,10,0.82)",
    "backdrop-filter:blur(6px)",
    "z-index:110",
    "pointer-events:auto",
  ].join(";");

  const panel = document.createElement("div");
  panel.style.cssText = [
    "display:flex",
    "flex-direction:column",
    "gap:16px",
    `width:min(${PANEL_MAX_WIDTH}px,100%)`,
    "max-height:min(90vh,920px)",
    "padding:22px 24px 20px",
    "border-radius:14px",
    "border:1px solid rgba(255,255,255,0.1)",
    "background:radial-gradient(ellipse at 50% 0%,#1a2230 0%,#0c1018 65%)",
    "box-shadow:0 24px 64px rgba(0,0,0,0.55)",
    "color:#fff",
    "font-family:system-ui,sans-serif",
    "overflow:hidden",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText = "text-align:center;";
  const titleEl = document.createElement("h2");
  titleEl.style.cssText = "margin:0;font-size:1.35rem;font-weight:600;letter-spacing:0.02em;";
  const subtitleEl = document.createElement("p");
  subtitleEl.style.cssText = "margin:6px 0 0;font-size:0.85rem;color:#8a96a8;line-height:1.45;";
  header.append(titleEl, subtitleEl);

  const loadingEl = document.createElement("p");
  loadingEl.textContent = "Loading weapons…";
  loadingEl.style.cssText = "margin:0;font-size:0.9rem;color:#8a96a8;text-align:center;";

  const body = document.createElement("div");
  body.style.cssText =
    "display:none;flex-direction:column;gap:16px;overflow:auto;min-height:0;scrollbar-gutter:stable;";

  function createSlotSection(
    label: string,
    hint: string,
  ): { section: HTMLElement; emptyRow: HTMLDivElement; grid: HTMLDivElement } {
    const section = document.createElement("section");
    section.style.cssText = "display:flex;flex-direction:column;gap:10px;";

    const heading = document.createElement("div");
    const headingTitle = document.createElement("h3");
    headingTitle.textContent = label;
    headingTitle.style.cssText = "margin:0;font-size:0.78rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8ab4ff;";
    const headingHint = document.createElement("p");
    headingHint.textContent = hint;
    headingHint.style.cssText = "margin:4px 0 0;font-size:0.8rem;color:#6a7588;";
    heading.append(headingTitle, headingHint);

    const emptyRow = document.createElement("div");
    emptyRow.style.cssText = [
      "width:100%",
      `max-width:calc((100% - ${(GRID_COLUMNS - 1) * GRID_GAP}px) / ${GRID_COLUMNS})`,
    ].join(";");

    const grid = document.createElement("div");
    grid.style.cssText = [
      "display:grid",
      "width:100%",
      `grid-template-columns:repeat(${GRID_COLUMNS},minmax(0,1fr))`,
      `gap:${GRID_GAP}px`,
    ].join(";");

    section.append(heading, emptyRow, grid);
    return { section, emptyRow, grid };
  }

  const primarySection = createSlotSection("Primary", "Any weapon");
  const secondarySection = createSlotSection("Secondary", "Pistol, shotgun, or launcher");

  body.append(primarySection.section, secondarySection.section);

  const footer = document.createElement("div");
  footer.style.cssText = [
    "display:flex",
    "justify-content:center",
    "gap:12px",
    "padding-top:4px",
  ].join(";");

  const spectateButton = document.createElement("button");
  spectateButton.type = "button";
  spectateButton.textContent = "Spectate";
  spectateButton.style.cssText = SPECTATE_BUTTON_STYLE;

  const spawnButton = document.createElement("button");
  spawnButton.type = "button";
  spawnButton.textContent = "Spawn";
  spawnButton.style.cssText = SPAWN_BUTTON_STYLE;

  const aliveButton = document.createElement("button");
  aliveButton.type = "button";
  aliveButton.textContent = "Close";
  aliveButton.style.cssText = CLOSE_BUTTON_STYLE;

  footer.append(spectateButton, spawnButton, aliveButton);
  panel.append(header, loadingEl, body, footer);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  let visible = false;
  let loadout: Loadout = { primary: null, secondary: null };
  let slotChosen: Record<ActiveSlot, boolean> = { primary: false, secondary: false };
  let footerMode: LoadoutOverlayFooterMode = "spawn";
  let spawnEnabled = true;
  let baselineLoadout: Loadout | null = null;
  let allowBackdropCancel = false;
  let onChange: ((loadout: Loadout) => void) | undefined;
  let onSpawn: ((loadout: Loadout) => void) | undefined;
  let onSpectate: (() => void) | undefined;
  let onClose: (() => void) | undefined;
  let onApply: ((loadout: Loadout) => void) | undefined;
  let onCancel: (() => void) | undefined;

  const primaryTiles: SlotWeaponTile[] = [];
  const secondaryTiles: SlotWeaponTile[] = [];
  let previewRenderer: ReturnType<typeof beginLoadoutPreviews> | undefined;
  let frameId = 0;
  let lastPreviewTime = performance.now();
  let gridsReady = false;
  let gridsInitPromise: Promise<void> | undefined;

  function notify(): void {
    onChange?.({ ...loadout });
  }

  function assignToSlot(slot: ActiveSlot, weaponId: string | null): void {
    if (weaponId !== null) {
      if (!weaponAllowsSlot(weaponId, slot)) return;
      if (loadout[otherSlot(slot)] === weaponId) return;
    }
    const current = loadout[slot];
    loadout = { ...loadout, [slot]: current === weaponId ? null : weaponId };
    slotChosen = { ...slotChosen, [slot]: true };
    refresh();
    notify();
  }

  function hasLoadoutChanges(): boolean {
    return baselineLoadout !== null && !loadoutsEqual(loadout, baselineLoadout);
  }

  function isLoadoutEmpty(): boolean {
    return loadout.primary === null && loadout.secondary === null;
  }

  function bothSlotsChosen(): boolean {
    return slotChosen.primary && slotChosen.secondary;
  }

  function canSpawn(): boolean {
    return bothSlotsChosen() && !isLoadoutEmpty();
  }

  function canSpectate(): boolean {
    return bothSlotsChosen() && isLoadoutEmpty();
  }

  function refreshTile(tile: SlotWeaponTile): void {
    const selected = tile.weaponId !== null && loadout[tile.slot] === tile.weaponId;
    const unarmedSelected =
      slotChosen[tile.slot] && tile.weaponId === null && loadout[tile.slot] === null;
    const takenInOther =
      tile.weaponId !== null && loadout[otherSlot(tile.slot)] === tile.weaponId;
    const disabled = takenInOther;

    const animate = !disabled && selected;
    tile.preview?.setSpinActive(animate);

    tile.button.disabled = disabled;
    if (disabled) {
      tile.button.style.opacity = "0.35";
      tile.button.style.cursor = "not-allowed";
      tile.button.style.borderColor = "#1e2430";
      tile.button.style.boxShadow = "none";
      tile.button.setAttribute("aria-pressed", "false");
      return;
    }

    if (selected || unarmedSelected) {
      tile.button.style.opacity = "1";
      tile.button.style.cursor = "pointer";
      tile.button.style.borderColor = "#6af";
      tile.button.style.boxShadow = "0 0 0 1px #6af,0 8px 20px rgba(68,136,255,0.2)";
      tile.button.setAttribute("aria-pressed", "true");
      return;
    }

    tile.button.style.opacity = "1";
    tile.button.style.cursor = "pointer";
    tile.button.style.borderColor = "#2a3344";
    tile.button.style.boxShadow = "none";
    tile.button.setAttribute("aria-pressed", "false");
  }

  function refreshSpectateButton(): void {
    const enabled = canSpectate();
    spectateButton.disabled = !enabled;
    spectateButton.style.opacity = enabled ? "1" : "0.45";
    spectateButton.style.cursor = enabled ? "pointer" : "not-allowed";
  }

  function refreshSpawnButton(): void {
    const enabled = spawnEnabled && canSpawn();
    spawnButton.disabled = !enabled;
    spawnButton.style.opacity = enabled ? "1" : "0.45";
    spawnButton.style.cursor = enabled ? "pointer" : "not-allowed";
  }

  function refreshAliveButton(): void {
    const changed = hasLoadoutChanges();
    aliveButton.textContent = changed ? "Apply" : "Close";
    aliveButton.style.cssText = changed ? APPLY_BUTTON_STYLE : CLOSE_BUTTON_STYLE;
    aliveButton.disabled = false;
    aliveButton.style.opacity = "1";
    aliveButton.style.cursor = "pointer";
  }

  function refreshFooterButtons(): void {
    const showSpawn = footerMode === "spawn";
    const showAliveAction = footerMode === "alive";
    const showSpectate = showSpawn || showAliveAction;
    spectateButton.style.display = showSpectate ? "block" : "none";
    spawnButton.style.display = showSpawn ? "block" : "none";
    aliveButton.style.display = showAliveAction ? "block" : "none";
    if (showSpectate) refreshSpectateButton();
    if (showSpawn) refreshSpawnButton();
    if (showAliveAction) refreshAliveButton();
  }

  function refresh(): void {
    for (const tile of primaryTiles) refreshTile(tile);
    for (const tile of secondaryTiles) refreshTile(tile);
    refreshFooterButtons();
  }

  function trySpectate(): void {
    if (!visible || (footerMode !== "spawn" && footerMode !== "alive") || !canSpectate() || !onSpectate) {
      return;
    }
    onSpectate();
    requestPointerLockForGame();
  }

  function trySpawn(): void {
    if (!visible || footerMode !== "spawn" || !spawnEnabled || !canSpawn() || !onSpawn) return;
    onSpawn({ ...loadout });
    requestPointerLockForGame();
  }

  function tryAliveAction(): void {
    if (!visible || footerMode !== "alive") return;
    if (hasLoadoutChanges()) {
      if (!onApply) return;
      onApply({ ...loadout });
    } else {
      if (!onClose) return;
      onClose();
    }
    requestPointerLockForGame();
  }

  function createTileButton(slot: ActiveSlot, weaponId: string | null, label: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", "false");
    button.style.cssText = TILE_BUTTON_BASE;

    const viewport = document.createElement("div");
    viewport.style.cssText = `width:100%;height:${TILE_HEIGHT}px;position:relative;display:block;overflow:hidden;`;

    if (weaponId !== null) {
      const badge = document.createElement("span");
      badge.textContent = weaponTileCode(weaponId);
      badge.style.cssText = [
        "position:absolute",
        "top:6px",
        "right:8px",
        "z-index:1",
        "font-size:0.68rem",
        "font-weight:700",
        "letter-spacing:0.06em",
        "color:#8a96a8",
        "text-shadow:0 1px 4px rgba(0,0,0,0.8)",
      ].join(";");
      viewport.appendChild(badge);
    }

    button.append(viewport);
    button.addEventListener("click", () => assignToSlot(slot, weaponId));
    return button;
  }

  function tileWidthForPanel(): number {
    const contentWidth = panel.clientWidth - PANEL_PADDING_X;
    return Math.floor((contentWidth - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS);
  }

  async function buildGrids(): Promise<void> {
    if (gridsReady) return;

    const tileWidth = tileWidthForPanel();
    previewRenderer = beginLoadoutPreviews(tileWidth, TILE_HEIGHT);

    async function addTiles(
      slot: ActiveSlot,
      emptyRow: HTMLDivElement,
      grid: HTMLDivElement,
      bucket: SlotWeaponTile[],
    ): Promise<void> {
      const unarmedButton = createTileButton(slot, null, "Empty");
      emptyRow.appendChild(unarmedButton);
      bucket.push({ slot, weaponId: null, button: unarmedButton });

      const previews = await Promise.all(
        weaponsForSlot(slot).map((weaponId) =>
          createLoadoutWeaponPreview(weaponId, tileWidth, TILE_HEIGHT),
        ),
      );

      for (let index = 0; index < previews.length; index++) {
        const weaponId = weaponsForSlot(slot)[index]!;
        const preview = previews[index]!;
        const button = createTileButton(slot, weaponId, formatWeaponLabel(weaponId));
        const viewport = button.firstElementChild as HTMLDivElement;
        viewport.insertBefore(preview.canvas, viewport.firstChild);
        grid.appendChild(button);
        bucket.push({ slot, weaponId, button, preview });
      }
    }

    await Promise.all([
      addTiles("primary", primarySection.emptyRow, primarySection.grid, primaryTiles),
      addTiles("secondary", secondarySection.emptyRow, secondarySection.grid, secondaryTiles),
    ]);

    gridsReady = true;
    loadingEl.style.display = "none";
    body.style.display = "flex";
  }

  function ensureGrids(): Promise<void> {
    gridsInitPromise ??= buildGrids().catch((error) => {
      gridsInitPromise = undefined;
      loadingEl.textContent = "Failed to load weapons. Refresh to try again.";
      loadingEl.style.color = "#f88";
      console.error("loadout weapon previews failed", error);
      throw error;
    });
    return gridsInitPromise;
  }

  function startPreviewLoop(): void {
    lastPreviewTime = performance.now();
    const tick = (now: number): void => {
      if (!visible || !previewRenderer) return;
      const dt = Math.min((now - lastPreviewTime) / 1000, 0.1);
      lastPreviewTime = now;
      for (const tile of primaryTiles) tile.preview?.update(dt, previewRenderer);
      for (const tile of secondaryTiles) tile.preview?.update(dt, previewRenderer);
      frameId = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(tick);
  }

  function stopPreviewLoop(): void {
    cancelAnimationFrame(frameId);
  }

  spectateButton.addEventListener("click", trySpectate);
  spawnButton.addEventListener("click", trySpawn);
  aliveButton.addEventListener("click", tryAliveAction);

  backdrop.addEventListener("click", (event) => {
    if (event.target !== backdrop || !allowBackdropCancel) return;
    onCancel?.();
    closeOverlay();
  });

  function closeOverlay(): void {
    if (!visible) return;
    visible = false;
    stopPreviewLoop();
    backdrop.style.display = "none";
    onChange = undefined;
    onSpawn = undefined;
    onSpectate = undefined;
    onClose = undefined;
    onApply = undefined;
    onCancel = undefined;
    allowBackdropCancel = false;
    spawnEnabled = true;
    baselineLoadout = null;
    slotChosen = { primary: false, secondary: false };
  }

  return {
    open(options: LoadoutOverlayOpenOptions): void {
      loadout = sanitizeLoadout(options.loadout);
      slotChosen = initialSlotChosen(options.footerMode, loadout);
      footerMode = options.footerMode;
      spawnEnabled = options.spawnEnabled ?? true;
      baselineLoadout = options.footerMode === "alive" ? sanitizeLoadout(options.loadout) : null;
      allowBackdropCancel = options.allowBackdropCancel ?? false;
      onChange = options.onChange;
      onSpawn = options.onSpawn;
      onSpectate = options.onSpectate;
      onClose = options.onClose;
      onApply = options.onApply;
      onCancel = options.onCancel;

      titleEl.textContent = options.title ?? "Choose your weapons";
      subtitleEl.textContent =
        options.subtitle ?? "Choose both slots before spawning. Scroll wheel swaps in-game.";

      loadingEl.style.display = gridsReady ? "none" : "block";
      loadingEl.style.color = "#8a96a8";
      body.style.display = gridsReady ? "flex" : "none";

      refresh();
      if (options.releaseCapture !== false) releasePointerLockForUi();
      visible = true;
      backdrop.style.display = "flex";
      void ensureGrids().then(() => {
        if (!visible) return;
        refresh();
        startPreviewLoop();
      });
    },
    close: closeOverlay,
    setLoadout(next: Loadout): void {
      loadout = sanitizeLoadout(next);
      refresh();
    },
    setSpawnEnabled(enabled: boolean): void {
      spawnEnabled = enabled;
      refreshSpawnButton();
    },
    isOpen(): boolean {
      return visible;
    },
  };
}