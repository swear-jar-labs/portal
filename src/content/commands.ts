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

// The board feed doubles as two section entries: FORUM is the whole feed,
// ERRATA opens it pre-filtered to the errata board (no new engine or copy).
export const FORUM_PATH = "/forum";
const BOARD_QUERY_PARAM = "board";
const ERRATA_BOARD_ID = "errata";
export const ERRATA_HREF = `${FORUM_PATH}?${BOARD_QUERY_PARAM}=${ERRATA_BOARD_ID}`;

// Guest-only entries: LOGON carries the return location (?next=) so a logon
// started on a page lands back there; a direct visit falls back to FORUM.
export const LOGIN_PATH = "/login";
export const APPLY_PATH = "/apply";
const LOGIN_RETURN_PARAM = "next";

export function loginHref(returnTo?: string): `/${string}` {
  if (!returnTo) return LOGIN_PATH;
  // Narrowed by construction: LOGIN_PATH is the leading slash, the rest is
  // an encoded query string.
  return `${LOGIN_PATH}?${LOGIN_RETURN_PARAM}=${encodeURIComponent(returnTo)}` as `/${string}`;
}

// Same-origin in-app paths only: auth pages would bounce, anything else (an
// absolute URL smuggled into ?next=) never leaves the shell.
export function parseLoginReturn(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  const bare = stripQuery(value);
  if (bare === LOGIN_PATH || bare.startsWith(`${LOGIN_PATH}/`)) return undefined;
  if (bare === APPLY_PATH || bare.startsWith(`${APPLY_PATH}/`)) return undefined;
  return value;
}

// The query separator shared by location helpers: one constant, one place.
export const QUERY_SEPARATOR = "?";

export function joinLocation(pathname: string, search: string): string {
  return search === "" ? pathname : `${pathname}${QUERY_SEPARATOR}${search}`;
}

export function stripQuery(location: string): string {
  const queryIndex = location.indexOf(QUERY_SEPARATOR);
  return queryIndex === -1 ? location : location.slice(0, queryIndex);
}

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
    id: "HOW",
    description: messages.shell.registry.descriptions.HOW,
    doc: "HOW",
    file: { group: "read", name: "HOW-IT-WORKS", ext: "TXT", size: 2048 },
  },
  {
    id: "MANIFESTO",
    description: messages.shell.registry.descriptions.MANIFESTO,
    doc: "MANIFESTO",
    file: { group: "read", name: "MANIFESTO", ext: "TXT", size: 512 },
  },
  {
    id: "RULES",
    description: messages.shell.registry.descriptions.RULES,
    doc: "RULES",
    file: { group: "read", name: "RULES", ext: "TXT", size: 640 },
  },
  {
    id: "FORUM",
    description: messages.shell.registry.descriptions.FORUM,
    href: FORUM_PATH,
    file: { group: "board", name: "FORUM", ext: "EXE", size: 2048, icon: "speech" },
  },
  {
    id: "ERRATA",
    description: messages.shell.registry.descriptions.ERRATA,
    href: ERRATA_HREF,
    file: { group: "board", name: "ERRATA", ext: "EXE", size: 1024, icon: "errata" },
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
    href: APPLY_PATH,
    audience: "guest",
    file: { group: "account", name: "APPLY", ext: "EXE", size: 512, icon: "check" },
  },
  {
    id: "LOGON",
    description: messages.shell.registry.descriptions.LOGON,
    href: LOGIN_PATH,
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
  // Deep routes belong to their section: /forum/<id> keeps the cursor on
  // FORUM.EXE. The trailing slash holds the segment boundary, so
  // /forum-archive is not the board.
  return commands.find(
    (command) => command.href !== undefined && pathname.startsWith(`${command.href}/`),
  )?.id;
}

// The file highlight follows the full location, not just the pathname: FORUM
// and ERRATA share one pathname, so the query picks the entry. Any other
// board filter (or none) highlights FORUM.
export function commandIdForLocation(location: string): CommandId | undefined {
  const bare = stripQuery(location);
  const pathname = bare.length > 1 && bare.endsWith("/") ? bare.slice(0, -1) : bare;
  if (pathname === FORUM_PATH) {
    const queryStart = location.indexOf(QUERY_SEPARATOR);
    const query = queryStart === -1 ? "" : location.slice(queryStart + 1);
    if (new URLSearchParams(query).get(BOARD_QUERY_PARAM) === ERRATA_BOARD_ID) return "ERRATA";
  }
  return commandIdForPath(pathname);
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

// The surfaces read COMMUNITY first: it is what people come back for.
// ACCOUNT holds the personal entries (and the future inbox), GUIDE the
// occasional reference. The order is the same for guests and members, so
// folders never jump after a logon.
const fileGroupDefs = [
  { id: "board", ...messages.shell.files.groups.board },
  { id: "account", ...messages.shell.files.groups.account },
  { id: "read", ...messages.shell.files.groups.read },
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
    id: "board",
    label: messages.shell.menuBar.titles.board,
    entries: [
      {
        kind: "command",
        command: "FORUM",
        label: messages.shell.menuBar.labels.FORUM,
      },
      { kind: "command", command: "ERRATA", label: messages.shell.menuBar.labels.ERRATA },
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
    id: "file",
    label: messages.shell.menuBar.titles.file,
    entries: [
      { kind: "command", command: "ABOUT", label: messages.shell.menuBar.labels.ABOUT },
      { kind: "command", command: "HOW", label: messages.shell.menuBar.labels.HOW },
      { kind: "command", command: "MANIFESTO", label: messages.shell.menuBar.labels.MANIFESTO },
      { kind: "command", command: "RULES", label: messages.shell.menuBar.labels.RULES },
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
