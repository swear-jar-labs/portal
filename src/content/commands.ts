import type { Command, SpriteName } from "@swearjar/dos";
import { BOARD_QUERY_PARAM, ERRATA_BOARD_ID } from "@/lib/board";
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

// Who sees a command: guests only, a signed-in account of any level, one
// community level, or everyone. Presentation only — real authorization stays
// on the server (see TECH.md).
export const communityLevels = ["participant", "member"] as const;
export type CommunityLevel = (typeof communityLevels)[number];

export type Audience = "any" | "guest" | "account" | "admin" | CommunityLevel;

// Who is looking: nobody (guest) or a signed-in account with its level.
// The shell passes its session straight through; the account slice resolves
// the level from the mock registry (see features/account/model/actor.ts).
export type Viewer = { level: CommunityLevel; admin?: boolean } | null;

// The shell home: docs open here, so no route command matches it.
export const HOME_PATH = "/";

// The board feed doubles as two section entries: FORUM is the whole feed,
// ERRATA opens it pre-filtered to the errata board (no new engine or copy).
export const FORUM_PATH = "/forum";
export const READROOM_PATH = "/readroom";
export const TICKETS_PATH = "/tickets";
export const ERRATA_HREF = `${FORUM_PATH}?${BOARD_QUERY_PARAM}=${ERRATA_BOARD_ID}`;
// The jar's bug row lands on the tracker pre-filtered to the bug tag (the
// tracker reads ?tag=, see features/tickets/model/tickets.ts).
export const BUG_TICKETS_HREF = `${TICKETS_PATH}?tag=bug`;

// Guest-only entries: LOGON carries the return location (?next=) so a logon
// started on a page lands back there; a direct visit falls back to FORUM.
// REGISTER creates a demo Participant account on the mocks (see
// features/account/model/actor.ts); auth pages never serve as ?next= targets.
export const LOGIN_PATH = "/login";
export const APPLY_PATH = "/apply";
export const ADMIN_PATH = "/admin";
export const REGISTER_PATH = "/register";
export const INBOX_PATH = "/inbox";
export const REPORTS_PATH = "/reports";
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
  if (bare === REGISTER_PATH || bare.startsWith(`${REGISTER_PATH}/`)) return undefined;
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
  conditional?: boolean;
};

