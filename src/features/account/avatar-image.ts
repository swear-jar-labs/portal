import { PROFILE_AVATAR_MAX_BYTES } from "./schema";

export const AVATAR_SIZE = 256;
export const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const AVATAR_MAX_OUTPUT_BYTES = PROFILE_AVATAR_MAX_BYTES;
export const AVATAR_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_ZOOM_MIN = 1;
export const AVATAR_ZOOM_MAX = 3;
export const AVATAR_ZOOM_STEP = 0.1;
// Failure codes thrown by the canvas pipeline below; the edit form maps each
// to its own user-facing message instead of guessing from the call site.
export const AVATAR_CANVAS_UNAVAILABLE = "canvas-unavailable";
export const AVATAR_TOO_LARGE = "too-large";
export const AVATAR_DECODE_FAILED = "decode";
const ZOOM_ROUNDING_FACTOR = 1 / AVATAR_ZOOM_STEP;

export type Crop = { x: number; y: number; zoom: number };

export function adjustAvatarZoom(zoom: number, direction: -1 | 1): number {
  const stepped =
    Math.round((zoom + direction * AVATAR_ZOOM_STEP) * ZOOM_ROUNDING_FACTOR) / ZOOM_ROUNDING_FACTOR;
  return Math.max(AVATAR_ZOOM_MIN, Math.min(AVATAR_ZOOM_MAX, stepped));
}

export function cropRect(width: number, height: number, crop: Crop) {
  const size = Math.min(width, height) / crop.zoom;
  return {
    x: ((width - size) * crop.x) / 100,
    y: ((height - size) * crop.y) / 100,
    size,
  };
}

export function panCrop(
  width: number,
  height: number,
  crop: Crop,
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number,
): Crop {
  const size = Math.min(width, height) / crop.zoom;
  const availableX = width - size;
  const availableY = height - size;
  const x = availableX > 0 ? crop.x - (deltaX / viewportWidth) * (size / availableX) * 100 : crop.x;
  const y =
    availableY > 0 ? crop.y - (deltaY / viewportHeight) * (size / availableY) * 100 : crop.y;
  return { ...crop, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
}

export function drawAvatar(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: Crop): void {
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(AVATAR_CANVAS_UNAVAILABLE);
  const rect = cropRect(image.naturalWidth, image.naturalHeight, crop);
  context.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function encodeAvatar(canvas: HTMLCanvasElement): Promise<Blob> {
  // Canvas redraw strips source EXIF. The source project's compression logic
  // inspired the format choice and iterative quality cap; this tiny fixed-size
  // output needs no extra dependency or remote upload.
  const webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const type = webpSupported ? "image/webp" : "image/jpeg";
  for (const quality of [0.9, 0.75, 0.6, 0.45, 0.3]) {
    const blob = await toBlob(canvas, type, quality);
    if (blob && blob.type === type && blob.size <= AVATAR_MAX_OUTPUT_BYTES) return blob;
  }
  throw new Error(AVATAR_TOO_LARGE);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error(AVATAR_DECODE_FAILED));
    reader.onerror = () => reject(new Error(AVATAR_DECODE_FAILED));
    reader.readAsDataURL(blob);
  });
}
