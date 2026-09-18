import { describe, expect, it } from "vitest";
import {
  actionCommandIds,
  commandById,
  commandIdForPath,
  commands,
  fileGroupsFor,
  fileTitle,
  HOME_PATH,
  isActionCommand,
  keyDefsFor,
  menuDefsFor,
  visibleCommands,
} from "@/content/commands";
import { docs } from "@/content/docs";
import { messages } from "@/content/messages";

const SESSIONS = [false, true] as const;

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

  it("resolves every command referenced by the menus in both sessions", () => {
    for (const signedIn of SESSIONS) {
      const menuDefs = menuDefsFor(signedIn);
      const referenced = menuDefs.flatMap((menu) =>
        menu.entries.flatMap((entry) => (entry.kind === "command" ? [entry.command] : [])),
      );
      expect(referenced.length).toBeGreaterThan(0);
      for (const id of referenced) {
        expect(commandById.has(id), `menu references unknown command ${id}`).toBe(true);
      }
    }
  });

  it("keeps menus free of dangling separators in both sessions", () => {
    for (const signedIn of SESSIONS) {
      for (const menu of menuDefsFor(signedIn)) {
        expect(menu.entries.at(0)?.kind, `${menu.id} starts with a separator`).not.toBe(
          "separator",
        );
        expect(menu.entries.at(-1)?.kind, `${menu.id} ends with a separator`).not.toBe("separator");
      }
    }
  });

  it("resolves every command referenced by the function keys in both sessions", () => {
    for (const signedIn of SESSIONS) {
      for (const def of keyDefsFor(signedIn)) {
        expect(
          commandById.has(def.command),
          `key ${def.key} references unknown ${def.command}`,
        ).toBe(true);
      }
    }
  });

  it("keeps function keys unique in each session", () => {
    for (const signedIn of SESSIONS) {
      const keys = keyDefsFor(signedIn).map((def) => def.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("swaps the account keys with the session", () => {
    const accountKeys = (signedIn: boolean) =>
      keyDefsFor(signedIn)
        .filter((def) => def.key === "F8" || def.key === "F9")
        .map((def) => def.command);
    expect(accountKeys(false)).toEqual(["APPLY", "LOGON"]);
    expect(accountKeys(true)).toEqual(["PROFILE", "LOGOFF"]);
  });

  it("resolves every command referenced by the file groups in both sessions", () => {
    for (const signedIn of SESSIONS) {
      for (const group of fileGroupsFor(signedIn)) {
        for (const item of group.items) {
          expect(commandById.has(item.command), `file ${item.name} has no command`).toBe(true);
          expect(commandById.get(item.command)?.file).toEqual({
            group: group.id,
            name: item.name,
            ext: item.ext,
            size: item.size,
            icon: item.icon,
          });
        }
      }
    }
  });

  it("lists every visible command with file metadata exactly once", () => {
    for (const signedIn of SESSIONS) {
      const filed = visibleCommands(signedIn)
        .filter((command) => command.file)
        .map((command) => command.id);
      const listed = fileGroupsFor(signedIn).flatMap((group) =>
        group.items.map((item) => item.command),
      );
      expect([...listed].sort()).toEqual([...filed].sort());
    }
  });

  it("gives every program an icon and leaves documents on the sheet", () => {
    for (const signedIn of SESSIONS) {
      for (const group of fileGroupsFor(signedIn)) {
        for (const item of group.items) {
          const file = `${item.name}.${item.ext}`;
          if (item.ext === "EXE") {
            expect(item.icon, `${file} is a program without an icon`).toBeDefined();
          } else {
            expect(item.icon, `${file} is a document with its own icon`).toBeUndefined();
          }
        }
      }
    }
  });

  it("keeps the expected file summary (3 DIRS, 11 FILES as guest, 12 as member)", () => {
    const count = (signedIn: boolean) => {
      const groups = fileGroupsFor(signedIn);
      expect(groups).toHaveLength(3);
      return groups.reduce((total, group) => total + group.items.length, 0);
    };
    expect(count(false)).toBe(11);
    expect(count(true)).toBe(12);
  });

  it("shows the account files of one session only", () => {
    const guestFiles = fileGroupsFor(false).flatMap((group) =>
      group.items.map((item) => item.command),
    );
    const memberFiles = fileGroupsFor(true).flatMap((group) =>
      group.items.map((item) => item.command),
    );
    expect(guestFiles).toContain("APPLY");
    expect(guestFiles).toContain("LOGON");
    expect(guestFiles).not.toContain("PROFILE");
    expect(guestFiles).not.toContain("SETTINGS");
    expect(guestFiles).not.toContain("LOGOFF");

    expect(memberFiles).toContain("PROFILE");
    expect(memberFiles).toContain("SETTINGS");
    expect(memberFiles).toContain("LOGOFF");
    expect(memberFiles).not.toContain("APPLY");
    expect(memberFiles).not.toContain("LOGON");
  });

  it("resolves every doc command to a document", () => {
    for (const command of commands) {
      if (!command.doc) continue;
      const doc = docs.find((entry) => entry.id === command.doc);
      expect(doc, `${command.id} references missing doc ${command.doc}`).toBeDefined();
      if (command.file && doc) {
        expect(doc.title, `${command.id} doc title must mirror the file entry`).toBe(
          `${command.file.name}.${command.file.ext}`,
        );
      }
    }
  });

  it("uses absolute in-app hrefs", () => {
    for (const command of commands) {
      if (!command.href) continue;
      expect(command.href.startsWith("/"), `${command.id} href must start with /`).toBe(true);
    }
  });

  it("keeps hidden commands out of the surfaces", () => {
    for (const signedIn of SESSIONS) {
      const visibleIds = new Set(visibleCommands(signedIn).map((command) => command.id));
      const listed = fileGroupsFor(signedIn).flatMap((group) =>
        group.items.map((item) => item.command),
      );
      for (const id of listed) {
        expect(visibleIds.has(id), `hidden command ${id} must not appear as a file`).toBe(true);
      }
    }
  });

  it("derives panel titles from the file metadata", () => {
    expect(fileTitle("APPLY")).toBe("APPLY.EXE");
    expect(fileTitle("ABOUT")).toBe("ABOUT.TXT");
    expect(fileTitle("COFFEE")).toBe("COFFEE");
  });

  it("maps routes to their section command", () => {
    expect(commandIdForPath("/discussions")).toBe("DISCUSSIONS");
    // ERRATA is a board of the feed, not a route of its own.
    expect(commandIdForPath("/errata")).toBeUndefined();
    expect(commandIdForPath("/readroom")).toBe("READROOM");
    expect(commandIdForPath("/products")).toBe("PRODUCTS");
    expect(commandIdForPath("/tickets")).toBe("TICKETS");
    expect(commandIdForPath("/apply")).toBe("APPLY");
    expect(commandIdForPath("/login")).toBe("LOGON");
    expect(commandIdForPath("/profile")).toBe("PROFILE");
    expect(commandIdForPath("/settings")).toBe("SETTINGS");
    expect(commandIdForPath(HOME_PATH)).toBeUndefined();
    expect(commandIdForPath("/unknown")).toBeUndefined();
  });

  it("maps deep routes to their section command by segment boundary", () => {
    expect(commandIdForPath("/discussions/3f2a1c")).toBe("DISCUSSIONS");
    expect(commandIdForPath("/discussions/3f2a1c/")).toBe("DISCUSSIONS");
    expect(commandIdForPath("/discussions-archive")).toBeUndefined();
    expect(commandIdForPath("/readroom/2026/05")).toBe("READROOM");
  });

  it("keeps every route owned by a single command", () => {
    const hrefs = commands.flatMap((command) => (command.href ? [command.href] : []));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps action commands free of routes and documents", () => {
    for (const id of actionCommandIds) {
      const command = commandById.get(id);
      expect(command, `${id} is an action and must exist`).toBeDefined();
      expect(command?.href, `${id} is an action and must not have href`).toBeUndefined();
      expect(command?.doc, `${id} is an action and must not have doc`).toBeUndefined();
    }
  });

  it("never marks a routed or doc command as an action", () => {
    for (const command of commands) {
      if (command.href || command.doc) {
        expect(isActionCommand(command.id), `${command.id} must not be an action`).toBe(false);
      }
    }
    expect(isActionCommand("LOGOFF")).toBe(true);
    expect(isActionCommand("ABOUT")).toBe(false);
  });
});
