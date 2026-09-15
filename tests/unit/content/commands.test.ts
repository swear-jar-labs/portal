import { describe, expect, it } from "vitest";
import { commandById, commands, fileGroups, keyDefs, menuDefs } from "@/content/commands";
import { docsById } from "@/content/landing";
import { messages } from "@/content/messages";

describe("commands content", () => {
  it("keeps command ids unique", () => {
    const ids = commands.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps registry texts in sync with the command ids", () => {
    const described = Object.keys(messages.shell.registry.descriptions).sort();
    const ids = commands.map((command) => command.id).sort();
    expect(described).toEqual(ids);
    for (const command of commands) {
      expect(command.description).toBe(messages.shell.registry.descriptions[command.id]);
    }
  });

  it("resolves every command referenced by the menu", () => {
    const referenced = menuDefs.flatMap((menu) =>
      menu.entries.flatMap((entry) => (entry.kind === "command" ? [entry.command] : [])),
    );
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) {
      expect(commandById.has(id), `menu references unknown command ${id}`).toBe(true);
    }
  });

  it("resolves every command referenced by the function keys", () => {
    for (const def of keyDefs) {
      expect(commandById.has(def.command), `key ${def.key} references unknown ${def.command}`).toBe(
        true,
      );
    }
  });

  it("resolves every command referenced by the file groups", () => {
    for (const group of fileGroups) {
      for (const item of group.items) {
        expect(commandById.has(item.command), `file ${item.name} has no command`).toBe(true);
        expect(commandById.get(item.command)?.file).toEqual({
          group: group.id,
          name: item.name,
          ext: item.ext,
          size: item.size,
        });
      }
    }
  });

  it("lists every command with file metadata exactly once", () => {
    const filed = commands.filter((command) => command.file).map((command) => command.id);
    const listed = fileGroups.flatMap((group) => group.items.map((item) => item.command));
    expect([...listed].sort()).toEqual([...filed].sort());
  });

  it("keeps the expected file summary (3 DIRS, 13 FILES)", () => {
    expect(fileGroups).toHaveLength(3);
    expect(fileGroups.reduce((total, group) => total + group.items.length, 0)).toBe(13);
  });

  it("resolves every doc command to a document", () => {
    for (const command of commands) {
      if (!command.doc) continue;
      expect(
        docsById[command.doc],
        `${command.id} references missing doc ${command.doc}`,
      ).toBeDefined();
    }
  });

  it("uses absolute in-app hrefs", () => {
    for (const command of commands) {
      if (!command.href) continue;
      expect(command.href.startsWith("/"), `${command.id} href must start with /`).toBe(true);
    }
  });

  it("keeps hidden commands out of the surfaces", () => {
    const visibleIds = new Set(commands.filter((command) => !command.hidden).map((c) => c.id));
    const listed = fileGroups.flatMap((group) => group.items.map((item) => item.command));
    for (const id of listed) {
      expect(visibleIds.has(id), `hidden command ${id} must not appear as a file`).toBe(true);
    }
  });
});
