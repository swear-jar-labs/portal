import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../../components/Checkbox/Checkbox";

describe("Checkbox", () => {
  it("reflects the checked state and associates the label", () => {
    const html = renderToStaticMarkup(
      <Checkbox label="Enabled" name="screensaver" checked onChange={() => {}} />,
    );
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>Enabled<\/label>/);
    expect(html).toMatch(/<input[^>]*id="[^"]+"/);
  });

  it("renders unchecked without the checked attribute", () => {
    const html = renderToStaticMarkup(
      <Checkbox label="Enabled" name="screensaver" checked={false} onChange={() => {}} />,
    );
    expect(html).not.toContain("checked");
  });
});
