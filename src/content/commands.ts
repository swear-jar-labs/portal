import type { Command, SpriteName } from "@swearjar/dos";
import type { DocId } from "./docs";
import { messages } from "./messages";

export type FileExt = "TXT" | "EXE";
export type FileGroupId = "read" | "board" | "account";

export type FileMeta = {
  group: FileGroupId;
  name: string;
  ext: FileExt;
  size: number;
  // Program files carry their app icon; documents share the sheet sprite.
  icon?: SpriteName;
};

// Who sees a command: guests only, signed-in members only, or everyone.
// Presentation only — real authorization stays on the server (see TECH.md).
export type Audience = "any" | "guest" | "member";

// The shell home: docs open here, so no route command matches it.
export const HOME_PATH = "/";

type AppCommandDef = Command & {
  file?: FileMeta;
  audience?: Audience;
};

const commandDefs = [
  {
    id: "ABOUT",
    description: messages.shell.registry.descriptions.ABOUT,
    doc: "ABOUT",
    file: { group: "read", name: "ABOUT", ext: "TXT", size: 1024 },
  },
  {
    id: "MANIFESTO",
    description: messages.shell.registry.descriptions.MANIFESTO,
    doc: "MANIFESTO",
    file: { group: "read", name: "MANIFESTO", ext: "TXT", size: 512 },
  },
  {
    id: "HOW",
    description: messages.shell.registry.descriptions.HOW,
    doc: "HOW",
    file: { group: "read", name: "HOW-IT-WORKS", ext: "TXT", size: 2048 },
  },
  {
    id: "RULES",
    description: messages.shell.registry.descriptions.RULES,
    doc: "RULES",
    file: { group: "read", name: "RULES", ext: "TXT", size: 640 },
  },
  {
    id: "STATUS",
    description: messages.shell.registry.descriptions.STATUS,
    doc: "STATUS",
    file: { group: "read", name: "STATUS", ext: "TXT", size: 384 },
  },
  {
    id: "DISCUSSIONS",
    description: messages.shell.registry.descriptions.DISCUSSIONS,
    href: "/discussions",
    file: { group: "board", name: "DISCUSSIONS", ext: "EXE", size: 2048, icon: "speech" },
  },
  {
    id: "READROOM",
    description: messages.shell.registry.descriptions.READROOM,
    href: "/readroom",
    file: { group: "board", name: "READROOM", ext: "EXE", size: 3072, icon: "book" },
  },
  {
    id: "PROJECTS",
    description: messages.shell.registry.descriptions.PROJECTS,
    href: "/projects",
    file: { group: "board", name: "PROJECTS", ext: "EXE", size: 2048, icon: "box" },
  },
  {
    id: "TICKETS",
    description: messages.shell.registry.descriptions.TICKETS,
    href: "/tickets",
    file: { group: "board", name: "TICKETS", ext: "EXE", size: 1024, icon: "ticket" },
  },
  {
    id: "APPLY",
    description: messages.shell.registry.descriptions.APPLY,
    href: "/apply",
    audience: "guest",
    file: { group: "account", name: "APPLY", ext: "EXE", size: 512, icon: "check" },
  },
  {
    id: "LOGON",
    description: messages.shell.registry.descriptions.LOGON,
    href: "/login",
    audience: "guest",
    file: { group: "account", name: "LOGON", ext: "EXE", size: 512, icon: "key" },
  },
  {
    id: "PROFILE",
    description: messages.shell.registry.descriptions.PROFILE,
    href: "/profile",
    audience: "member",
    file: { group: "account", name: "PROFILE", ext: "EXE", size: 512, icon: "person" },
  },
  {
    id: "SETTINGS",
    description: messages.shell.registry.descriptions.SETTINGS,
    href: "/settings",
    audience: "member",
    file: { group: "account", name: "SETTINGS", ext: "EXE", size: 512, icon: "gear" },
  },
  {
    id: "LOGOFF",
    description: messages.shell.registry.descriptions.LOGOFF,
    audience: "member",
    file: { group: "account", name: "LOGOFF", ext: "EXE", size: 512, icon: "door" },
  },
  { id: "COFFEE", description: messages.shell.registry.descriptions.COFFEE },
  {
    id: "DOOM",
    description: messages.shell.registry.descriptions.DOOM,
    hidden: true,
  },
  {
    id: "EXIT",
    description: messages.shell.registry.descriptions.EXIT,
    hidden: true,
  },
  { id: "DIR", description: messages.shell.registry.descriptions.DIR },
  { id: "HELP", description: messages.shell.registry.descriptions.HELP },
  { id: "CLS", description: messages.shell.registry.descriptions.CLS },
] as const satisfies readonly AppCommandDef[];

