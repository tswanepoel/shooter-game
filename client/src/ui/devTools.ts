import * as THREE from "three";
import { releasePointerLockForUi } from "../input/pointerLock.ts";
import { CHARACTER_IDS, getCharacterRecipe } from "../config/characters.ts";
import { getWeaponRecipe, WEAPON_IDS, type WeaponRecipe } from "../config/weapons.ts";
import { loadPlayerAvatar, type PlayerAvatar } from "../render/playerAvatar.ts";

const LINEUP_DISTANCE = 5;
const LINEUP_SPACING = 2.5;
const LABEL_HEIGHT = 1.85;
const MUZZLE_MARKER_RADIUS = 0.025;
const muzzleMarkerGeometry = new THREE.SphereGeometry(MUZZLE_MARKER_RADIUS, 8, 8);
const muzzleMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xff44cc });

export interface DevTools {
  tick(dt: number): void;
}

interface DevToolsDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sampleEyeWorldPosition(out: THREE.Vector3): boolean;
  getViewerYaw(): number;
  isActive(): boolean;
}

interface LineupEntry {
  avatar: PlayerAvatar;
  weaponId: string;
  label: HTMLDivElement;
  muzzleMarkers: THREE.Mesh[];
}

function pickRandomCharacterId(): string {
  return CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)]!;
}

/** Queue along the row: each avatar faces the next one's back (a→r). */
function lineupQueueYaw(rightX: number, rightZ: number): number {
  return Math.atan2(rightX, rightZ) + Math.PI;
}

function attachMuzzleMarkers(avatar: PlayerAvatar, weapon: WeaponRecipe): THREE.Mesh[] {
  const parent = avatar.weaponMesh.parent;
  if (!parent) return [];

  const markers: THREE.Mesh[] = [];
  for (const point of weapon.muzzlePoints) {
    const marker = new THREE.Mesh(muzzleMarkerGeometry, muzzleMarkerMaterial);
    marker.position.set(point.x, point.y, point.z);
    parent.add(marker);
    markers.push(marker);
  }
  return markers;
}

function projectLabel(
  world: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  label: HTMLDivElement,
): void {
  const projected = world.clone().project(camera);
  if (projected.z < -1 || projected.z > 1) {
    label.style.display = "none";
    return;
  }

  const { clientWidth, clientHeight } = renderer.domElement;
  const x = (projected.x * 0.5 + 0.5) * clientWidth;
  const y = (-projected.y * 0.5 + 0.5) * clientHeight;
  label.style.display = "block";
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
}

