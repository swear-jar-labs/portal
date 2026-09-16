import { describe, expect, it } from "vitest";
import { spritePaths } from "../../components/Sprite/paths";
import type { SpriteData } from "../../sprites";

const sprite = (map: readonly string[], palette: Readonly<Record<string, string>>): SpriteData => ({
  map,
  palette,
});

describe("spritePaths", () => {
  it("merges horizontal runs of one color into a single path", () => {
    const paths = spritePaths(sprite(["QQQ"], { Q: "#FFFFFF" }));
    expect(paths).toEqual([{ fill: "#FFFFFF", outline: false, d: "M0 0h3v1H0z" }]);
  });

  it("splits runs on transparent pixels", () => {
    const paths = spritePaths(sprite(["Q.Q"], { Q: "#FFFFFF" }));
    expect(paths.map((path) => path.d)).toEqual(["M0 0h1v1H0zM2 0h1v1H2z"]);
  });

  it("turns black on the silhouette edge into the outline", () => {
    const paths = spritePaths(sprite(["KQK"], { K: "#000000", Q: "#FFFFFF" }));
    const outline = paths.find((path) => path.outline);
    expect(outline).toEqual({ fill: "#000000", outline: true, d: "M0 0h1v1H0zM2 0h1v1H2z" });
  });

  it("keeps black inside the shape literal", () => {
    const paths = spritePaths(sprite(["QQQ", "QKQ", "QQQ"], { K: "#000000", Q: "#FFFFFF" }));
    const literal = paths.find((path) => path.fill === "#000000");
    expect(literal?.outline).toBe(false);
    expect(literal?.d).toBe("M1 1h1v1H1z");
  });
});
