import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";

describe("SegmentedControl", () => {
  it("links tabs to panels and leaves one tab in the Tab order", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        mode="tabs"
        label="Review queues"
        options={[
          { value: "members", label: "Members", id: "tab-members", panelId: "panel-members" },
          { value: "projects", label: "Projects", id: "tab-projects", panelId: "panel-projects" },
        ]}
        value="members"
        onChange={() => {}}
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(
      /id="tab-members"[^>]*role="tab"[^>]*aria-selected="true"[^>]*aria-controls="panel-members"[^>]*tabindex="0"/,
    );
    expect(html).toMatch(
      /id="tab-projects"[^>]*role="tab"[^>]*aria-selected="false"[^>]*aria-controls="panel-projects"[^>]*tabindex="-1"/,
    );
  });

  it("exposes a button group when switching a mode within one editor", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        mode="buttons"
        label="Editor mode"
        options={[
          { value: "write", label: "WRITE" },
          { value: "preview", label: "PREVIEW" },
        ]}
        value="write"
        onChange={() => {}}
      />,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Editor mode"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('role="tab"');
  });
});
