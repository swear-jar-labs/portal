import {
  MAX_PROJECT_IMAGE_BYTES,
  MAX_PROJECT_IMAGE_EDGE,
  MAX_PROJECT_IMAGE_INPUT_BYTES,
  PROJECT_IMAGE_TYPES,
} from "./projects";
import { messages } from "@/content/messages";

const START_QUALITY = 0.82;
const QUALITY_STEP = 0.12;
const MIN_QUALITY = 0.34;
const RESIZE_FACTOR = 0.8;
const MAX_ALT_LENGTH = 180;
const MAX_FILENAME_STEM = 100;

// Contract with the editor: prepareProjectImage throws Error with one of these
// messages, and the form maps it to copy.errors. Keep the union in sync.
export const PROJECT_IMAGE_ERRORS = ["type", "size", "decode", "compress"] as const;
export type ProjectImageError = (typeof PROJECT_IMAGE_ERRORS)[number];

export function isProjectImageError(value: unknown): value is ProjectImageError {
  return typeof value === "string" && (PROJECT_IMAGE_ERRORS as readonly string[]).includes(value);
}

export function projectScreenshotAlt(
  projectName: string,
  filename: string,
  number: number,
): string {
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, MAX_FILENAME_STEM);
  const template = stem ? messages.projects.media.namedAlt : messages.projects.media.fallbackAlt;
  return template
    .replace("{project}", projectName.trim())
    .replace("{name}", stem)
    .replace("{number}", String(number))
    .slice(0, MAX_ALT_LENGTH);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode"));
    image.src = url;
  });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("decode"));
    reader.readAsDataURL(blob);
  });
}

/** Downsize before the draft is sent; the object URL is always released. */
export async function prepareProjectImage(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!PROJECT_IMAGE_TYPES.some((type) => type === file.type)) throw new Error("type");
  if (!file.size || file.size > MAX_PROJECT_IMAGE_INPUT_BYTES) throw new Error("size");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(
      1,
      MAX_PROJECT_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("compress");
    while (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      for (let quality = START_QUALITY; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
        const blob = await encode(canvas, quality);
        if (!blob || blob.type !== "image/webp") throw new Error("compress");
        if (blob.size <= MAX_PROJECT_IMAGE_BYTES)
          return { dataUrl: await readDataUrl(blob), width, height };
      }
      if (width <= 320 && height <= 320) break;
      width = Math.max(1, Math.round(width * RESIZE_FACTOR));
      height = Math.max(1, Math.round(height * RESIZE_FACTOR));
    }
    throw new Error("compress");
  } finally {
    URL.revokeObjectURL(url);
  }
}
