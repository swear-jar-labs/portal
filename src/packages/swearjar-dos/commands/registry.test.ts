import { describe, expect, it } from "vitest";
import type { Command } from "./types";
import {
  buildHelp,
  findCommands,
  nextCompletion,
  resolveCommand,
  visibleCommands,
} from "./registry";

const commands: Command[] = [
  { id: "ABOUT", description: "what is this place", doc: "ABOUT" },
  { id: "APPLY", description: "join the team", href: "/apply" },
  { id: "HELP", description: "this list" },
  { id: "SECRET", description: "hidden", hidden: true },
];

describe("visibleCommands", () => {
  it("drops hidden commands", () => {
    expect(visibleCommands(commands).map((command) => command.id)).toEqual([
      "ABOUT",
      "APPLY",
      "HELP",
    ]);
  });
});

describe("findCommands", () => {
  it("matches by prefix, case-insensitively", () => {
    expect(findCommands(commands, "app").map((command) => command.id)).toEqual(["APPLY"]);
  });

  it("returns every visible command for an empty query", () => {
    expect(findCommands(commands, "")).toHaveLength(3);
  });

  it("never exposes hidden commands", () => {
    expect(findCommands(commands, "SEC")).toEqual([]);
  });
});

describe("nextCompletion", () => {
  it("completes to the first match", () => {
    expect(nextCompletion(commands, "A")).toBe("ABOUT");
  });

  it("returns undefined when nothing matches", () => {
    expect(nextCompletion(commands, "ZZZ")).toBeUndefined();
  });
});

describe("resolveCommand", () => {
  it("resolves an exact, case-insensitive token", () => {
    expect(resolveCommand(commands, "help")?.id).toBe("HELP");
  });

  it("returns undefined for unknown input", () => {
    expect(resolveCommand(commands, "NOPE")).toBeUndefined();
  });
});

describe("buildHelp", () => {
  it("lists visible commands and the completion hint", () => {
    const help = buildHelp(commands);
    expect(help).toContain("Available commands:");
    expect(help).toContain("ABOUT");
    expect(help).toContain("APPLY");
    expect(help).not.toContain("SECRET");
    expect(help).toContain("Tab completes.");
  });
});
