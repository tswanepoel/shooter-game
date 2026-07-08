import * as THREE from "three";

/** Billboards are not collision geometry; keep off the default raycast layer. */
const NAME_TAG_LAYER = 1;

const TAG_HEIGHT_ABOVE_ROOT = 1.95;
const TAG_WORLD_HEIGHT = 0.22;
const TAG_FONT = "bold 32px system-ui, sans-serif";
const TAG_COLOR = "#ff2222";
const TAG_PADDING_X = 10;

export function createPlayerNameTag(displayName: string): THREE.Sprite {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("canvas 2d context unavailable");

  measureCtx.font = TAG_FONT;
  const textWidth = measureCtx.measureText(displayName).width;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(textWidth + TAG_PADDING_X * 2);
  canvas.height = 48;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  ctx.font = TAG_FONT;
  ctx.fillStyle = TAG_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(displayName, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.layers.set(NAME_TAG_LAYER);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(TAG_WORLD_HEIGHT * aspect, TAG_WORLD_HEIGHT, 1);
  sprite.position.y = TAG_HEIGHT_ABOVE_ROOT;
  sprite.renderOrder = 4;
  sprite.frustumCulled = false;
  return sprite;
}

export function disposePlayerNameTag(sprite: THREE.Sprite): void {
  const material = sprite.material as THREE.SpriteMaterial;
  material.map?.dispose();
  material.dispose();
  sprite.removeFromParent();
}

export function setPlayerNameTagText(sprite: THREE.Sprite, displayName: string): THREE.Sprite {
  const parent = sprite.parent;
  disposePlayerNameTag(sprite);
  const replacement = createPlayerNameTag(displayName);
  parent?.add(replacement);
  return replacement;
}