const commandDefs = [
  {
    id: "ABOUT",
    description: messages.shell.registry.descriptions.ABOUT,
    doc: "ABOUT",
    href: HOME_PATH,
    file: { group: "read", name: "ABOUT", ext: "TXT", size: 1024 },
  },
  {
    id: "HOW",
    description: messages.shell.registry.descriptions.HOW,
    doc: "HOW",
    href: "/how",
    file: { group: "read", name: "HOW-IT-WORKS", ext: "TXT", size: 2048 },
  },
  {
    id: "MANIFESTO",
    description: messages.shell.registry.descriptions.MANIFESTO,
    doc: "MANIFESTO",
    href: "/manifesto",
    file: { group: "read", name: "MANIFESTO", ext: "TXT", size: 512 },
  },
  {
    id: "RULES",
    description: messages.shell.registry.descriptions.RULES,
    doc: "RULES",
    href: "/rules",
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
    href: READROOM_PATH,
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
    href: TICKETS_PATH,
    file: { group: "board", name: "TICKETS", ext: "EXE", size: 1024, icon: "ticket" },
  },
  {
    id: "APPLY",
    description: messages.shell.registry.descriptions.APPLY,
    href: APPLY_PATH,
    audience: "participant",
    file: { group: "account", name: "APPLY", ext: "EXE", size: 512, icon: "check" },
  },
  {
    id: "ADMIN",
    description: messages.shell.registry.descriptions.ADMIN,
    href: ADMIN_PATH,
    audience: "admin",
    file: { group: "account", name: "ADMIN", ext: "EXE", size: 512, icon: "check" },
  },
  {
    id: "REGISTER",
    description: messages.shell.registry.descriptions.REGISTER,
    href: REGISTER_PATH,
    audience: "guest",
    file: { group: "account", name: "REGISTER", ext: "EXE", size: 512, icon: "person" },
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
    audience: "account",
    file: { group: "account", name: "PROFILE", ext: "EXE", size: 512, icon: "person" },
  },
  {
    id: "INBOX",
    description: messages.shell.registry.descriptions.INBOX,
    href: INBOX_PATH,
    audience: "account",
    file: { group: "account", name: "INBOX", ext: "EXE", size: 512, icon: "mail" },
  },
  {
    id: "REPORTS",
    description: messages.shell.registry.descriptions.REPORTS,
    href: REPORTS_PATH,
    audience: "account",
    conditional: true,
    file: { group: "account", name: "REPORTS", ext: "EXE", size: 512, icon: "flag" },
  },
  {
    id: "SETTINGS",
    description: messages.shell.registry.descriptions.SETTINGS,
    href: "/settings",
    audience: "account",
    file: { group: "account", name: "SETTINGS", ext: "EXE", size: 512, icon: "gear" },
  },
  {
    id: "LOGOFF",
    description: messages.shell.registry.descriptions.LOGOFF,
    audience: "account",
    file: { group: "account", name: "LOGOFF", ext: "EXE", size: 512, icon: "door" },
  },
  { id: "COFFEE", description: messages.shell.registry.descriptions.COFFEE },
  {
    id: "DOOM",
    description: messages.shell.registry.descriptions.DOOM,
    hidden: true,
  },
  {
    id: "SEARCH",
    description: messages.shell.registry.descriptions.SEARCH,
    hidden: true,
  },
  { id: "DIR", description: messages.shell.registry.descriptions.DIR },
  { id: "HELP", description: messages.shell.registry.descriptions.HELP },
  // No route: the file row renders as a button that reopens the landing
  // window. Everyone sees it; guests get the window unprompted, members
  // only on demand (they never land on home cold).
  {
    id: "WELCOME",
    description: messages.shell.registry.descriptions.WELCOME,
    file: { group: "read", name: "WELCOME", ext: "EXE", size: 512, icon: "bell" },
  },
] as const satisfies readonly AppCommandDef[];

export type CommandId = (typeof commandDefs)[number]["id"];

