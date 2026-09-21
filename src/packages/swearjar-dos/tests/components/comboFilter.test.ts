import { describe, expect, it } from "vitest";
import { filterComboOptions, MAX_SUGGESTIONS } from "../../components/ComboBox/filter";

const OPTIONS = [
  { value: "CMP-1", label: "CMP-1", hint: "First pass" },
  { value: "CMP-2", label: "CMP-2", hint: "Pretty printer" },
  { value: "DOS-3", label: "DOS-3", hint: "Table contract" },
];

describe("filterComboOptions", () => {
  it("returns every option on an empty query", () => {
    expect(filterComboOptions(OPTIONS, "")).toEqual(OPTIONS);
    expect(filterComboOptions(OPTIONS, "   ")).toEqual(OPTIONS);
  });

  it("matches the key case-insensitively", () => {
    expect(filterComboOptions(OPTIONS, "cmp-2").map((option) => option.value)).toEqual(["CMP-2"]);
    expect(filterComboOptions(OPTIONS, "dos").map((option) => option.value)).toEqual(["DOS-3"]);
  });

  it("matches the hint (the ticket title)", () => {
    expect(filterComboOptions(OPTIONS, "printer").map((option) => option.value)).toEqual(["CMP-2"]);
  });

  it("caps the list at the suggestion limit", () => {
    const many = Array.from({ length: MAX_SUGGESTIONS + 5 }, (_, index) => ({
      value: `T-${index}`,
      label: `T-${index}`,
    }));
    expect(filterComboOptions(many, "")).toHaveLength(MAX_SUGGESTIONS);
    expect(filterComboOptions(many, "t-")).toHaveLength(MAX_SUGGESTIONS);
  });
});
