import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KeyBar } from "../../components/KeyBar/KeyBar";

describe("KeyBar", () => {
  it("keeps unavailable actions visible as native disabled buttons", () => {
    const html = renderToStaticMarkup(
      <KeyBar
        items={[
          { key: "F6", label: "Inbox", disabled: true },
          { key: "F7", label: "Search", disabled: false },
        ]}
      />,
    );
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*><b[^>]*>F6<\/b>Inbox<\/button>/);
    expect(html).toMatch(/<button(?:(?!disabled)[^>])*><b[^>]*>F7<\/b>Search<\/button>/);
  });
});
