import { describe, expect, it } from "vitest";
import { resolveCommand } from "@swearjar/dos";
import {
  actionCommandIds,
  commandById,
  commandIdForLocation,
  commandIdForPath,
  commands,
  ERRATA_HREF,
  fileGroupsFor,
  fileTitle,
  HOME_PATH,
  isActionCommand,
  joinLocation,
  keyDefsFor,
  loginHref,
  LOGIN_PATH,
  menuDefsFor,
  parseLoginReturn,
  visibleCommands,
  type Viewer,
} from "@/content/commands";
import { docs } from "@/content/docs";
import { messages } from "@/content/messages";

const VIEWERS: Viewer[] = [null, { level: "participant" }, { level: "member" }];

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
    for (const viewer of VIEWERS) {
      const menuDefs = menuDefsFor(viewer);
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
    for (const viewer of VIEWERS) {
      for (const menu of menuDefsFor(viewer)) {
        expect(menu.entries.at(0)?.kind, `${menu.id} starts with a separator`).not.toBe(
          "separator",
        );
        expect(menu.entries.at(-1)?.kind, `${menu.id} ends with a separator`).not.toBe("separator");
      }
    }
  });

  it("resolves every command referenced by the function keys in both sessions", () => {
    for (const viewer of VIEWERS) {
      for (const def of keyDefsFor(viewer)) {
        expect(
          commandById.has(def.command),
          `key ${def.key} references unknown ${def.command}`,
        ).toBe(true);
      }
    }
  });

  it("keeps function keys unique in each session", () => {
    for (const viewer of VIEWERS) {
      const keys = keyDefsFor(viewer).map((def) => def.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("swaps the account keys with the session", () => {
    const accountKeys = (viewer: Viewer) =>
      keyDefsFor(viewer)
        .filter((def) => def.key === "F8" || def.key === "F9")
        .map((def) => def.command);
    expect(accountKeys(null)).toEqual(["REGISTER", "LOGON"]);
    expect(accountKeys({ level: "participant" })).toEqual(["PROFILE", "LOGOFF"]);
    expect(accountKeys({ level: "member" })).toEqual(["PROFILE", "LOGOFF"]);
  });

  it("resolves every command referenced by the file groups in both sessions", () => {
    for (const viewer of VIEWERS) {
      for (const group of fileGroupsFor(viewer)) {
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
    for (const viewer of VIEWERS) {
      const filed = visibleCommands(viewer)
        .filter((command) => command.file)
        .map((command) => command.id);
      const listed = fileGroupsFor(viewer).flatMap((group) =>
        group.items.map((item) => item.command),
      );
      expect([...listed].sort()).toEqual([...filed].sort());
    }
  });

  it("gives every program an icon and leaves documents on the sheet", () => {
    for (const viewer of VIEWERS) {
      for (const group of fileGroupsFor(viewer)) {
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

  it("keeps the expected file summary (3 DIRS, 11 FILES as guest, 14 as participant, 13 as member)", () => {
    const count = (viewer: Viewer) => {
      const groups = fileGroupsFor(viewer);
      expect(groups).toHaveLength(3);
      return groups.reduce((total, group) => total + group.items.length, 0);
    };
    expect(count(null)).toBe(11);
    expect(count({ level: "participant" })).toBe(14);
    expect(count({ level: "member" })).toBe(13);
  });

  it("names the COMMUNITY, ACCOUNT and GUIDE groups in order", () => {
    for (const viewer of VIEWERS) {
      expect(fileGroupsFor(viewer).map((group) => group.short)).toEqual([
        "COMMUNITY",
        "ACCOUNT",
        "GUIDE",
      ]);
    }
    const guest = fileGroupsFor(null);
    expect(guest[0]?.items.map((item) => item.command)).toEqual([
      "FORUM",
      "ERRATA",
      "READROOM",
      "PROJECTS",
      "TICKETS",
    ]);
    expect(guest[2]?.items.map((item) => item.command)).toEqual([
      "ABOUT",
      "HOW",
      "MANIFESTO",
      "RULES",
    ]);
  });

  it("opens ERRATA on the errata board of the existing feed", () => {
    const errata = commandById.get("ERRATA");
    expect(errata?.href).toBe(ERRATA_HREF);
    expect(errata?.href).toBe("/forum?board=errata");
    expect(errata?.file).toEqual({
      group: "board",
      name: "ERRATA",
      ext: "EXE",
      size: 1024,
      icon: "errata",
    });
    expect(isActionCommand("ERRATA")).toBe(false);
    for (const viewer of VIEWERS) {
      expect(visibleCommands(viewer).map((command) => command.id)).toContain("ERRATA");
    }
  });

  it("names the FORUM file after the section", () => {
    const forum = commandById.get("FORUM");
    expect(forum?.href).toBe("/forum");
    expect(forum?.file?.name).toBe("FORUM");
    expect(forum?.file?.ext).toBe("EXE");
    expect(fileTitle("FORUM")).toBe("FORUM.EXE");
    expect(fileTitle("ERRATA")).toBe("ERRATA.EXE");
  });

  it("resolves typed FORUM and ERRATA and forgets DISCUSSIONS", () => {
    expect(resolveCommand(commands, "forum")?.id).toBe("FORUM");
    expect(resolveCommand(commands, "errata")?.id).toBe("ERRATA");
    expect(resolveCommand(commands, "discussions")).toBeUndefined();
  });

  it("keeps the top menu at COMMUNITY, ACCOUNT, GUIDE and HELP", () => {
    for (const viewer of VIEWERS) {
      expect(menuDefsFor(viewer).map((menu) => menu.label)).toEqual([
        "Community",
        "Account",
        "Guide",
        "Help",
      ]);
    }
    const entryCommands = (menuId: string, viewer: Viewer) =>
      menuDefsFor(viewer)
        .find((menu) => menu.id === menuId)
        ?.entries.flatMap((entry) => (entry.kind === "command" ? [entry.command] : []));
    for (const viewer of VIEWERS) {
      expect(entryCommands("file", viewer)).toEqual(["ABOUT", "HOW", "MANIFESTO", "RULES"]);
      expect(entryCommands("board", viewer)).toEqual([
        "FORUM",
        "ERRATA",
        "READROOM",
        "PROJECTS",
        "TICKETS",
      ]);
      expect(entryCommands("help", viewer)).toEqual(["HELP", "COFFEE"]);
    }
    expect(entryCommands("account", null)).toEqual(["LOGON", "REGISTER"]);
    expect(entryCommands("account", { level: "participant" })).toEqual([
      "APPLY",
      "INBOX",
      "PROFILE",
      "SETTINGS",
      "LOGOFF",
    ]);
    expect(entryCommands("account", { level: "member" })).toEqual([
      "INBOX",
      "PROFILE",
      "SETTINGS",
      "LOGOFF",
    ]);
  });

  it("removes the STATUS command and leaves F7 unassigned in both sessions", () => {
    expect(resolveCommand(commands, "status")).toBeUndefined();
    expect(docs.map((doc) => doc.id)).not.toContain("STATUS");
    for (const viewer of VIEWERS) {
      expect(keyDefsFor(viewer).map((def) => def.key)).not.toContain("F7");
      expect(
        fileGroupsFor(viewer).flatMap((group) => group.items.map((item) => item.command)),
      ).not.toContain("STATUS");
    }
  });

  it("shows the account files of one session only", () => {
    const filesFor = (viewer: Viewer) =>
      fileGroupsFor(viewer).flatMap((group) => group.items.map((item) => item.command));
    const guestFiles = filesFor(null);
    const participantFiles = filesFor({ level: "participant" });
    const memberFiles = filesFor({ level: "member" });
    expect(guestFiles).toContain("REGISTER");
    expect(guestFiles).toContain("LOGON");
    expect(guestFiles).not.toContain("APPLY");
    expect(guestFiles).not.toContain("INBOX");
    expect(guestFiles).not.toContain("PROFILE");
    expect(guestFiles).not.toContain("SETTINGS");
    expect(guestFiles).not.toContain("LOGOFF");

    expect(participantFiles).toContain("APPLY");
    expect(participantFiles).toContain("INBOX");
    expect(participantFiles).toContain("PROFILE");
    expect(participantFiles).toContain("SETTINGS");
    expect(participantFiles).toContain("LOGOFF");
    expect(participantFiles).not.toContain("REGISTER");
    expect(participantFiles).not.toContain("LOGON");

    expect(memberFiles).toContain("INBOX");
    expect(memberFiles).toContain("PROFILE");
    expect(memberFiles).toContain("SETTINGS");
    expect(memberFiles).toContain("LOGOFF");
    expect(memberFiles).not.toContain("APPLY");
    expect(memberFiles).not.toContain("LOGON");
    expect(memberFiles).not.toContain("REGISTER");
    expect(memberFiles).not.toContain("ADMIN");
    expect(filesFor({ level: "member", admin: true })).toContain("ADMIN");
    expect(filesFor({ level: "participant", admin: false })).not.toContain("ADMIN");
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
    for (const viewer of VIEWERS) {
      const visibleIds = new Set(visibleCommands(viewer).map((command) => command.id));
      const listed = fileGroupsFor(viewer).flatMap((group) =>
        group.items.map((item) => item.command),
      );
      for (const id of listed) {
        expect(visibleIds.has(id), `hidden command ${id} must not appear as a file`).toBe(true);
      }
    }
  });

  it("derives panel titles from the file metadata", () => {
    expect(fileTitle("APPLY")).toBe("APPLY.EXE");
    expect(fileTitle("REGISTER")).toBe("REGISTER.EXE");
    expect(fileTitle("ABOUT")).toBe("ABOUT.TXT");
    expect(fileTitle("COFFEE")).toBe("COFFEE");
  });

  it("maps routes to their section command", () => {
    expect(commandIdForPath("/forum")).toBe("FORUM");
    // /errata has no page of its own: ERRATA opens the feed with ?board=errata.
    expect(commandIdForPath("/errata")).toBeUndefined();
    expect(commandIdForPath("/readroom")).toBe("READROOM");
    expect(commandIdForPath("/projects")).toBe("PROJECTS");
    expect(commandIdForPath("/tickets")).toBe("TICKETS");
    expect(commandIdForPath("/apply")).toBe("APPLY");
    expect(commandIdForPath("/register")).toBe("REGISTER");
    expect(commandIdForPath("/login")).toBe("LOGON");
    expect(commandIdForPath("/profile")).toBe("PROFILE");
    expect(commandIdForPath("/settings")).toBe("SETTINGS");
    expect(commandIdForPath(HOME_PATH)).toBeUndefined();
    expect(commandIdForPath("/unknown")).toBeUndefined();
  });

  it("maps deep routes to their section command by segment boundary", () => {
    expect(commandIdForPath("/forum/3f2a1c")).toBe("FORUM");
    expect(commandIdForPath("/forum/3f2a1c/")).toBe("FORUM");
    expect(commandIdForPath("/forum-archive")).toBeUndefined();
    expect(commandIdForPath("/readroom/2026/05")).toBe("READROOM");
  });

  it("maps locations with a query to a single section entry", () => {
    expect(commandIdForLocation("/forum")).toBe("FORUM");
    expect(commandIdForLocation("/forum?board=general")).toBe("FORUM");
    expect(commandIdForLocation("/forum?board=errata")).toBe("ERRATA");
    expect(commandIdForLocation("/forum?board=errata&sort=new")).toBe("ERRATA");
    expect(commandIdForLocation("/forum/?board=errata")).toBe("ERRATA");
    // Threads stay on the section entry even with a board filter in the URL.
    expect(commandIdForLocation("/forum/read-first?board=errata")).toBe("FORUM");
    expect(commandIdForLocation("/readroom?board=errata")).toBe("READROOM");
    expect(commandIdForLocation(HOME_PATH)).toBeUndefined();
    expect(commandIdForLocation("/unknown")).toBeUndefined();
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

  it("joins locations with the shared query separator", () => {
    expect(joinLocation("/forum", "")).toBe("/forum");
    expect(joinLocation("/forum", "board=errata")).toBe("/forum?board=errata");
    expect(joinLocation(HOME_PATH, "")).toBe(HOME_PATH);
  });

  it("carries the logon return location and refuses anything off-shell", () => {
    expect(loginHref()).toBe(LOGIN_PATH);
    expect(loginHref("/tickets/FLAG-1")).toBe("/login?next=%2Ftickets%2FFLAG-1");
    expect(parseLoginReturn(undefined)).toBeUndefined();
    expect(parseLoginReturn("/tickets/FLAG-1")).toBe("/tickets/FLAG-1");
    expect(parseLoginReturn("/forum?board=errata")).toBe("/forum?board=errata");
    expect(parseLoginReturn("/login")).toBeUndefined();
    expect(parseLoginReturn("/login?next=%2Fprofile")).toBeUndefined();
    expect(parseLoginReturn("/apply")).toBeUndefined();
    expect(parseLoginReturn("/register")).toBeUndefined();
    expect(parseLoginReturn("/register?next=%2Fprofile")).toBeUndefined();
    expect(parseLoginReturn("https://example.com/")).toBeUndefined();
    expect(parseLoginReturn("//evil")).toBeUndefined();
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