export type AppCommand = Omit<Command, "id" | "doc" | "href"> & {
  id: CommandId;
  doc?: DocId;
  href?: `/${string}`;
  file?: FileMeta;
  audience?: Audience;
  conditional?: boolean;
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
  "COFFEE",
  "DOOM",
  "LOGOFF",
  "SEARCH",
  "WELCOME",
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

export function isVisibleFor(
  command: Pick<AppCommand, "id" | "audience" | "conditional">,
  viewer: Viewer,
  availability: Partial<Record<CommandId, boolean>> = {},
): boolean {
  if (command.conditional && availability[command.id] !== true) return false;
  const audience = command.audience ?? "any";
  if (audience === "any") return true;
  if (viewer === null) return audience === "guest";
  if (audience === "account") return true;
  if (audience === "admin") return viewer.admin === true;
  return audience === viewer.level;
}

export function visibleCommands(
  viewer: Viewer,
  availability?: Partial<Record<CommandId, boolean>>,
): AppCommand[] {
  return commands.filter((command) => isVisibleFor(command, viewer, availability));
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

export function fileGroupsFor(
  viewer: Viewer,
  availability?: Partial<Record<CommandId, boolean>>,
): FileGroup[] {
  return fileGroupDefs.map((group) => ({
    ...group,
    items: commands.flatMap((command) => {
      const file = command.file;
      if (!file || file.group !== group.id || !isVisibleFor(command, viewer, availability))
        return [];
      return [
        { command: command.id, name: file.name, ext: file.ext, size: file.size, icon: file.icon },
      ];
    }),
  }));
}

export type MenuEntry = { command: CommandId; label: string };

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
      { command: "FORUM", label: messages.shell.menuBar.labels.FORUM },
      { command: "ERRATA", label: messages.shell.menuBar.labels.ERRATA },
      { command: "READROOM", label: messages.shell.menuBar.labels.READROOM },
      { command: "PROJECTS", label: messages.shell.menuBar.labels.PROJECTS },
      { command: "TICKETS", label: messages.shell.menuBar.labels.TICKETS },
    ],
  },
  {
    id: "account",
    label: messages.shell.menuBar.titles.account,
    entries: [
      { command: "LOGON", label: messages.shell.menuBar.labels.LOGON },
      { command: "REGISTER", label: messages.shell.menuBar.labels.REGISTER },
      { command: "APPLY", label: messages.shell.menuBar.labels.APPLY },
      { command: "ADMIN", label: messages.shell.menuBar.labels.ADMIN },
      { command: "INBOX", label: messages.shell.menuBar.labels.INBOX },
      { command: "REPORTS", label: messages.shell.menuBar.labels.REPORTS },
      { command: "PROFILE", label: messages.shell.menuBar.labels.PROFILE },
      { command: "SETTINGS", label: messages.shell.menuBar.labels.SETTINGS },
      { command: "LOGOFF", label: messages.shell.menuBar.labels.LOGOFF },
    ],
  },
  {
    id: "file",
    label: messages.shell.menuBar.titles.file,
    entries: [
      { command: "ABOUT", label: messages.shell.menuBar.labels.ABOUT },
      { command: "HOW", label: messages.shell.menuBar.labels.HOW },
      { command: "MANIFESTO", label: messages.shell.menuBar.labels.MANIFESTO },
      { command: "RULES", label: messages.shell.menuBar.labels.RULES },
      { command: "DOOM", label: messages.shell.menuBar.labels.DOOM },
    ],
  },
  {
    id: "help",
    label: messages.shell.menuBar.titles.help,
    entries: [
      { command: "HELP", label: messages.shell.menuBar.labels.HELP },
      { command: "COFFEE", label: messages.shell.menuBar.labels.COFFEE },
    ],
  },
];

export function menuDefsFor(
  viewer: Viewer,
  availability?: Partial<Record<CommandId, boolean>>,
): MenuDef[] {
  return menuDefs.map((menu) => ({
    ...menu,
    entries: menu.entries.filter((entry) => {
      const command = commandById.get(entry.command);
      return command === undefined || isVisibleFor(command, viewer, availability);
    }),
  }));
}

export const functionKeys = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"] as const;

export type FunctionKey = (typeof functionKeys)[number];

export type KeyDef = {
  key: FunctionKey;
  label: string;
  command: CommandId;
  disabled: boolean;
};

type KeyCommand = keyof typeof messages.shell.keyBar.labels & CommandId;

// Only list routes have a search field; detail routes keep an inert list beneath them.
export function isSearchablePath(pathname: string): boolean {
  return [FORUM_PATH, READROOM_PATH, TICKETS_PATH].includes(pathname);
}

export function keyDefsFor(viewer: Viewer, { searchable }: { searchable: boolean }): KeyDef[] {
  const byKey: Record<FunctionKey, KeyCommand> = {
    F1: "HELP",
    F2: "FORUM",
    F3: "READROOM",
    F4: "PROJECTS",
    F5: "TICKETS",
    F6: "INBOX",
    F7: "SEARCH",
    F8: viewer === null ? "REGISTER" : "PROFILE",
    F9: "SETTINGS",
    F10: viewer === null ? "LOGON" : "LOGOFF",
  };
  return functionKeys.map((key) => {
    const command = byKey[key];
    const definition = commandById.get(command);
    return {
      key,
      command,
      label: messages.shell.keyBar.labels[command],
      disabled:
        (command === "SEARCH" && !searchable) ||
        (definition !== undefined && !isVisibleFor(definition, viewer)),
    };
  });
}
