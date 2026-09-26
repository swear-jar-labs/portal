import { describe, expect, it } from "vitest";
import { adjustAvatarZoom, cropRect, panCrop } from "@/features/account/avatar-image";

describe("avatar crop", () => {
  it("moves the source image under a square viewport and clamps to its edges", () => {
    const initial = { x: 50, y: 50, zoom: 1 };
    const dragged = panCrop(400, 200, initial, 100, 20, 200, 200);
    expect(dragged).toEqual({ x: 0, y: 50, zoom: 1 });
    expect(cropRect(400, 200, dragged)).toEqual({ x: 0, y: 0, size: 200 });
    expect(panCrop(400, 200, dragged, -1000, 0, 200, 200).x).toBe(100);
  });

  it("unlocks both axes after zooming a square image", () => {
    const crop = panCrop(200, 200, { x: 50, y: 50, zoom: 2 }, -50, 50, 200, 200);
    expect(cropRect(200, 200, crop)).toEqual({ x: 75, y: 25, size: 100 });
  });

  it("steps zoom without drift and stops at the slider limits", () => {
    expect(adjustAvatarZoom(1.1, 1)).toBe(1.2);
    expect(adjustAvatarZoom(3, 1)).toBe(3);
    expect(adjustAvatarZoom(1, -1)).toBe(1);
  });
});
