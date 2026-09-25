import { describe, expect, it } from "vitest";
import { resolveShellAddons } from "@/features/shell/addons";

describe("resolveShellAddons", () => {
  it("keeps tray entries in composition order and skips addons without one", () => {
    const { tray } = resolveShellAddons([
      { id: "first", tray: "one" },
      { id: "icons-only", fileIcons: { INBOX: "mail" } },
      { id: "third", tray: "three" },
    ]);

    expect(tray).toEqual([
      { id: "first", node: "one" },
      { id: "third", node: "three" },
    ]);
  });

  it("merges file icons with later addons winning the same command", () => {
    const first = { id: "first", fileIcons: { INBOX: "old", PROFILE: "person" } };
    const { fileIcons } = resolveShellAddons([
      first,
      { id: "second", fileIcons: { INBOX: "new" } },
    ]);

    expect(fileIcons).toEqual({ INBOX: "new", PROFILE: "person" });
    expect(first.fileIcons).toEqual({ INBOX: "old", PROFILE: "person" });
  });

  it("returns empty surfaces without addons", () => {
    expect(resolveShellAddons(undefined)).toEqual({ tray: [], fileIcons: {} });
  });
});
