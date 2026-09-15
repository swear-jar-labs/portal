import type { Command } from "@swearjar/dos";
import type { DocId } from "./landing";

export type FileExt = "TXT" | "EXE";
export type FileGroupId = "read" | "board" | "account";

export type FileMeta = {
  group: FileGroupId;
  name: string;
  ext: FileExt;
  size: number;
};

type AppCommandDef = Command & { file?: FileMeta };

const commandDefs = [
  {
    id: "ABOUT",
    description: "what is this place",
    doc: "ABOUT",
    file: { group: "read", name: "ABOUT", ext: "TXT", size: 1024 },
  },
  {
    id: "MANIFESTO",
    description: "what we believe",
    doc: "MANIFESTO",
    file: { group: "read", name: "MANIFESTO", ext: "TXT", size: 512 },
  },
  {
    id: "HOW",
    description: "how the team works",
    doc: "HOW",
    file: { group: "read", name: "HOW-IT-WORKS", ext: "TXT", size: 2048 },
  },
  {
    id: "RULES",
    description: "the rules",
    doc: "RULES",
    file: { group: "read", name: "RULES", ext: "TXT", size: 640 },
  },
  {
    id: "STATUS",
    description: "who we need now",
    doc: "STATUS",
    file: { group: "read", name: "STATUS", ext: "TXT", size: 384 },
  },
  {
    id: "DISCUSSIONS",
    description: "open the board",
    href: "/discussions",
    file: { group: "board", name: "DISCUSSIONS", ext: "EXE", size: 2048 },
  },
  {
    id: "ERRATA",
    description: "the jar, written down",
    href: "/errata",
    file: { group: "board", name: "ERRATA", ext: "EXE", size: 4096 },
  },
  {
    id: "READROOM",
    description: "the reading cycle",
    href: "/readroom",
    file: { group: "board", name: "READROOM", ext: "EXE", size: 3072 },
  },
  {
    id: "PRODUCTS",
    description: "what we build",
    href: "/products",
    file: { group: "board", name: "PRODUCTS", ext: "EXE", size: 2048 },
  },
  {
    id: "TICKETS",
    description: "the work queue",
    href: "/tickets",
    file: { group: "board", name: "TICKETS", ext: "EXE", size: 1024 },
  },
  {
    id: "APPLY",
    description: "join the team",
    href: "/apply",
    file: { group: "account", name: "APPLY", ext: "EXE", size: 512 },
  },
  {
    id: "LOGON",
    description: "member login",
    href: "/login",
    file: { group: "account", name: "LOGON", ext: "EXE", size: 512 },
  },
  {
    id: "SETTINGS",
    description: "tune the terminal",
    href: "/settings",
    file: { group: "account", name: "SETTINGS", ext: "EXE", size: 512 },
  },
  { id: "COFFEE", description: "brew something" },
  { id: "DOOM", description: "the only OS without DOOM", hidden: true },
  { id: "EXIT", description: "end the session", hidden: true },
  { id: "DIR", description: "list files" },
  { id: "HELP", description: "this list" },
  { id: "CLS", description: "clear the screen" },
] as const satisfies readonly AppCommandDef[];

export type CommandId = (typeof commandDefs)[number]["id"];

export type AppCommand = Omit<Command, "id" | "doc" | "href"> & {
  id: CommandId;
  doc?: DocId;
  href?: `/${string}`;
  file?: FileMeta;
};

export const commands: readonly AppCommand[] = commandDefs;

export const commandById: ReadonlyMap<CommandId, AppCommand> = new Map(
  commands.map((command) => [command.id, command]),
);

export type FileItem = {
  command: CommandId;
  name: string;
  ext: FileExt;
  size: number;
};

export type FileGroup = {
  id: FileGroupId;
  label: string;
  short: string;
  items: FileItem[];
};

const fileGroupDefs = [
  { id: "read", label: "── READ ──────────────", short: "READ" },
  { id: "board", label: "── BOARD ─────────────", short: "BOARD" },
  { id: "account", label: "── ACCOUNT ───────────", short: "ACCOUNT" },
] as const satisfies readonly { id: FileGroupId; label: string; short: string }[];

export const fileGroups: FileGroup[] = fileGroupDefs.map((group) => ({
  ...group,
  items: commands.flatMap((command) => {
    const file = command.file;
    if (!file || file.group !== group.id) return [];
    return [{ command: command.id, name: file.name, ext: file.ext, size: file.size }];
  }),
}));

export type MenuEntry =
  { kind: "separator" } | { kind: "command"; command: CommandId; label: string };

export type MenuDef = {
  id: string;
  label: string;
  entries: MenuEntry[];
};

export const menuDefs: MenuDef[] = [
  {
    id: "file",
    label: "File",
    entries: [
      { kind: "command", command: "ABOUT", label: "About..." },
      { kind: "command", command: "MANIFESTO", label: "Manifesto" },
      { kind: "command", command: "HOW", label: "How it works" },
      { kind: "command", command: "RULES", label: "Rules" },
      { kind: "separator" },
      { kind: "command", command: "APPLY", label: "Apply..." },
      { kind: "command", command: "LOGON", label: "Logon..." },
    ],
  },
  {
    id: "board",
    label: "Board",
    entries: [
      { kind: "command", command: "DISCUSSIONS", label: "Discussions" },
      { kind: "command", command: "ERRATA", label: "Errata" },
      { kind: "command", command: "READROOM", label: "Readroom" },
      { kind: "command", command: "PRODUCTS", label: "Products" },
      { kind: "command", command: "TICKETS", label: "Tickets" },
    ],
  },
  {
    id: "account",
    label: "Account",
    entries: [
      { kind: "command", command: "LOGON", label: "Logon..." },
      { kind: "command", command: "APPLY", label: "Apply..." },
    ],
  },
  {
    id: "help",
    label: "Help",
    entries: [
      { kind: "command", command: "HELP", label: "Commands..." },
      { kind: "separator" },
      { kind: "command", command: "COFFEE", label: "Coffee" },
    ],
  },
];

export type KeyDef = {
  key: string;
  label: string;
  command: CommandId;
};

export const keyDefs: KeyDef[] = [
  { key: "F1", label: "Help", command: "HELP" },
  { key: "F2", label: "About", command: "ABOUT" },
  { key: "F3", label: "Manifesto", command: "MANIFESTO" },
  { key: "F4", label: "Rules", command: "RULES" },
  { key: "F5", label: "Doom", command: "DOOM" },
  { key: "F6", label: "Products", command: "PRODUCTS" },
  { key: "F7", label: "Status", command: "STATUS" },
  { key: "F8", label: "Apply", command: "APPLY" },
  { key: "F9", label: "Logon", command: "LOGON" },
  { key: "F10", label: "Exit", command: "EXIT" },
];
