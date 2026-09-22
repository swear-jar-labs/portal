import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyAttachment,
  decodePreview,
  MAX_PREVIEW_BYTES,
  readAttachmentPreview,
} from "@/features/readroom/attachment-preview";
import { attachmentsFromFiles, releaseAttachments } from "@/features/readroom/attachments";
import type { ReadroomAttachment } from "@/features/readroom/readrooms";

const attachment: ReadroomAttachment = {
  id: "file",
  name: "test.ts",
  size: 4,
  mimeType: "",
  url: "blob:mock/test",
};
const signal = () => new AbortController().signal;
afterEach(() => vi.restoreAllMocks());

describe("attachment preview", () => {
  it.each([
    "snippet.c",
    "component.TSX",
    "README",
    "Dockerfile",
    ".gitignore",
    "file.md",
    "file.html",
  ])("recognises text by filename: %s", (name) => {
    expect(classifyAttachment({ name, mimeType: "" })).toBe("text");
  });
  it("uses a text MIME and keeps binary formats as downloads", () => {
    expect(classifyAttachment({ name: "unknown", mimeType: "text/plain; charset=utf-8" })).toBe(
      "text",
    );
    expect(classifyAttachment({ name: "data", mimeType: "application/json" })).toBe("text");
    for (const name of ["archive.zip", "photo.png", "document.pdf", "binary"]) {
      expect(classifyAttachment({ name, mimeType: "application/octet-stream" })).toBe("binary");
    }
  });
  it("leaves undecided names to the content sniff and pins archives as binary", () => {
    for (const name of ["notes", "CHANGELOG", "LICENSE-MIT", "Makefile.am"]) {
      expect(classifyAttachment({ name, mimeType: "" })).toBe("unknown");
    }
    for (const name of ["archive.tar.gz", "backup.tgz", "photo.png", "paper.pdf", "app.mp3"]) {
      expect(classifyAttachment({ name, mimeType: "" })).toBe("binary");
    }
    expect(classifyAttachment({ name: "notes", mimeType: "text/plain" })).toBe("text");
  });
  it("sniffs unknown content on open instead of refusing it", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("plain notes"));
    expect(
      await readAttachmentPreview({ ...attachment, name: "notes", mimeType: "" }, signal()),
    ).toEqual({ status: "text", text: "plain notes" });
    fetch.mockResolvedValueOnce(new Response(new Uint8Array([65, 0, 66])));
    expect(
      await readAttachmentPreview({ ...attachment, name: "blob", mimeType: "" }, signal()),
    ).toEqual({ status: "binary" });
  });
  it("preserves literal markup, whitespace, empty files and Unicode", () => {
    const text = '<script>alert("no")</script>\n\tКод 🐈\r\n';
    expect(decodePreview(new TextEncoder().encode(text))).toEqual({ status: "text", text });
    expect(decodePreview(new Uint8Array())).toEqual({ status: "text", text: "" });
  });
  it("rejects binary data masquerading as text and invalid UTF-8", () => {
    expect(decodePreview(new Uint8Array([65, 0, 66]))).toEqual({ status: "binary" });
    expect(decodePreview(new Uint8Array([255, 254]))).toEqual({ status: "binary" });
  });
  it("guards the boundary before reading and again before rendering", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(
      await readAttachmentPreview({ ...attachment, size: MAX_PREVIEW_BYTES + 1 }, signal()),
    ).toEqual({ status: "tooLarge" });
    expect(await readAttachmentPreview({ ...attachment, name: "a.zip" }, signal())).toEqual({
      status: "binary",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(decodePreview(new Uint8Array(MAX_PREVIEW_BYTES + 1))).toEqual({ status: "tooLarge" });
    expect(decodePreview(new TextEncoder().encode("a".repeat(MAX_PREVIEW_BYTES)))).toMatchObject({
      status: "text",
    });
  });
  it("reads a blob and handles unavailable or revoked files", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("code"));
    expect(await readAttachmentPreview(attachment, signal())).toEqual({
      status: "text",
      text: "code",
    });
    fetch.mockRejectedValueOnce(new TypeError("revoked"));
    expect(await readAttachmentPreview(attachment, signal())).toEqual({ status: "error" });
    fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await readAttachmentPreview(attachment, signal())).toEqual({ status: "error" });
  });
  it("owns blob creation and releases only the passed files", () => {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock/file");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const files = attachmentsFromFiles([new File(["code"], "file.c", { type: "text/plain" })]);
    expect(files[0]).toMatchObject({
      name: "file.c",
      size: 4,
      mimeType: "text/plain",
      url: "blob:mock/file",
    });
    expect(create).toHaveBeenCalledOnce();
    releaseAttachments(files);
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:mock/file");
  });
});
