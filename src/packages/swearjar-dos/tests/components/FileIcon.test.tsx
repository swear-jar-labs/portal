import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FILE_ICON_ATTR, FileIcon } from "../../components/FileTable/FileIcon";

describe("FileIcon", () => {
  it("carries the sprite name as a data attribute", () => {
    expect(renderToStaticMarkup(<FileIcon kind="exe" icon="book" />)).toContain(
      `${FILE_ICON_ATTR}="book"`,
    );
  });

  it("marks directories by their expansion state", () => {
    expect(renderToStaticMarkup(<FileIcon kind="dir" />)).toContain(`${FILE_ICON_ATTR}="folder"`);
    expect(renderToStaticMarkup(<FileIcon kind="dir" expanded />)).toContain(
      `${FILE_ICON_ATTR}="folderOpen"`,
    );
  });

  it("falls back to the sheet for documents and the gear for programs", () => {
    expect(renderToStaticMarkup(<FileIcon kind="file" />)).toContain(`${FILE_ICON_ATTR}="file"`);
    expect(renderToStaticMarkup(<FileIcon kind="exe" />)).toContain(`${FILE_ICON_ATTR}="gear"`);
  });
});
