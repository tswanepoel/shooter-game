import * as THREE from "three";

const TILE_METERS = 1;

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function noiseFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  variance: number,
): void {
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * variance;
    data[i] = Math.max(0, Math.min(255, r + n));
    data[i + 1] = Math.max(0, Math.min(255, g + n));
    data[i + 2] = Math.max(0, Math.min(255, b + n));
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

export function createAsphaltTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 256, (ctx, width, height) => {
    noiseFill(ctx, width, height, 58, 61, 64, 28);
    ctx.strokeStyle = "rgba(28, 30, 32, 0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(20, 22, 24, 0.12)";
    for (let i = 0; i < 30; i++) {
      const size = 2 + Math.random() * 6;
      ctx.fillRect(Math.random() * width, Math.random() * height, size, size);
    }
  });
}

export function createCorrugatedTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(128, 64, (ctx, width, height) => {
    ctx.fillStyle = "#808890";
    ctx.fillRect(0, 0, width, height);
    const ridge = 6;
    for (let y = 0; y < height; y += ridge) {
      const lit = (y / ridge) % 2 === 0;
      ctx.fillStyle = lit ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, y, width, ridge);
    }
    noiseFill(ctx, width, height, 128, 132, 138, 12);
  });
}

export function createPlankTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(64, 128, (ctx, width, height) => {
    const plank = 10;
    for (let x = 0; x < width; x += plank) {
      const shade = 96 + Math.floor(Math.random() * 22);
      ctx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 18})`;
      ctx.fillRect(x, 0, plank - 1, height);
      ctx.fillStyle = "rgba(30, 24, 18, 0.55)";
      ctx.fillRect(x + plank - 1, 0, 1, height);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(0, Math.random() * height, width, 1);
    }
  });
}

export function createPlatformTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(128, 128, (ctx, width, height) => {
    ctx.fillStyle = "#6a7078";
    ctx.fillRect(0, 0, width, height);
    const cell = 16;
    ctx.strokeStyle = "rgba(18, 20, 22, 0.55)";
    ctx.lineWidth = 2;
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        ctx.beginPath();
        ctx.moveTo(x + cell / 2, y + 2);
        ctx.lineTo(x + cell - 2, y + cell / 2);
        ctx.lineTo(x + cell / 2, y + cell - 2);
        ctx.lineTo(x + 2, y + cell / 2);
        ctx.closePath();
        ctx.stroke();
      }
    }
    noiseFill(ctx, width, height, 104, 108, 114, 10);
  });
}

export function createConcreteTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(128, 128, (ctx, width, height) => {
    noiseFill(ctx, width, height, 56, 60, 64, 18);
    ctx.strokeStyle = "rgba(24, 26, 28, 0.45)";
    ctx.lineWidth = 2;
    const block = 32;
    for (let x = 0; x <= width; x += block) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += block) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  });
}

export function applyWorldRepeat(
  texture: THREE.CanvasTexture,
  widthMeters: number,
  heightMeters: number,
): THREE.CanvasTexture {
  const clone = texture.clone();
  clone.repeat.set(widthMeters / TILE_METERS, heightMeters / TILE_METERS);
  clone.needsUpdate = true;
  return clone;
}

export function createTiledStandardMaterial(
  texture: THREE.CanvasTexture,
  color: number,
  widthMeters: number,
  heightMeters: number,
  roughness: number,
  metalness: number,
): THREE.MeshStandardMaterial {
  const map = applyWorldRepeat(texture, widthMeters, heightMeters);
  return new THREE.MeshStandardMaterial({
    map,
    color,
    roughness,
    metalness,
  });
}