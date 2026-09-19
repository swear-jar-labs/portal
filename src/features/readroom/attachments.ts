import type { ReadroomAttachment } from "./readrooms";

// The mock storage for attached files: a picked file becomes a blob URL that
// lives one SPA session and dies with the reload — nothing is uploaded yet
// (attachments-viewer brings the real storage). The slice's blob URLs are born
// and revoked only here.

const LOCAL_FILE_ID_PREFIX = "local-file-";

export function attachmentsFromFiles(files: Iterable<File>): ReadroomAttachment[] {
  return Array.from(files, (file) => ({
    id: `${LOCAL_FILE_ID_PREFIX}${crypto.randomUUID()}`,
    name: file.name,
    size: file.size,
    url: URL.createObjectURL(file),
  }));
}

export function releaseAttachments(attachments: readonly ReadroomAttachment[]): void {
  for (const attachment of attachments) URL.revokeObjectURL(attachment.url);
}
