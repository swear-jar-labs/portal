import type { ReadroomAttachment } from "./readrooms";

export const MAX_PREVIEW_BYTES = 256 * 1024;
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "mdx",
  "c",
  "h",
  "cc",
  "cpp",
  "hpp",
  "cs",
  "rs",
  "go",
  "py",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "jsonl",
  "html",
  "htm",
  "css",
  "scss",
  "xml",
  "svg",
  "yaml",
  "yml",
  "toml",
  "ini",
  "conf",
  "sh",
  "bash",
  "zsh",
  "sql",
  "diff",
  "patch",
  "log",
  "csv",
  "tsv",
  "java",
  "kt",
  "rb",
  "php",
]);
const TEXT_FILENAMES = new Set(["dockerfile", "makefile", "license", "readme", ".gitignore"]);
const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/javascript",
  "application/typescript",
  "application/xml",
  "application/yaml",
  "image/svg+xml",
]);
// Formats the viewer never opens: archives, images, audio/video, fonts,
// documents and executables. Anything outside the text and binary lists is
// "unknown" and decided by reading the content (the git/VS Code model).
const BINARY_EXTENSIONS = new Set([
  "zip",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "ico",
  "bmp",
  "mp3",
  "mp4",
  "wav",
  "ogg",
  "avi",
  "mov",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "exe",
  "dll",
  "so",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "sqlite",
  "db",
]);
const BINARY_MIME_PREFIXES = ["image/", "audio/", "video/", "font/"];
const BINARY_MIME_TYPES = new Set([
  "application/octet-stream",
  "application/zip",
  "application/pdf",
  "application/x-executable",
]);
// Reject binary controls while preserving tabs, line breaks and Unicode text.
const BINARY_CONTROLS = /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/;

export type AttachmentPreview =
  { status: "text"; text: string } | { status: "binary" | "tooLarge" | "error" };

export type AttachmentKind = "text" | "binary" | "unknown";

function fileExtension(name: string): string {
  return name.toLowerCase().split(".").at(-1) ?? "";
}

function mimeTypeOf(mimeType: string): string {
  return (mimeType.split(";")[0] ?? "").trim().toLowerCase();
}

/** The filename verdict without reading a byte: a text signal opens the
 * viewer, a binary signal stays a download, "unknown" is decided by the
 * content on open (only local blobs under the preview limit are read). */
export function classifyAttachment(
  attachment: Pick<ReadroomAttachment, "name" | "mimeType">,
): AttachmentKind {
  const name = attachment.name.toLowerCase();
  const extension = fileExtension(attachment.name);
  const mime = mimeTypeOf(attachment.mimeType);
  if (
    mime.startsWith("text/") ||
    TEXT_MIME_TYPES.has(mime) ||
    TEXT_EXTENSIONS.has(extension) ||
    TEXT_FILENAMES.has(name)
  ) {
    return "text";
  }
  if (
    BINARY_MIME_TYPES.has(mime) ||
    BINARY_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
    BINARY_EXTENSIONS.has(extension)
  ) {
    return "binary";
  }
  return "unknown";
}

export function decodePreview(bytes: Uint8Array): AttachmentPreview {
  if (bytes.byteLength > MAX_PREVIEW_BYTES) return { status: "tooLarge" };
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return BINARY_CONTROLS.test(text) ? { status: "binary" } : { status: "text", text };
  } catch {
    return { status: "binary" };
  }
}

export async function readAttachmentPreview(
  attachment: ReadroomAttachment,
  signal: AbortSignal,
): Promise<AttachmentPreview> {
  if (classifyAttachment(attachment) === "binary") return { status: "binary" };
  if (attachment.size > MAX_PREVIEW_BYTES) return { status: "tooLarge" };
  try {
    // Only session-owned blobs are previewed; external source URLs stay links.
    // An "unknown" name is decided here by its bytes, not its ending.
    const response = await fetch(attachment.url, { signal });
    if (!response.ok) return { status: "error" };
    return decodePreview(new Uint8Array(await response.arrayBuffer()));
  } catch {
    return { status: "error" };
  }
}