export type CommandId = (typeof commandDefs)[number]["id"];

export type AppCommand = Omit<Command, "id" | "doc" | "href"> & {
  id: CommandId;
  doc?: DocId;
  href?: `/${string}`;
  file?: FileMeta;
  audience?: Audience;
};

export const commands: readonly AppCommand[] = commandDefs;

export const commandById: ReadonlyMap<CommandId, AppCommand> = new Map(
  commands.map((command) => [command.id, command]),
);

// Commands that run in place: dialogs, terminal actions or a session change.
// They own no route and no document, so the file row renders as a button.
export const actionCommandIds = [
  "HELP",
  "DIR",
  "CLS",
  "COFFEE",
  "DOOM",
  "EXIT",
  "LOGOFF",
] as const satisfies readonly CommandId[];

export type ActionCommandId = (typeof actionCommandIds)[number];

const actionCommands: ReadonlySet<CommandId> = new Set(actionCommandIds);

export function isActionCommand(id: CommandId): id is ActionCommandId {
  return actionCommands.has(id);
}

export function commandIdForPath(pathname: string): CommandId | undefined {
  const exact = commands.find((command) => command.href === pathname);
  if (exact) return exact.id;
  // Deep routes belong to their section: /discussions/<id> keeps the cursor on
  // DISCUSSIONS.EXE. The trailing slash holds the segment boundary, so
  // /discussions-archive is not the board.
  return commands.find(
    (command) => command.href !== undefined && pathname.startsWith(`${command.href}/`),
  )?.id;
}

export function isVisibleFor(command: Pick<AppCommand, "audience">, signedIn: boolean): boolean {
  const audience = command.audience ?? "any";
  return audience === "any" || audience === (signedIn ? "member" : "guest");
}

export function visibleCommands(signedIn: boolean): AppCommand[] {
  return commands.filter((command) => isVisibleFor(command, signedIn));
}

export function fileTitle(commandId: CommandId): string {
  const file = commandById.get(commandId)?.file;
  return file ? `${file.name}.${file.ext}` : commandId;
}

export type FileItem = {
  command: CommandId;
  name: string;
  ext: FileExt;
  size: number;
  icon?: SpriteName;
};

export type FileGroup = {
  id: FileGroupId;
  label: string;
  short: string;
  items: FileItem[];
};

const fileGroupDefs = [
  { id: "read", ...messages.shell.files.groups.read },
  { id: "board", ...messages.shell.files.groups.board },
  { id: "account", ...messages.shell.files.groups.account },
] as const satisfies readonly { id: FileGroupId; label: string; short: string }[];

export function fileGroupsFor(signedIn: boolean): FileGroup[] {
  return fileGroupDefs.map((group) => ({
    ...group,
    items: commands.flatMap((command) => {
      const file = command.file;
      if (!file || file.group !== group.id || !isVisibleFor(command, signedIn)) return [];
      return [
        { command: command.id, name: file.name, ext: file.ext, size: file.size, icon: file.icon },
      ];
    }),
  }));
}

export type MenuEntry =
  { kind: "separator" } | { kind: "command"; command: CommandId; label: string };

export type MenuDef = {
  id: string;
  label: string;
  entries: MenuEntry[];
};

