import { z } from "zod";
import { techIds } from "@/content/techs";
import {
  MAX_PROJECT_IMAGE_BYTES,
  MAX_PROJECT_IMAGE_EDGE,
  MAX_PROJECT_SCREENSHOTS,
  PROJECT_IMAGE_TYPES,
  type Project,
  type ProjectScreenshot,
} from "./projects";

const MAX_NAME = 80;
const MAX_DESCRIPTION = 4000;
const MAX_CONTRIBUTORS = 2000;
const MAX_REPO_URL = 500;
const MAX_ALT = 180;
const MAX_TECHS = 10;
const DATA_URL = /^data:(image\/jpeg|image\/png|image\/webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_PREFIX = "RIFF";
const WEBP_MARK = "WEBP";
const WEBP_MARK_OFFSET = 8;
const WEBP_MIN_BYTES = 12;

export const projectContentSchema = z.object({
  slug: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().trim().min(2).max(MAX_NAME),
  description: z.string().trim().min(20).max(MAX_DESCRIPTION),
  techs: z
    .array(z.enum(techIds))
    .max(MAX_TECHS)
    .refine((items) => new Set(items).size === items.length),
  contributors: z.string().trim().max(MAX_CONTRIBUTORS),
  repoUrl: z.union([z.literal(""), z.httpUrl().max(MAX_REPO_URL)]),
  screenshots: z
    .array(
      z.object({
        id: z.uuid(),
        alt: z.string().trim().min(1).max(MAX_ALT),
        dataUrl: z.string().optional(),
        width: z.number().int().min(1).max(MAX_PROJECT_IMAGE_EDGE).optional(),
        height: z.number().int().min(1).max(MAX_PROJECT_IMAGE_EDGE).optional(),
      }),
    )
    .max(MAX_PROJECT_SCREENSHOTS)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length),
});

export type ProjectContentInput = z.infer<typeof projectContentSchema>;
export type ProjectContentError = "forbidden" | "missing" | "conflict" | "invalid";
export type ProjectContentResult =
  { ok: true; project: Project } | { ok: false; error: ProjectContentError };

/** Checks encoded size and file signature; only raster formats reach the mock store. */
export function validProjectImage(dataUrl: string): boolean {
  const match = DATA_URL.exec(dataUrl);
  if (!match || !match[2] || !PROJECT_IMAGE_TYPES.some((type) => type === match[1])) return false;
  // Isomorphic on purpose: this module is also bundled into the client editor,
  // so no Node-only Buffer here — atob/btoa exist in browsers and in Node 16+.
  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    return false;
  }
  if (!binary.length || binary.length > MAX_PROJECT_IMAGE_BYTES) return false;
  try {
    if (btoa(binary) !== match[2]) return false;
  } catch {
    return false;
  }
  if (match[1] === "image/png")
    return (
      binary.length >= PNG_SIGNATURE.length &&
      PNG_SIGNATURE.every((byte, index) => binary.charCodeAt(index) === byte)
    );
  if (match[1] === "image/jpeg")
    return (
      binary.length >= JPEG_SIGNATURE.length &&
      JPEG_SIGNATURE.every((byte, index) => binary.charCodeAt(index) === byte)
    );
  return (
    binary.length >= WEBP_MIN_BYTES &&
    binary.slice(0, RIFF_PREFIX.length) === RIFF_PREFIX &&
    binary.slice(WEBP_MARK_OFFSET, WEBP_MARK_OFFSET + WEBP_MARK.length) === WEBP_MARK
  );
}

export function resolveProjectScreenshots(
  current: readonly ProjectScreenshot[],
  requested: ProjectContentInput["screenshots"],
): ProjectScreenshot[] | null {
  const known = new Map(current.map((item) => [item.id, item]));
  const result: ProjectScreenshot[] = [];
  for (const item of requested) {
    const existing = known.get(item.id);
    if (existing) {
      if (item.dataUrl !== undefined || item.width !== undefined || item.height !== undefined)
        return null;
      result.push({ ...existing, alt: item.alt });
    } else {
      if (!item.dataUrl || !item.width || !item.height || !validProjectImage(item.dataUrl))
        return null;
      result.push({
        id: item.id,
        alt: item.alt,
        src: item.dataUrl,
        width: item.width,
        height: item.height,
      });
    }
  }
  return result;
}
