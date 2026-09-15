import type { Command } from "./types";

export function visibleCommands(commands: readonly Command[]): Command[] {
  return commands.filter((command) => !command.hidden);
}

export function findCommands(commands: readonly Command[], input: string): Command[] {
  const query = input.trim().toUpperCase();
  const pool = visibleCommands(commands);
  if (!query) return pool;
  return pool.filter((command) => command.id.startsWith(query));
}

export function nextCompletion(commands: readonly Command[], input: string): string | undefined {
  const matches = findCommands(commands, input);
  if (matches.length === 0) return undefined;
  const query = input.trim().toUpperCase();
  const current = matches.findIndex((command) => command.id === query);
  return matches[(current + 1) % matches.length]?.id;
}

// Hidden commands stay resolvable on purpose: F5/F10 and the file manager call them directly.
export function resolveCommand<T extends Command>(
  commands: readonly T[],
  input: string,
): T | undefined {
  const query = input.trim().toUpperCase();
  return commands.find((command) => command.id === query);
}

export function buildHelp(commands: readonly Command[]): string {
  const lines = ["Available commands:"];
  for (const command of visibleCommands(commands)) {
    const dots = ".".repeat(Math.max(1, 15 - command.id.length));
    lines.push(`  ${command.id} ${dots} ${command.description}`);
  }
  lines.push("");
  lines.push("Tab completes. Try an unknown command — the jar clinks.");
  return lines.join("\n");
}