const menuDefs: MenuDef[] = [
  {
    id: "file",
    label: messages.shell.menuBar.titles.file,
    entries: [
      { kind: "command", command: "ABOUT", label: messages.shell.menuBar.labels.ABOUT },
      { kind: "command", command: "MANIFESTO", label: messages.shell.menuBar.labels.MANIFESTO },
      { kind: "command", command: "HOW", label: messages.shell.menuBar.labels.HOW },
      { kind: "command", command: "RULES", label: messages.shell.menuBar.labels.RULES },
      { kind: "separator" },
      { kind: "command", command: "APPLY", label: messages.shell.menuBar.labels.APPLY },
      { kind: "command", command: "LOGON", label: messages.shell.menuBar.labels.LOGON },
      { kind: "command", command: "PROFILE", label: messages.shell.menuBar.labels.PROFILE },
      { kind: "command", command: "SETTINGS", label: messages.shell.menuBar.labels.SETTINGS },
      { kind: "command", command: "LOGOFF", label: messages.shell.menuBar.labels.LOGOFF },
    ],
  },
  {
    id: "board",
    label: messages.shell.menuBar.titles.board,
    entries: [
      {
        kind: "command",
        command: "DISCUSSIONS",
        label: messages.shell.menuBar.labels.DISCUSSIONS,
      },
      { kind: "command", command: "READROOM", label: messages.shell.menuBar.labels.READROOM },
      { kind: "command", command: "PROJECTS", label: messages.shell.menuBar.labels.PROJECTS },
      { kind: "command", command: "TICKETS", label: messages.shell.menuBar.labels.TICKETS },
    ],
  },
  {
    id: "account",
    label: messages.shell.menuBar.titles.account,
    entries: [
      { kind: "command", command: "LOGON", label: messages.shell.menuBar.labels.LOGON },
      { kind: "command", command: "APPLY", label: messages.shell.menuBar.labels.APPLY },
      { kind: "command", command: "PROFILE", label: messages.shell.menuBar.labels.PROFILE },
      { kind: "command", command: "SETTINGS", label: messages.shell.menuBar.labels.SETTINGS },
      { kind: "command", command: "LOGOFF", label: messages.shell.menuBar.labels.LOGOFF },
    ],
  },
  {
    id: "help",
    label: messages.shell.menuBar.titles.help,
    entries: [
      { kind: "command", command: "HELP", label: messages.shell.menuBar.labels.HELP },
      { kind: "separator" },
      { kind: "command", command: "COFFEE", label: messages.shell.menuBar.labels.COFFEE },
    ],
  },
];

function trimSeparators(entries: MenuEntry[]): MenuEntry[] {
  const result: MenuEntry[] = [];
  for (const entry of entries) {
    const last = result.at(-1);
    if (entry.kind === "separator" && (last === undefined || last.kind === "separator")) continue;
    result.push(entry);
  }
  while (result.at(-1)?.kind === "separator") result.pop();
  return result;
}

export function menuDefsFor(signedIn: boolean): MenuDef[] {
  return menuDefs.map((menu) => ({
    ...menu,
    entries: trimSeparators(
      menu.entries.filter((entry) => {
        if (entry.kind === "separator") return true;
        const command = commandById.get(entry.command);
        return command === undefined || isVisibleFor(command, signedIn);
      }),
    ),
  }));
}

export type KeyDef = {
  key: string;
  label: string;
  command: CommandId;
};

const keyDefs: KeyDef[] = [
  { key: "F1", label: messages.shell.keyBar.labels.HELP, command: "HELP" },
  { key: "F2", label: messages.shell.keyBar.labels.ABOUT, command: "ABOUT" },
  { key: "F3", label: messages.shell.keyBar.labels.MANIFESTO, command: "MANIFESTO" },
  { key: "F4", label: messages.shell.keyBar.labels.RULES, command: "RULES" },
  { key: "F5", label: messages.shell.keyBar.labels.DOOM, command: "DOOM" },
  { key: "F6", label: messages.shell.keyBar.labels.PROJECTS, command: "PROJECTS" },
  { key: "F7", label: messages.shell.keyBar.labels.STATUS, command: "STATUS" },
  { key: "F8", label: messages.shell.keyBar.labels.APPLY, command: "APPLY" },
  { key: "F9", label: messages.shell.keyBar.labels.LOGON, command: "LOGON" },
  { key: "F8", label: messages.shell.keyBar.labels.PROFILE, command: "PROFILE" },
  { key: "F9", label: messages.shell.keyBar.labels.LOGOFF, command: "LOGOFF" },
  { key: "F10", label: messages.shell.keyBar.labels.EXIT, command: "EXIT" },
];

export function keyDefsFor(signedIn: boolean): KeyDef[] {
  return keyDefs.filter((def) => {
    const command = commandById.get(def.command);
    return command === undefined || isVisibleFor(command, signedIn);
  });
}
