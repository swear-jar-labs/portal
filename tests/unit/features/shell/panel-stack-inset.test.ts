import { describe, expect, it } from "vitest";
import { panelStackInset } from "@/features/shell/PanelStack/inset";

describe("panel stack inset", () => {
  it("adds one title-bar offset for every preceding layer", () => {
    expect(panelStackInset(0)).toBe("0px");
    expect(panelStackInset(2)).toBe("calc(var(--dos-panel-stack-offset) * 2)");
  });
});