export function createDevTools(deps: DevToolsDeps): DevTools {
  const eye = new THREE.Vector3();
  const labelWorld = new THREE.Vector3();
  let menuOpen = false;
  let lineup: LineupEntry[] = [];
  let backtickHeld = false;

  const panel = document.createElement("div");
  panel.style.cssText = [
    "position:fixed",
    "top:16px",
    "right:16px",
    "display:none",
    "min-width:240px",
    "padding:12px 14px",
    "border-radius:6px",
    "background:rgba(8,12,18,0.92)",
    "border:1px solid rgba(255,255,255,0.12)",
    "color:#e8eef5",
    "font:500 0.85rem system-ui,sans-serif",
    "z-index:200",
    "pointer-events:auto",
    "box-shadow:0 8px 24px rgba(0,0,0,0.35)",
  ].join(";");
  panel.innerHTML = [
    '<div style="font-weight:700;margin-bottom:10px;letter-spacing:0.04em;text-transform:uppercase;font-size:0.72rem;color:#8ab4ff">Developer options</div>',
    '<button type="button" data-action="weapon-lineup" style="width:100%;text-align:left;padding:8px 10px;border:1px solid rgba(255,255,255,0.14);border-radius:4px;background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;font:inherit">1. Spawn weapon lineup</button>',
    '<div style="margin-top:8px;font-size:0.75rem;color:#9aa7b8;line-height:1.4">Random characters, one per weapon a–r, queued along the row (a→r left to right), facing into each other\'s backs. Magenta dots mark muzzlePoints for tuning.</div>',
    '<button type="button" data-action="clear-lineup" style="margin-top:8px;width:100%;text-align:left;padding:8px 10px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:transparent;color:#9aa7b8;cursor:pointer;font:inherit">Clear lineup</button>',
  ].join("");
  document.body.appendChild(panel);

  const labelLayer = document.createElement("div");
  labelLayer.style.cssText = [
    "position:fixed",
    "inset:0",
    "pointer-events:none",
    "z-index:150",
    "overflow:hidden",
  ].join(";");
  document.body.appendChild(labelLayer);

  function setMenuOpen(open: boolean): void {
    menuOpen = open;
    panel.style.display = open ? "block" : "none";
    if (open) releasePointerLockForUi();
  }

  function createLabel(weaponId: string): HTMLDivElement {
    const label = document.createElement("div");
    label.textContent = weaponId.replace("blaster-", "");
    label.style.cssText = [
      "position:absolute",
      "transform:translate(-50%,-100%)",
      "padding:2px 6px",
      "border-radius:3px",
      "background:rgba(0,0,0,0.55)",
      "color:#fff",
      "font:700 0.75rem system-ui,sans-serif",
      "white-space:nowrap",
      "display:none",
    ].join(";");
    labelLayer.appendChild(label);
    return label;
  }

  function clearLineup(): void {
    for (const entry of lineup) {
      for (const marker of entry.muzzleMarkers) marker.remove();
      deps.scene.remove(entry.avatar.root);
      entry.avatar.dispose();
      entry.label.remove();
    }
    lineup = [];
  }

  async function spawnWeaponLineup(): Promise<void> {
    clearLineup();

    if (!deps.sampleEyeWorldPosition(eye)) return;

    const yaw = deps.getViewerYaw();
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const centerX = eye.x + forwardX * LINEUP_DISTANCE;
    const centerZ = eye.z + forwardZ * LINEUP_DISTANCE;
    const count = WEAPON_IDS.length;
    const startOffset = -((count - 1) * LINEUP_SPACING) / 2;

    const loads = WEAPON_IDS.map(async (weaponId, index) => {
      const character = getCharacterRecipe(pickRandomCharacterId());
      const weapon = getWeaponRecipe(weaponId);
      const avatar = await loadPlayerAvatar(character, weapon);

      const lateral = startOffset + index * LINEUP_SPACING;
      const x = centerX + rightX * lateral;
      const z = centerZ + rightZ * lateral;

      avatar.root.position.set(x, 0, z);
      avatar.root.rotation.y = lineupQueueYaw(rightX, rightZ);
      avatar.setLocomotion("idle");
      avatar.weaponMesh.visible = true;
      deps.scene.add(avatar.root);

      return {
        avatar,
        weaponId,
        label: createLabel(weaponId),
        muzzleMarkers: attachMuzzleMarkers(avatar, weapon),
      };
    });

    lineup = await Promise.all(loads);
  }

  panel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    if (target.dataset.action === "weapon-lineup") {
      void spawnWeaponLineup().catch((error) => {
        console.error("dev weapon lineup failed", error);
      });
      return;
    }

    if (target.dataset.action === "clear-lineup") {
      clearLineup();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (!deps.isActive() || event.code !== "Backquote" || event.repeat) return;
    if (backtickHeld) return;
    backtickHeld = true;
    event.preventDefault();
    setMenuOpen(!menuOpen);
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "Backquote") backtickHeld = false;
  });

  return {
    tick(dt: number): void {
      if (lineup.length === 0) return;

      for (const entry of lineup) {
        entry.avatar.setLocomotion("idle");
        entry.avatar.update(dt);

        const pos = entry.avatar.root.position;
        labelWorld.set(pos.x, pos.y + LABEL_HEIGHT, pos.z);
        projectLabel(labelWorld, deps.camera, deps.renderer, entry.label);
      }
    },
  };
}