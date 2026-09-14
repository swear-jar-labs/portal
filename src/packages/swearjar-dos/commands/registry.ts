import type { Command } from "./types";

export function visibleCommands(commands: Command[]): Command[] {
  return commands.filter((command) => !command.hidden);
}

export function findCommands(commands: Command[], input: string): Command[] {
  const query = input.trim().toUpperCase();
  const pool = visibleCommands(commands);
  if (!query) return pool;
  return pool.filter((command) => command.id.startsWith(query));
}

export function nextCompletion(commands: Command[], input: string): string | undefined {
  const matches = findCommands(commands, input);
  if (matches.length === 0) return undefined;
  const query = input.trim().toUpperCase();
  const current = matches.findIndex((command) => command.id === query);
  return matches[(current + 1) % matches.length].id;
}

export function resolveCommand(commands: Command[], input: string): Command | undefined {
  const query = input.trim().toUpperCase();
  return commands.find((command) => command.id === query);
}

export function buildHelp(commands: Command[]): string {
  const lines = ["Available commands:"];
  for (const command of visibleCommands(commands)) {
    const dots = ".".repeat(Math.max(1, 15 - command.id.length));
    lines.push(`  ${command.id} ${dots} ${command.description}`);
  }
  lines.push("");
  lines.push("Tab completes. Try an unknown command — the jar clinks.");
  return lines.join("\n");
}
